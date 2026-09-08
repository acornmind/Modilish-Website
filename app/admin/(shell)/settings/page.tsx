import { getSite } from "@/lib/siteStore";
import SettingsTabs from "@/app/admin/_components/SettingsTabs";

export const metadata = { title: "تنظیمات" };

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const allowed = ["store", "delivery", "payment", "catalogue", "seo", "strings", "backup", "links"] as const;
  const initial = allowed.find((t) => t === tab);
  return <SettingsTabs settings={getSite().settings} initialTab={initial} />;
}
