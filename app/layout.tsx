import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Pokemon Profit Intel AU",
  description: "Australia-first Pokemon TCG buying intelligence and resale strategy dashboard."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
