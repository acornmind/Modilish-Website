import { getSite } from "@/lib/siteStore";
import UsersRoles from "@/app/admin/_components/UsersRoles";

export const metadata = { title: "کاربران و دسترسی‌ها" };

export default async function AdminUsersPage() {
  const { users, roles, apiKeys } = (await getSite()).settings;
  return <UsersRoles users={users} roles={roles} apiKeys={apiKeys} />;
}
