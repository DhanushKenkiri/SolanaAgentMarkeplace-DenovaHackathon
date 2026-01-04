import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Gallery - Layer2Agents",
  description: "Browse and hire professional AI agents on Solana",
};

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout removes the navbar for the catalog page
  return <>{children}</>;
}
