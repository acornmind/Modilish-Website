import { redirect } from "next/navigation";
import AdminShell from "../AdminShell";
import { currentUser } from "@/lib/auth";
import { getNavBadges } from "@/lib/adminData";
import { getNotifications } from "@/lib/orderStore";

// Every admin screen sits behind the sign-in (§2.2). Badges and the bell's
// list are computed here from the live stores on every navigation.
export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const notifications = getNotifications();
  return (
    <AdminShell
      badges={getNavBadges()}
      notifications={{ items: notifications.items.slice(0, 8), unread: notifications.unread }}
      user={{ name: user.name, role: user.role.name, sessions: user.sessions }}
    >
      {children}
    </AdminShell>
  );
}
