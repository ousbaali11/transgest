"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Point = { label: string; ca: number; dep: number };

function fmtDH(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DH";
}

export default function RevenueChart({ data }: { data: Point[] }) {
  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v: number) => fmtDH(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Bar dataKey="ca" fill="var(--primary)" radius={[3, 3, 0, 0]} name="CA" />
          <Bar dataKey="dep" fill="var(--accent)" radius={[3, 3, 0, 0]} name="Dépenses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
