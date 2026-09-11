import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";
import { assertOrgActive } from "@/lib/require-active-org";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { getPlatformSettings } from "@/lib/settings";
import { tripConcernsSession } from "@/lib/org-refs";
import { getLocale } from "@/lib/get-locale";
import { t } from "@/lib/i18n";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();
    await assertOrgActive(session);
    const locale = getLocale();

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { client: true, trip: { include: { truck: true } } },
    });
    if (!invoice || invoice.organizationId !== session.organizationId) {
      throw new HttpError(404, t(locale, "invoice_not_found_error"));
    }
    // Un chauffeur ne peut télécharger que les factures des voyages qui le
    // concernent — pas celles de ses collègues.
    if (!tripConcernsSession(session, invoice.trip)) {
      throw new HttpError(404, t(locale, "invoice_not_found_error"));
    }

    const settings = await getPlatformSettings();

    const buffer = await renderInvoicePdf({
      appName: settings.appName,
      number: invoice.number,
      date: invoice.date,
      status: invoice.status,
      client: invoice.client ? { name: invoice.client.name, phone: invoice.client.phone, email: invoice.client.email, address: invoice.client.address } : null,
      depart: invoice.trip.depart,
      arrivee: invoice.trip.arrivee,
      marchandise: invoice.trip.marchandise,
      quantite: invoice.trip.quantite,
      unite: invoice.trip.unite,
      truckImmat: invoice.trip.truck.immat,
      prixTransport: Number(invoice.trip.prixTransport),
      avance: Number(invoice.trip.avance),
    }, locale);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${t(locale, "pdf_filename")}-${invoice.number}.pdf"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
