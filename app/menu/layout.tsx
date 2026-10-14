import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "GustoBox | Bayrampaşa'da İyi Lezzet",
  description: "GustoBox Kartaltepe menüsünü keşfet: taze sandviç, tost ve waffle.",
};

export default function MenuLayout({ children }: { children: ReactNode }) {
  return children;
}