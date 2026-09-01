import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgSession, handleApiError, HttpError } from "@/lib/guards";
import { renderInvoicePdf } from "@/lib/invoice-pdf";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireOrgSession();

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: { client: true, trip: { include: { truck: true } } },
    });
    if (!invoice || invoice.organizationId !== session.organizationId) {
      throw new HttpError(404, "Facture introuvable");
    }

    const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });

    const buffer = await renderInvoicePdf({
      appName: settings?.appName || "TransGest",
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
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="facture-${invoice.number}.pdf"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
