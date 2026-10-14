import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "GustoBox | QR Menü",
  description: "GustoBox Kadıköy sandviç ve içecek menüsü.",
};

export default function MenuLayout({ children }: { children: ReactNode }) {
  return children;
}