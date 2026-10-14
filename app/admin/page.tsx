import type { Metadata } from "next";
import MenuDashboard from "../menu-dashboard";

export const metadata: Metadata = {
  title: "GustoBox | Menü Yönetimi",
  description: "GustoBox ürün yönetim paneli.",
};

export default function AdminPage() {
  return <MenuDashboard />;
}