import { getSegments, getSmsLog, smsStats } from "@/lib/orderStore";
import { getSite } from "@/lib/siteStore";
import { integrationHealth } from "@/lib/siteContent";
import SmsPanel from "@/app/admin/_components/SmsPanel";

export const metadata = { title: "پیامک" };

export default async function AdminSmsPage({ searchParams }: { searchParams: Promise<{ tab?: string; to?: string; segment?: string; text?: string }> }) {
  const { tab, to, segment, text } = await searchParams;
  const site = getSite();
  const initial = (["auto", "mass", "single", "log", "settings"] as const).find((t) => t === tab);
  return (
    <SmsPanel
      sms={site.settings.sms}
      log={getSmsLog()}
      stats={smsStats()}
      segments={getSegments()}
      connected={integrationHealth(site.settings).sms}
      initialTab={initial}
      initialTo={to}
      initialSegment={segment}
      initialText={text}
    />
  );
}
