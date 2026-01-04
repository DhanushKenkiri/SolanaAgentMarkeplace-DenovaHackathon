import { AGENT_REGISTRY } from "@/lib/agents-registry";
import AgentDetailClient from "./client";

// Disable fallback - only pre-rendered pages will be served
export const dynamicParams = false;

// Generate static params for all agent addresses (runs at build time)
export function generateStaticParams() {
  return AGENT_REGISTRY.map((agent) => ({
    id: agent.address,
  }));
}

// Server component that passes params to client component
export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentDetailClient agentId={id} />;
}
