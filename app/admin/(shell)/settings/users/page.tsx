import { getSite } from "@/lib/siteStore";
import UsersRoles from "@/app/admin/_components/UsersRoles";

export const metadata = { title: "کاربران و دسترسی‌ها" };

export default function AdminUsersPage() {
  const { users, roles, apiKeys } = getSite().settings;
  return <UsersRoles users={users} roles={roles} apiKeys={apiKeys} />;
}
