import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "GustoBox | Kadıköy'de İyi Lezzet",
  description: "GustoBox Kadıköy menüsünü keşfet: taze sandviçler, atıştırmalıklar ve içecekler.",
};

export default function MenuLayout({ children }: { children: ReactNode }) {
  return children;
}