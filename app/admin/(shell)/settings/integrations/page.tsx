import { getSite } from "@/lib/siteStore";
import IntegrationsForm from "@/app/admin/_components/IntegrationsForm";

export const metadata = { title: "اتصال‌ها" };

export default async function AdminIntegrationsPage() {
  return <IntegrationsForm initial={(await getSite()).settings.integrations} />;
}
