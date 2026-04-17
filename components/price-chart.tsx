"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatAud } from "@/lib/utils";

export function PriceChart({
  data
}: {
  data: {
    date: string;
    price: number;
  }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatAud(value)} />
          <Line type="monotone" dataKey="price" stroke="#174c44" strokeWidth={3} dot={{ fill: "#d6a548", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
