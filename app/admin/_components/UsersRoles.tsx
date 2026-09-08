"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { permissionAreas, type AdminUser, type ApiKey, type PermissionRow, type Role } from "@/lib/siteContent";
import { saveSettingsAction } from "@/lib/siteActions";
import { randomCode, uid } from "@/lib/uid";
import { toast } from "@/lib/toast";
import { faNum } from "@/lib/adminFormat";
import { BackendNote, btnDanger, btnPrimary, btnSoft, Card, ConfirmDialog, Field, inputCls, PageHeader, SaveBar, Tabs } from "./ui";

type TabKey = "users" | "roles" | "keys";

/** تنظیمات → کاربران و دسترسی‌ها — docs/admin-spec.md §2.1, §4.14. */
export default function UsersRoles({ users: u0, roles: r0, apiKeys: k0 }: { users: AdminUser[]; roles: Role[]; apiKeys: ApiKey[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("users");
  const [users, setUsers] = useState(u0);
  const [roles, setRoles] = useState(r0);
  const [keys, setKeys] = useState(k0);
  const [saved, setSaved] = useState({ users: u0, roles: r0, keys: k0 });
  const [saving, start] = useTransition();
  const [selectedRole, setSelectedRole] = useState(roles[0]?.id ?? "");
  const [invite, setInvite] = useState({ name: "", phone: "", role: "support" });
  const [newKey, setNewKey] = useState({ name: "", role: "ai-writer" });
  const [shownKey, setShownKey] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; text?: string; run: () => void } | null>(null);

  const dirty = JSON.stringify({ users, roles, keys }) !== JSON.stringify(saved);
  const owners = users.filter((x) => x.role === "owner" && x.active).length;

  function save() {
    start(async () => {
      try {
        await saveSettingsAction("users", users);
        await saveSettingsAction("roles", roles);
        await saveSettingsAction("apiKeys", keys);
        setSaved({ users, roles, keys });
        toast("ذخیره شد");
        router.refresh();
      } catch {
        toast("ذخیره نشد");
      }
    });
  }

  const role = roles.find((r) => r.id === selectedRole);
  const setRole = (patch: Partial<Role>) => setRoles(roles.map((r) => (r.id === selectedRole ? { ...r, ...patch } : r)));
  const setCell = (area: string, key: keyof PermissionRow, val: boolean) => {
    if (!role || role.locked) return;
    const row = { ...role.grid[area], [key]: val };
    if (key === "edit" && val) row.view = true; // ticking edit implies view
    if (key === "view" && !val) row.edit = row.publish = row.delete = false;
    setRole({ grid: { ...role.grid, [area]: row } });
  };

  return (
    <div>
      <PageHeader
        title="کاربران و دسترسی‌ها"
        subtitle="ورود با شماره موبایل + کد پیامکی؛ فقط شماره‌های این فهرست می‌توانند وارد شوند"
        back={{ href: "/admin/settings", label: "تنظیمات" }}
        actions={
          <button type="button" onClick={save} disabled={saving || !dirty} className={btnPrimary}>
            {saving ? "…" : "ذخیره"}
          </button>
        }
      />
      <BackendNote>
        ورود واقعی با پیامک (کاوه‌نگار) و بررسی دسترسی‌ها در سرور، به فاز ۱ مستند (بخش ۲٫۲ و ۷) وابسته است. این صفحه فهرست کاربران، نقش‌ها و کلیدها را نگه می‌دارد تا با اتصال کاوه‌نگار بلافاصله فعال شود.
      </BackendNote>
      <div className="mt-4">
        <Tabs
          tabs={[
            { key: "users", label: "کاربران", count: users.length },
            { key: "roles", label: "نقش‌ها", count: roles.length },
            { key: "keys", label: "کلیدهای API", count: keys.filter((k) => !k.revoked).length },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "users" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
          <Card title="کاربران">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-bold text-modi-gray-900">
                  <th className="py-2 text-start">نام</th>
                  <th className="py-2 text-start">موبایل</th>
                  <th className="py-2 text-start">نقش</th>
                  <th className="py-2 text-start">وضعیت</th>
                  <th className="py-2 text-start">آخرین ورود</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((x) => (
                  <tr key={x.id} className="border-t border-[#f3f0f7]">
                    <td className="py-2 font-bold">{x.name}</td>
                    <td className="py-2 tabular-nums text-modi-gray-900" dir="ltr">{x.phone}</td>
                    <td className="py-2">
                      <select
                        value={x.role}
                        disabled={x.role === "owner" && owners <= 1}
                        onChange={(e) => setUsers(users.map((y) => (y.id === x.id ? { ...y, role: e.target.value } : y)))}
                        className={`${inputCls} h-8 w-auto`}
                      >
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${x.active ? "bg-modi-success-bg text-modi-success" : "bg-modi-gray-500 text-modi-gray-900"}`}>
                        {x.active ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-modi-gray-900">{x.lastLogin}</td>
                    <td className="py-2 text-end">
                      <button
                        type="button"
                        disabled={x.role === "owner" && owners <= 1 && x.active}
                        onClick={() => setUsers(users.map((y) => (y.id === x.id ? { ...y, active: !y.active } : y)))}
                        className="rounded-lg px-2 py-1 text-xs text-modi-purple-800 hover:bg-modi-purple-200 disabled:opacity-40"
                      >
                        {x.active ? "غیرفعال‌کردن" : "فعال‌کردن"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-modi-gray-900">آخرین مالک را نمی‌توان غیرفعال کرد یا نقشش را تغییر داد.</p>
          </Card>
          <Card title="دعوت کاربر">
            <div className="space-y-3">
              <Field label="نام"><input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} className={inputCls} /></Field>
              <Field label="شماره موبایل" hint="۰۹… — با همین شماره وارد می‌شود"><input value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} dir="ltr" className={`${inputCls} text-left tabular-nums`} /></Field>
              <Field label="نقش">
                <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })} className={inputCls}>
                  {roles.filter((r) => r.id !== "owner").map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Field>
              <button
                type="button"
                className={btnPrimary}
                disabled={!invite.name.trim() || !/^0?9\d{9}$/.test(invite.phone.replace(/\D/g, ""))}
                onClick={() => {
                  setUsers([...users, { id: uid("u"), name: invite.name.trim(), phone: invite.phone.trim(), role: invite.role, active: true, lastLogin: "—" }]);
                  setInvite({ name: "", phone: "", role: "support" });
                }}
              >
                دعوت کاربر
              </button>
            </div>
          </Card>
        </div>
      )}

      {tab === "roles" && role && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px] lg:items-start">
          <Card
            title={`نقش «${role.name}» · ${faNum(users.filter((u) => u.role === role.id).length)} کاربر${role.locked ? " · قفل" : ""}`}
            action={
              !role.locked && (
                <span className="flex gap-2">
                  <button
                    type="button"
                    className={`${btnSoft} h-8 text-xs`}
                    onClick={() => {
                      const copy: Role = { ...JSON.parse(JSON.stringify(role)), id: uid("r"), name: `${role.name} (کپی)`, locked: false };
                      setRoles([...roles, copy]);
                      setSelectedRole(copy.id);
                    }}
                  >
                    کپی نقش
                  </button>
                  <button
                    type="button"
                    className={`${btnDanger} h-8 text-xs`}
                    disabled={users.some((u) => u.role === role.id)}
                    title={users.some((u) => u.role === role.id) ? "نقشی که کاربر دارد حذف نمی‌شود" : ""}
                    onClick={() =>
                      setConfirm({
                        title: `نقش «${role.name}» حذف شود؟`,
                        run: () => {
                          setRoles(roles.filter((r) => r.id !== role.id));
                          setSelectedRole(roles[0].id);
                        },
                      })
                    }
                  >
                    حذف
                  </button>
                </span>
              )
            }
          >
            <Field label="نام نقش" className="mb-3 max-w-xs">
              <input value={role.name} disabled={role.locked} onChange={(e) => setRole({ name: e.target.value })} className={inputCls} />
            </Field>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-[11px] font-bold text-modi-gray-900">
                    <th className="py-2 text-start">بخش</th>
                    {(["view", "edit", "publish", "delete"] as const).map((k) => (
                      <th key={k} className="py-2 text-center">{{ view: "مشاهده", edit: "ویرایش", publish: "انتشار", delete: "حذف" }[k]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionAreas.map((area) => (
                    <tr key={area} className="border-t border-[#f3f0f7]">
                      <td className="py-2 font-bold">{area}</td>
                      {(["view", "edit", "publish", "delete"] as const).map((k) => (
                        <td key={k} className="py-2 text-center">
                          <input type="checkbox" disabled={role.locked} checked={role.grid[area]?.[k] ?? false} onChange={(e) => setCell(area, k, e.target.checked)} className="h-4 w-4" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Field label="گزینه‌های ویژه" hint="با «،» جدا کنید: لغو و بازپرداخت، ویرایش مبلغ، کیف پول، مسدودکردن، تغییر موجودی، درون‌ریزی، ثبت سفارش دستی، پذیرش مرجوعی، ارسال پیامک" className="mt-3">
              <input value={role.extras.join("، ")} disabled={role.locked} onChange={(e) => setRole({ extras: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })} className={inputCls} />
            </Field>
          </Card>
          <div className="space-y-2">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRole(r.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm ${r.id === selectedRole ? "bg-modi-purple-800 text-white" : "bg-white hover:bg-modi-purple-200"}`}
              >
                <span className="font-bold">{r.name}</span>
                <span className={`text-[11px] ${r.id === selectedRole ? "text-white/80" : "text-modi-gray-900"}`}>
                  {r.locked ? "قفل" : `${faNum(users.filter((u) => u.role === r.id).length)} کاربر`}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const r: Role = { id: uid("r"), name: "نقش جدید", locked: false, grid: Object.fromEntries(permissionAreas.map((a) => [a, { view: false, edit: false, publish: false, delete: false }])), extras: [] };
                setRoles([...roles, r]);
                setSelectedRole(r.id);
              }}
              className="w-full rounded-xl border-2 border-dashed border-modi-purple-500 py-2.5 text-sm font-bold text-modi-purple-800"
            >
              + ایجاد نقش
            </button>
          </div>
        </div>
      )}

      {tab === "keys" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
          <Card title="کلیدهای API">
            <p className="mb-2 text-[11px] leading-5 text-modi-gray-900">برای ربات نویسنده و اپ آینده — Content API بخش ۷٫۱ مستند. هر کلید به یک نقش محدود است.</p>
            {keys.length === 0 && <p className="py-6 text-center text-xs text-modi-gray-900">هنوز کلیدی ساخته نشده.</p>}
            <div className="divide-y divide-[#f3f0f7]">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{k.name} <span className="font-mono text-[11px] text-modi-gray-900" dir="ltr">{k.prefix}…</span></p>
                    <p className="text-[11px] text-modi-gray-900">
                      نقش: {roles.find((r) => r.id === k.role)?.name ?? k.role} · انقضا: {k.expiresAt || "بدون انقضا"} · آخرین استفاده: {k.lastUsed || "—"}
                    </p>
                  </div>
                  {k.revoked ? (
                    <span className="rounded-full bg-modi-gray-500 px-2 py-0.5 text-[11px] text-modi-gray-900">باطل‌شده</span>
                  ) : (
                    <button type="button" onClick={() => setKeys(keys.map((x) => (x.id === k.id ? { ...x, revoked: true } : x)))} className={`${btnDanger} h-8 text-xs`}>
                      ابطال
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card title="ایجاد کلید">
            <div className="space-y-3">
              <Field label="نام"><input value={newKey.name} onChange={(e) => setNewKey({ ...newKey, name: e.target.value })} placeholder="مثلاً ربات نویسنده" className={inputCls} /></Field>
              <Field label="نقش">
                <select value={newKey.role} onChange={(e) => setNewKey({ ...newKey, role: e.target.value })} className={inputCls}>
                  {roles.filter((r) => r.id !== "owner").map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </Field>
              <button
                type="button"
                className={btnPrimary}
                disabled={!newKey.name.trim()}
                onClick={() => {
                  const raw = "mdl_live_" + randomCode(32);
                  setKeys([...keys, { id: uid("k"), name: newKey.name.trim(), role: newKey.role, prefix: raw.slice(0, 16), expiresAt: "", lastUsed: "", revoked: false }]);
                  setShownKey(raw);
                  setNewKey({ name: "", role: "ai-writer" });
                }}
              >
                ایجاد
              </button>
              {shownKey && (
                <div className="rounded-xl bg-modi-warning-bg p-3 text-xs">
                  <p className="mb-1 font-bold text-modi-warning">کلید فقط همین یک بار نمایش داده می‌شود:</p>
                  <code className="block break-all font-mono" dir="ltr">{shownKey}</code>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <SaveBar dirty={dirty} saving={saving} onSave={save} onCancel={() => { setUsers(saved.users); setRoles(saved.roles); setKeys(saved.keys); }} />
      <ConfirmDialog open={!!confirm} title={confirm?.title ?? ""} text={confirm?.text} danger confirmLabel="حذف" onCancel={() => setConfirm(null)} onConfirm={() => { confirm?.run(); setConfirm(null); }} />
    </div>
  );
}
