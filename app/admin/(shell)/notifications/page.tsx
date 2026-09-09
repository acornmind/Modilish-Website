import { getNotifications } from "@/lib/orderStore";
import { getSite } from "@/lib/siteStore";
import { integrationHealth } from "@/lib/siteContent";
import NotificationsPanel from "@/app/admin/_components/NotificationsPanel";

export const metadata = { title: "اعلان‌ها" };

// §4.15 — the bell's full list plus per-event channel preferences.
export default async function AdminNotificationsPage() {
  const [{ items, unread }, { settings }] = await Promise.all([getNotifications(), getSite()]);
  return <NotificationsPanel items={items} unread={unread} prefs={settings.notificationPrefs} smsConnected={integrationHealth(settings).sms} />;
}
