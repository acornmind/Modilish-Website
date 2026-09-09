"use server";

import { revalidatePath } from "next/cache";
import { getSite, saveSettings } from "./siteStore";

/**
 * A campaign is "the folder that switches everything on/off together" (§4.11.4):
 * launching activates its coupons + discount rules and puts its announcement
 * in the header; stopping reverses that.
 */
export async function setCampaignStatusAction(id: string, status: "active" | "ended" | "draft") {
  const { settings } = await getSite();
  const c = settings.campaigns.find((x) => x.id === id);
  if (!c) throw new Error("کمپین یافت نشد");
  const on = status === "active";

  await saveSettings("campaigns", settings.campaigns.map((x) => (x.id === id ? { ...x, status } : x)));
  if (c.couponCodes.length > 0)
    await saveSettings("coupons", settings.coupons.map((cp) => (c.couponCodes.includes(cp.code) ? { ...cp, active: on } : cp)));
  if (c.discountRuleIds.length > 0)
    await saveSettings("discountRules", settings.discountRules.map((r) => (c.discountRuleIds.includes(r.id) ? { ...r, active: on } : r)));
  if (c.announcementText.trim()) {
    const cur = settings.header.announcement;
    const announcement = on
      ? { enabled: true, text: c.announcementText, href: c.announcementHref || "/offer" }
      : cur.text === c.announcementText
        ? { ...cur, enabled: false }
        : cur;
    await saveSettings("header", { ...settings.header, announcement });
  }
  revalidatePath("/", "layout");
}
