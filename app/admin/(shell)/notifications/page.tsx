import { getNotifications } from "@/lib/orderStore";
import { getSite } from "@/lib/siteStore";
import { integrationHealth } from "@/lib/siteContent";
import NotificationsPanel from "@/app/admin/_components/NotificationsPanel";

export const metadata = { title: "اعلان‌ها" };

// §4.15 — the bell's full list plus per-event channel preferences.
export default function AdminNotificationsPage() {
  const { items, unread } = getNotifications();
  const { settings } = getSite();
  return <NotificationsPanel items={items} unread={unread} prefs={settings.notificationPrefs} smsConnected={integrationHealth(settings).sms} />;
}
