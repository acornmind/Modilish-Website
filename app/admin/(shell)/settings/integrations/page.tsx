import { getSite } from "@/lib/siteStore";
import IntegrationsForm from "@/app/admin/_components/IntegrationsForm";

export const metadata = { title: "اتصال‌ها" };

export default function AdminIntegrationsPage() {
  return <IntegrationsForm initial={getSite().settings.integrations} />;
}
