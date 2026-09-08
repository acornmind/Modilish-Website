// Admin sign-in — docs/admin-spec.md §2.2: phone + SMS one-time code, only
// for phones on the users list (Settings → کاربران و دسترسی‌ها). Sessions are
// httpOnly cookies for 30 days. Server-only (fs + next/headers).
import fs from "node:fs";
import path from "node:path";
import { cookies, headers } from "next/headers";
import { getSite } from "./siteStore";
import { integrationHealth, type AdminUser, type Role } from "./siteContent";
import { logSms } from "./orderStore";

const DATA = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA, "sessions.json");
const OTP_FILE = path.join(DATA, "otp.json");
export const COOKIE = "modilish_admin";
const SESSION_DAYS = 30;

type Session = { token: string; phone: string; createdAt: string; expiresAt: string; lastSeenAt: string; userAgent: string };
type Otp = { phone: string; code: string; expiresAt: string; attempts: number; sentAt: string[] };

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}
function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

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

export function findUser(phone: string): AdminUser | undefined {
  return getSite().settings.users.find((u) => u.active && normalizePhone(u.phone) === phone);
}

const randomCode = () => String(Math.floor(100000 + Math.random() * 900000));

/** Sends (or, without Kavenegar, reveals) a 6-digit code. Rate limits per §2.2. */
export function requestOtp(rawPhone: string): { ok: true; demoCode?: string; resendIn: number } | { ok: false; message: string } {
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, message: "شماره موبایل معتبر نیست." };
  if (!findUser(phone)) return { ok: false, message: "این شماره دسترسی به مدیریت ندارد. از مالک بخواهید شما را دعوت کند." };

  const all = readJson<Otp[]>(OTP_FILE, []);
  const now = Date.now();
  const existing = all.find((o) => o.phone === phone);
  const recent = (existing?.sentAt ?? []).filter((t) => now - new Date(t).getTime() < 3600000);
  if (recent.length >= 3) return { ok: false, message: "حداکثر ۳ کد در ساعت — کمی بعد دوباره تلاش کنید." };
  if (existing && existing.attempts >= 5 && now - new Date(existing.expiresAt).getTime() < 10 * 60000)
    return { ok: false, message: "به‌خاطر ۵ تلاش اشتباه، این شماره ۱۵ دقیقه قفل است." };

  const code = randomCode();
  const otp: Otp = { phone, code, expiresAt: new Date(now + 5 * 60000).toISOString(), attempts: 0, sentAt: [...recent, new Date(now).toISOString()] };
  writeJson(OTP_FILE, [...all.filter((o) => o.phone !== phone), otp]);

  const site = getSite();
  const template = site.settings.sms.templates.find((t) => t.event === "otp");
  const entry = logSms(phone, undefined, "otp", "otp", (template?.text ?? "کد ورود شما به مدیلیش: {code}").replace("{code}", code));
  // no Kavenegar → the code can't reach a phone, so the sign-in screen shows it
  const connected = integrationHealth(site.settings).sms && entry.status !== "simulated";
  return { ok: true, demoCode: connected ? undefined : code, resendIn: 120 };
}

export async function verifyOtp(rawPhone: string, code: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const phone = normalizePhone(rawPhone);
  const all = readJson<Otp[]>(OTP_FILE, []);
  const otp = all.find((o) => o.phone === phone);
  if (!otp) return { ok: false, message: "ابتدا کد را درخواست کنید." };
  if (new Date(otp.expiresAt).getTime() < Date.now()) return { ok: false, message: "کد منقضی شده — دوباره درخواست کنید." };
  if (otp.attempts >= 5) return { ok: false, message: "۵ تلاش اشتباه — ۱۵ دقیقه صبر کنید." };
  const clean = code.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/\D/g, "");
  if (clean !== otp.code) {
    otp.attempts += 1;
    writeJson(OTP_FILE, all);
    return { ok: false, message: `کد اشتباه است (${(5 - otp.attempts).toLocaleString("fa-IR")} تلاش دیگر).` };
  }
  writeJson(OTP_FILE, all.filter((o) => o.phone !== phone));

  const token = Array.from({ length: 48 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
  const now = new Date();
  const h = await headers();
  const session: Session = {
    token,
    phone,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_DAYS * 86400000).toISOString(),
    lastSeenAt: now.toISOString(),
    userAgent: h.get("user-agent")?.slice(0, 120) ?? "",
  };
  const sessions = readJson<Session[]>(SESSIONS_FILE, []).filter((s) => new Date(s.expiresAt).getTime() > Date.now());
  writeJson(SESSIONS_FILE, [...sessions, session]);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86400 });

  // last sign-in on the users list
  const site = getSite();
  const user = site.settings.users.find((u) => normalizePhone(u.phone) === phone);
  if (user) {
    user.lastLogin = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium", timeStyle: "short" }).format(now);
    const { saveSettings } = await import("./siteStore");
    saveSettings("users", site.settings.users);
  }
  return { ok: true };
}

export type CurrentUser = { name: string; phone: string; role: Role; sessions: number };

/** The signed-in admin, or null. Renews the session on activity (§2.2). */
export async function currentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const sessions = readJson<Session[]>(SESSIONS_FILE, []);
  const s = sessions.find((x) => x.token === token);
  if (!s || new Date(s.expiresAt).getTime() < Date.now()) return null;
  const user = findUser(s.phone);
  if (!user) return null;
  const role = getSite().settings.roles.find((r) => r.id === user.role) ?? getSite().settings.roles[0];
  return { name: user.name, phone: user.phone, role, sessions: sessions.filter((x) => x.phone === s.phone).length };
}

export async function logout(allDevices = false) {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  const sessions = readJson<Session[]>(SESSIONS_FILE, []);
  const me = sessions.find((s) => s.token === token);
  writeJson(SESSIONS_FILE, sessions.filter((s) => (allDevices && me ? s.phone !== me.phone : s.token !== token)));
  store.delete(COOKIE);
}

/** Ends every session of a phone — used when a user is deactivated. */
export function endSessionsFor(phone: string) {
  const p = normalizePhone(phone);
  writeJson(SESSIONS_FILE, readJson<Session[]>(SESSIONS_FILE, []).filter((s) => s.phone !== p));
}
