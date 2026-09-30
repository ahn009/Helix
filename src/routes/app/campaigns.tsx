import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/campaigns")({ component: CampaignsLayout });

function CampaignsLayout() {
  return <Outlet />;
}
