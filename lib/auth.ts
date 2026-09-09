// Admin sign-in — docs/admin-spec.md §2.2: phone + SMS one-time code, only
// for phones on the users list (Settings → کاربران و دسترسی‌ها). Sessions are
// httpOnly cookies for 30 days, backed by the admin_sessions / admin_otp
// tables. Server-only (next/headers).
import { cookies, headers } from "next/headers";
import { getSite, saveSettings } from "./siteStore";
import { integrationHealth, type AdminUser, type Role } from "./siteContent";
import { logSms } from "./orderStore";
import { check, supabaseAdmin } from "./supabase/server";

export const COOKIE = "modilish_admin";
const SESSION_DAYS = 30;

type SessionRow = { token: string; phone: string; created_at: string; expires_at: string; last_seen_at: string; user_agent: string | null };
type OtpRow = { phone: string; code: string; expires_at: string; attempts: number; sent_at: string[] | null };

/** "Phones are stored as 11-digit 09…; input accepts Persian/Latin digits, +98…, 0098… and the 10-digit form." */
export function normalizePhone(input: string) {
  let d = input
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/\D/g, "");
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("9")) d = "0" + d;
  return /^09\d{9}$/.test(d) ? d : "";
}

export async function findUser(phone: string): Promise<AdminUser | undefined> {
  return (await getSite()).settings.users.find((u) => u.active && normalizePhone(u.phone) === phone);
}

const randomCode = () => String(Math.floor(100000 + Math.random() * 900000));

/** Sends (or, without Kavenegar, reveals) a 6-digit code. Rate limits per §2.2. */
export async function requestOtp(rawPhone: string): Promise<{ ok: true; demoCode?: string; resendIn: number } | { ok: false; message: string }> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, message: "شماره موبایل معتبر نیست." };
  if (!(await findUser(phone))) return { ok: false, message: "این شماره دسترسی به مدیریت ندارد. از مالک بخواهید شما را دعوت کند." };

  const db = supabaseAdmin();
  const now = Date.now();
  const existing = check<OtpRow>(await db.from("admin_otp").select("*").eq("phone", phone).maybeSingle());
  const recent = (existing?.sent_at ?? []).filter((t) => now - new Date(t).getTime() < 3600000);
  if (recent.length >= 3) return { ok: false, message: "حداکثر ۳ کد در ساعت — کمی بعد دوباره تلاش کنید." };
  if (existing && existing.attempts >= 5 && now - new Date(existing.expires_at).getTime() < 10 * 60000)
    return { ok: false, message: "به‌خاطر ۵ تلاش اشتباه، این شماره ۱۵ دقیقه قفل است." };

  const code = randomCode();
  check(
    await db.from("admin_otp").upsert({
      phone,
      code,
      expires_at: new Date(now + 5 * 60000).toISOString(),
      attempts: 0,
      sent_at: [...recent, new Date(now).toISOString()],
    }),
  );

  const site = await getSite();
  const template = site.settings.sms.templates.find((t) => t.event === "otp");
  const entry = await logSms(phone, undefined, "otp", "otp", (template?.text ?? "کد ورود شما به مدیلیش: {code}").replace("{code}", code));
  // no Kavenegar → the code can't reach a phone, so the sign-in screen shows it
  const connected = integrationHealth(site.settings).sms && entry.status !== "simulated";
  return { ok: true, demoCode: connected ? undefined : code, resendIn: 120 };
}

export async function verifyOtp(rawPhone: string, code: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const phone = normalizePhone(rawPhone);
  const db = supabaseAdmin();
  const otp = check<OtpRow>(await db.from("admin_otp").select("*").eq("phone", phone).maybeSingle());
  if (!otp) return { ok: false, message: "ابتدا کد را درخواست کنید." };
  if (new Date(otp.expires_at).getTime() < Date.now()) return { ok: false, message: "کد منقضی شده — دوباره درخواست کنید." };
  if (otp.attempts >= 5) return { ok: false, message: "۵ تلاش اشتباه — ۱۵ دقیقه صبر کنید." };
  const clean = code.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/\D/g, "");
  if (clean !== otp.code) {
    check(await db.from("admin_otp").update({ attempts: otp.attempts + 1 }).eq("phone", phone));
    return { ok: false, message: `کد اشتباه است (${(5 - otp.attempts - 1).toLocaleString("fa-IR")} تلاش دیگر).` };
  }
  check(await db.from("admin_otp").delete().eq("phone", phone));

  const token = Array.from({ length: 48 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
  const now = new Date();
  const h = await headers();
  check(
    await db.from("admin_sessions").insert({
      token,
      phone,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + SESSION_DAYS * 86400000).toISOString(),
      last_seen_at: now.toISOString(),
      user_agent: h.get("user-agent")?.slice(0, 120) ?? "",
    }),
  );
  // expired sessions are dead weight — sweep them while we're here
  check(await db.from("admin_sessions").delete().lt("expires_at", now.toISOString()));
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400 });

  // last sign-in on the users list
  const site = await getSite();
  const user = site.settings.users.find((u) => normalizePhone(u.phone) === phone);
  if (user) {
    user.lastLogin = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(now);
    await saveSettings("users", site.settings.users);
  }
  return { ok: true };
}

export type CurrentUser = { name: string; phone: string; role: Role; sessions: number };

/** The signed-in admin, or null. */
export async function currentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = supabaseAdmin();
  const s = check<SessionRow>(await db.from("admin_sessions").select("*").eq("token", token).maybeSingle());
  if (!s || new Date(s.expires_at).getTime() < Date.now()) return null;
  const user = await findUser(s.phone);
  if (!user) return null;
  const { roles } = (await getSite()).settings;
  const role = roles.find((r) => r.id === user.role) ?? roles[0];
  const countRes = await db.from("admin_sessions").select("token", { count: "exact", head: true }).eq("phone", s.phone).gt("expires_at", new Date().toISOString());
  if (countRes.error) throw new Error(countRes.error.message);
  return { name: user.name, phone: user.phone, role, sessions: countRes.count ?? 1 };
}

export async function logout(allDevices = false) {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const db = supabaseAdmin();
    if (allDevices) {
      const me = check<SessionRow>(await db.from("admin_sessions").select("phone").eq("token", token).maybeSingle());
      if (me) check(await db.from("admin_sessions").delete().eq("phone", me.phone));
    } else {
      check(await db.from("admin_sessions").delete().eq("token", token));
    }
  }
  store.delete(COOKIE);
}

/** Ends every session of a phone — used when a user is deactivated. */
export async function endSessionsFor(phone: string) {
  const p = normalizePhone(phone);
  check(await supabaseAdmin().from("admin_sessions").delete().eq("phone", p));
}
