import Image from "next/image";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getSite } from "@/lib/siteStore";
import { integrationHealth } from "@/lib/siteContent";
import LoginForm from "./LoginForm";

// Sign-in — docs/admin-spec.md §2.2: phone + SMS one-time code for phones on
// the users list. Without Kavenegar the code is shown on screen (demo mode).
export const metadata = { title: "ورود" };

export default async function AdminLoginPage() {
  if (await currentUser()) redirect("/admin");
  const { settings } = await getSite();
  const smsConnected = integrationHealth(settings).sms;
  const owner = settings.users.find((u) => u.role === "owner" && u.active);

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f6f4f8] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)]">
        <Image src="/img/mobile-logo.png" alt="مدیلیش" width={100} height={42} className="mx-auto mb-6 h-9 w-auto" />
        <p className="mb-1 text-center text-sm font-bold">ورود به مدیریت مدیلیش</p>
        <p className="mb-5 text-center text-[11px] leading-5 text-modi-gray-900">
          فقط شماره‌های فهرست «کاربران و دسترسی‌ها» می‌توانند وارد شوند.
        </p>
        <LoginForm smsConnected={smsConnected} ownerHint={owner?.phone ?? ""} />
      </div>
    </div>
  );
}
