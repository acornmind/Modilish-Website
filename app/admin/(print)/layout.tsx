import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

// Print sheets (§4.2.4): signed-in only, no sidebar/topbar.
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  if (!(await currentUser())) redirect("/admin/login");
  return <>{children}</>;
}
