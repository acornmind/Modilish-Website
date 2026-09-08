"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ContactMessage, Question, Review } from "@/lib/orderStore";
import type { SiteSettings } from "@/lib/siteContent";
import { answerQuestionAction, moderateReviewAction, setMessageStatusAction } from "@/lib/orderActions";
import { saveSettingsAction } from "@/lib/siteActions";
import { formatJalali } from "@/lib/orders";
import { faNum } from "@/lib/adminFormat";
import { toast } from "@/lib/toast";
import { btnPrimary, btnSoft, Card, EmptyState, Field, inputCls, Tabs, textareaCls, Toggle } from "./ui";

type TabKey = "reviews" | "questions" | "messages";

/** دیدگاه‌ها و پیام‌ها — docs/admin-spec.md §4.10. */
export default function ReviewsPanel({ reviews, questions = [], messages, settings, initialTab }: { reviews: Review[]; questions?: Question[]; messages: ContactMessage[]; settings: SiteSettings["reviews"]; initialTab?: TabKey }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>(initialTab ?? "reviews");
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [qFilter, setQFilter] = useState<"pending" | "answered" | "rejected" | "all">("pending");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const [cfg, setCfg] = useState(settings);
  const [pending, start] = useTransition();

  const visible = reviews.filter((r) => filter === "all" || r.status === filter);
  const visibleQ = questions.filter((q) => qFilter === "all" || q.status === qFilter);
  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

  const answerQ = (id: string, patch: { answer?: string; status?: Question["status"] }) =>
    start(async () => {
      await answerQuestionAction(id, patch);
      toast(patch.answer !== undefined ? "پاسخ در صفحه محصول منتشر شد" : patch.status === "rejected" ? "رد شد" : "به‌روزرسانی شد");
      router.refresh();
    });

  const moderate = (id: string, patch: { status?: Review["status"]; reply?: string }) =>
    start(async () => {
      await moderateReviewAction(id, patch);
      toast(patch.reply !== undefined ? "پاسخ منتشر شد" : patch.status === "approved" ? "تایید شد" : "رد شد");
      router.refresh();
    });

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-base font-bold lg:text-lg">دیدگاه‌ها و پیام‌ها</h1>
        <p className="mt-0.5 text-xs text-modi-gray-900">دیدگاه‌های ثبت‌شده در صفحه محصول پس از تایید در سایت دیده می‌شوند؛ پیام‌های فرم تماس هم این‌جا می‌رسند.</p>
      </div>
      <Tabs
        tabs={[
          { key: "reviews", label: "دیدگاه‌ها", count: reviews.filter((r) => r.status === "pending").length },
          { key: "questions", label: "پرسش‌ها", count: questions.filter((q) => q.status === "pending").length },
          { key: "messages", label: "پیام‌های تماس", count: messages.filter((m) => m.status === "new").length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "reviews" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <div>
            <div className="mb-3 flex gap-1">
              {([["pending", "در انتظار"], ["approved", "تاییدشده"], ["rejected", "ردشده"], ["all", "همه"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === k ? "bg-modi-purple-800 text-white" : "bg-white"}`}>
                  {l} <span className="opacity-70">{faNum(reviews.filter((r) => k === "all" || r.status === k).length)}</span>
                </button>
              ))}
            </div>
            {visible.length === 0 ? (
              <div className="rounded-2xl bg-white"><EmptyState text={filter === "pending" ? "دیدگاهی در انتظار تایید نیست" : "دیدگاهی در این وضعیت نیست"} small /></div>
            ) : (
              <div className="space-y-3">
                {visible.map((r) => (
                  <Card key={r.id}>
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-modi-gray-900">
                          <Link href={`/admin/products/${r.slug}`} className="font-bold text-modi-purple-800">{r.productName}</Link> · {formatJalali(r.createdAt)}
                        </p>
                        <p className="mt-1 text-sm">
                          <span className="font-bold">{r.name}</span>
                          {r.verified && <span className="ms-1 rounded bg-modi-success-bg px-1 text-[10px] text-modi-success">خرید تاییدشده</span>}
                          <span className="ms-2 text-[#f5a623]">{stars(r.rating)}</span>
                        </p>
                        <p className="mt-1 text-sm leading-7">{r.text}</p>
                        {r.reply && <p className="mt-2 rounded-xl bg-modi-purple-200 px-3 py-2 text-xs leading-6 text-modi-purple-800"><span className="font-bold">پاسخ مدیلیش: </span>{r.reply}</p>}
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.status === "approved" ? "bg-modi-success-bg text-modi-success" : r.status === "rejected" ? "bg-modi-danger-bg text-modi-danger" : "bg-modi-warning-bg text-modi-warning"}`}>
                        {r.status === "approved" ? "تاییدشده" : r.status === "rejected" ? "ردشده" : "در انتظار"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {r.status !== "approved" && <button type="button" disabled={pending} onClick={() => moderate(r.id, { status: "approved" })} className={`${btnPrimary} h-8 text-xs`}>تایید</button>}
                      {r.status !== "rejected" && <button type="button" disabled={pending} onClick={() => moderate(r.id, { status: "rejected" })} className={`${btnSoft} h-8 text-xs`}>رد</button>}
                      <input value={reply[r.id] ?? ""} onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })} placeholder="پاسخ با نام فروشگاه…" className={`${inputCls} h-8 max-w-xs`} />
                      <button type="button" disabled={pending || !(reply[r.id] ?? "").trim()} onClick={() => moderate(r.id, { reply: reply[r.id].trim(), status: "approved" })} className={`${btnSoft} h-8 text-xs`}>پاسخ</button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <Card title="تنظیمات دیدگاه">
            <Toggle checked={cfg.autoApproveVerified} onChange={(v) => setCfg({ ...cfg, autoApproveVerified: v })} label="تایید خودکار خریداران تاییدشده" hint="دیدگاه کسی که همان پارچه را خریده، بدون بازبینی منتشر شود" />
            <Toggle checked={cfg.requestSms} onChange={(v) => setCfg({ ...cfg, requestSms: v })} label="پیامک درخواست نظر پس از تحویل" />
            {cfg.requestSms && (
              <Field label="چند روز پس از تحویل" className="mt-2">
                <input type="number" min={1} max={30} value={cfg.requestSmsDelayDays} onChange={(e) => setCfg({ ...cfg, requestSmsDelayDays: Number(e.target.value) || 3 })} className={`${inputCls} w-24`} />
              </Field>
            )}
            <button type="button" disabled={pending || JSON.stringify(cfg) === JSON.stringify(settings)} onClick={() => start(async () => { await saveSettingsAction("reviews", cfg); toast("ذخیره شد"); router.refresh(); })} className={`${btnPrimary} mt-3 h-9 text-xs`}>ذخیره</button>
          </Card>
        </div>
      )}

      {tab === "questions" && (
        <div>
          <div className="mb-3 flex gap-1">
            {([["pending", "بی‌پاسخ"], ["answered", "پاسخ‌داده‌شده"], ["rejected", "ردشده"], ["all", "همه"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setQFilter(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${qFilter === k ? "bg-modi-purple-800 text-white" : "bg-white"}`}>
                {l} <span className="opacity-70">{faNum(questions.filter((q) => k === "all" || q.status === k).length)}</span>
              </button>
            ))}
          </div>
          {visibleQ.length === 0 ? (
            <div className="rounded-2xl bg-white"><EmptyState text={qFilter === "pending" ? "پرسش بی‌پاسخی نیست — پرسش‌های تب «دیدگاه‌ها» در صفحه محصول این‌جا می‌رسند" : "پرسشی در این وضعیت نیست"} small /></div>
          ) : (
            <div className="space-y-3">
              {visibleQ.map((q) => (
                <Card key={q.id}>
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-modi-gray-900">
                        <Link href={`/admin/products/${q.slug}`} className="font-bold text-modi-purple-800">{q.productName}</Link> · {formatJalali(q.createdAt)}
                        {q.phone && <> · <a href={`tel:${q.phone}`} dir="ltr" className="tabular-nums">{q.phone}</a></>}
                      </p>
                      <p className="mt-1 text-sm"><span className="font-bold">{q.name}:</span> {q.text}</p>
                      {q.answer && <p className="mt-2 rounded-xl bg-modi-purple-200 px-3 py-2 text-xs leading-6 text-modi-purple-800"><span className="font-bold">پاسخ مدیلیش: </span>{q.answer}</p>}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${q.status === "answered" ? "bg-modi-success-bg text-modi-success" : q.status === "rejected" ? "bg-modi-danger-bg text-modi-danger" : "bg-modi-warning-bg text-modi-warning"}`}>
                      {q.status === "answered" ? "منتشرشده" : q.status === "rejected" ? "ردشده" : "بی‌پاسخ"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <textarea value={answer[q.id] ?? q.answer ?? ""} onChange={(e) => setAnswer({ ...answer, [q.id]: e.target.value })} placeholder="پاسخ عمومی — زیر پرسش در صفحه محصول منتشر می‌شود" className={`${textareaCls} min-h-14 flex-1`} />
                    <div className="flex flex-col gap-1">
                      <button type="button" disabled={pending || !(answer[q.id] ?? q.answer ?? "").trim()} onClick={() => answerQ(q.id, { answer: (answer[q.id] ?? q.answer ?? "").trim() })} className={`${btnPrimary} h-8 text-xs`}>{q.status === "answered" ? "به‌روزرسانی پاسخ" : "انتشار پاسخ"}</button>
                      {q.status !== "rejected" && <button type="button" disabled={pending} onClick={() => answerQ(q.id, { status: "rejected" })} className={`${btnSoft} h-8 text-xs`}>رد</button>}
                      {q.phone && <Link href={`/admin/sms?to=${q.phone}`} className={`${btnSoft} h-8 text-xs`}>پاسخ خصوصی با پیامک</Link>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "messages" && (
        <div className="space-y-3">
          {messages.length === 0 && <div className="rounded-2xl bg-white"><EmptyState text="پیامی از فرم تماس دریافت نشده است" small /></div>}
          {messages.map((m) => (
            <Card key={m.id}>
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm"><span className="font-bold">{m.name}</span> · <a href={`tel:${m.phone}`} className="tabular-nums text-modi-purple-800" dir="ltr">{m.phone}</a></p>
                  <p className="text-[11px] text-modi-gray-900">{formatJalali(m.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-7">{m.text}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${m.status === "new" ? "bg-modi-warning-bg text-modi-warning" : m.status === "done" ? "bg-modi-success-bg text-modi-success" : "bg-modi-gray-500 text-modi-gray-900"}`}>
                  {m.status === "new" ? "جدید" : m.status === "read" ? "خوانده‌شده" : "پاسخ‌داده‌شده"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                {m.status === "new" && <button type="button" onClick={() => start(async () => { await setMessageStatusAction(m.id, "read"); router.refresh(); })} className={`${btnSoft} h-8 text-xs`}>خوانده شد</button>}
                {m.status !== "done" && <button type="button" onClick={() => start(async () => { await setMessageStatusAction(m.id, "done"); router.refresh(); })} className={`${btnPrimary} h-8 text-xs`}>پاسخ داده شد</button>}
                <Link href={`/admin/sms?to=${m.phone}`} className={`${btnSoft} h-8 text-xs`}>پاسخ با پیامک</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
