import { AGENT_REGISTRY } from "@/lib/agents-registry";
import CatalogAgentDetailClient from "./client";

// Disable fallback - only pre-rendered pages will be served
export const dynamicParams = false;

// Generate static params for all agents using address
export async function generateStaticParams() {
  return AGENT_REGISTRY.map((agent) => ({
    agentId: agent.address,
  }));
}

interface PageProps {
  params: Promise<{ agentId: string }>;
}

export default async function CatalogAgentDetailPage({ params }: PageProps) {
  const { agentId } = await params;
  return <CatalogAgentDetailClient agentId={agentId} />;
}
