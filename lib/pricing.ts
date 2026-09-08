// Price resolver — docs/admin-spec.md §4.11.1 / §4.11.3. Pure and
// browser-safe: the storefront (client) and the order store (server) both
// call it so a customer never sees a price the order won't charge.
import type { Product } from "./products";
import type { DiscountRule, DiscountScope, ShippingRule, ShippingSettings } from "./siteContent";

export type PriceInfo = {
  /** per-unit price the customer pays for this quantity */
  unit: number;
  /** list price before any discount */
  list: number;
  percentOff: number;
  /** why — e.g. "۱۵٪ تخفیف کرپ" or "۳ متر بخرید، ۵٪ تخفیف بگیرید" */
  label: string;
  /** hint for the product page: the next tier the shopper could reach */
  nextTierHint: string;
};

const fa = (n: number) => n.toLocaleString("fa-IR");

function withinWindow(from: string, until: string, now: number) {
  if (from && new Date(from).getTime() > now) return false;
  if (until && new Date(until).getTime() + 86400000 < now) return false; // inclusive day
  return true;
}

function attrValues(product: Product, label: string) {
  const v = product.attributes.find((a) => a.label === label)?.value ?? "";
  return v.split(/[\/،,]/).map((s) => s.trim()).filter(Boolean);
}

export function inScope(product: Product, scope: DiscountScope) {
  switch (scope.kind) {
    case "all":
      return true;
    case "material":
      return scope.values.includes(product.category);
    case "pattern":
      return attrValues(product, "طرح").some((v) => scope.values.includes(v));
    case "usage":
      return attrValues(product, "کاربرد").some((v) => scope.values.includes(v));
    case "products":
      return scope.values.includes(product.slug);
  }
}

export function activeRules(rules: DiscountRule[], now = Date.now()) {
  return rules.filter((r) => r.active && withinWindow(r.validFrom, r.validUntil, now)).sort((a, b) => b.priority - a.priority);
}

/** Per-unit price for `qty` of a product, after sale price + scope + volume rules. */
export function priceOf(product: Product, rules: DiscountRule[], qty = product.limit || 1, now = Date.now()): PriceInfo {
  const list = product.price;
  let unit = product.salePrice > 0 ? product.salePrice : product.price;
  let label = product.salePrice > 0 ? "قیمت فروش ویژه" : "";

  const candidates: { off: number; label: string; stacking: DiscountRule["stacking"]; nextHint?: string }[] = [];
  let nextTierHint = "";

  for (const r of activeRules(rules, now)) {
    if (r.type === "cart" || !inScope(product, r.scope)) continue;
    if (r.type === "scope") {
      const off = r.percent > 0 ? Math.round((unit * r.percent) / 100) : Math.min(unit, r.fixedToman);
      if (off > 0) candidates.push({ off, label: r.name || (r.percent > 0 ? `${fa(r.percent)}٪ تخفیف` : `${fa(r.fixedToman)} تومان تخفیف`), stacking: r.stacking });
    } else if (r.type === "volume") {
      const tiers = [...r.tiers].sort((a, b) => a.minQty - b.minQty);
      const hit = tiers.filter((t) => qty >= t.minQty).pop();
      const next = tiers.find((t) => qty < t.minQty);
      if (next && !nextTierHint) nextTierHint = `${fa(next.minQty)} ${product.unit} بخرید، ${fa(next.percent)}٪ تخفیف بگیرید`;
      if (hit) candidates.push({ off: Math.round((unit * hit.percent) / 100), label: `${fa(hit.minQty)} ${product.unit} به بالا: ${fa(hit.percent)}٪ تخفیف`, stacking: r.stacking });
    }
  }

  if (candidates.length > 0) {
    const stackable = candidates.filter((c) => c.stacking === "stack");
    const largest = candidates.reduce((a, b) => (b.off > a.off ? b : a));
    // "largest wins" by default; rules marked stackable add on top of the largest non-stackable one
    const base = candidates.some((c) => c.stacking === "largest") ? candidates.filter((c) => c.stacking === "largest").reduce((a, b) => (b.off > a.off ? b : a)) : largest;
    let off = base.off;
    const labels = [base.label];
    for (const s of stackable) if (s !== base) { off += s.off; labels.push(s.label); }
    unit = Math.max(0, unit - off);
    label = labels.join(" + ");
  }

  const percentOff = list > 0 ? Math.round((1 - unit / list) * 100) : 0;
  return { unit, list, percentOff, label, nextTierHint };
}

export type CartLineInput = { product: Product; qty: number };

/** Cart-level tier discount (§4.11.1 «تخفیف پلکانی سبد») on the discounted subtotal. */
export function cartTierDiscount(subtotal: number, rules: DiscountRule[], now = Date.now()) {
  let best = { toman: 0, label: "" };
  for (const r of activeRules(rules, now)) {
    if (r.type !== "cart") continue;
    const hit = [...r.cartTiers].sort((a, b) => a.minToman - b.minToman).filter((t) => subtotal >= t.minToman).pop();
    if (!hit) continue;
    const toman = Math.round((subtotal * hit.percent) / 100);
    if (toman > best.toman) best = { toman, label: `${r.name || "تخفیف سبد"} · ${fa(hit.percent)}٪` };
  }
  return best;
}

export function cartTierHint(subtotal: number, rules: DiscountRule[], now = Date.now()) {
  for (const r of activeRules(rules, now)) {
    if (r.type !== "cart") continue;
    const next = [...r.cartTiers].sort((a, b) => a.minToman - b.minToman).find((t) => subtotal < t.minToman);
    if (next) return `${fa(next.minToman - subtotal)} تومان تا ${fa(next.percent)}٪ تخفیف سبد`;
  }
  return "";
}

/** Shipping fee for a cart — §4.14 rules engine (simplified) + §4.11.3 free-shipping rules. */
export function shippingFor(
  input: { subtotal: number; meters: number; lines: CartLineInput[]; province?: string; segmentTags?: string[]; methodPrice: number },
  shipping: ShippingSettings,
  now = Date.now(),
): { fee: number; label: string; hint: string } {
  if (shipping.freeEverywhere) return { fee: 0, label: "رایگان", hint: "" };
  let fee = input.methodPrice;
  let hint = "";
  for (const r of shipping.rules.filter((x) => x.active && withinWindow(x.validFrom, x.validUntil, now))) {
    if (r.provinces.length > 0 && input.province && !r.provinces.includes(input.province)) continue;
    switch (r.type) {
      case "free_from_amount":
        if (input.subtotal >= r.threshold) return { fee: 0, label: "رایگان", hint: "" };
        if (!hint) hint = `${fa(r.threshold - input.subtotal)} تومان تا ارسال رایگان`;
        break;
      case "free_from_meters":
        if (input.meters >= r.threshold) return { fee: 0, label: "رایگان", hint: "" };
        break;
      case "free_scope":
        if (input.lines.length > 0 && input.lines.every((l) => inScope(l.product, r.scope))) return { fee: 0, label: "رایگان", hint: "" };
        break;
      case "free_segment":
        if (input.segmentTags?.includes(r.segment)) return { fee: 0, label: "رایگان", hint: "" };
        break;
      case "percent_off":
        fee = Math.round(fee * (1 - r.threshold / 100));
        break;
    }
  }
  return { fee, label: fee === 0 ? "رایگان" : `${fa(fee)} تومان`, hint };
}

export function ruleTypeLabel(t: DiscountRule["type"]) {
  return { scope: "تخفیف روی گروه", volume: "تخفیف پلکانی متراژ", cart: "تخفیف پلکانی سبد" }[t];
}

export function shippingRuleLabel(t: ShippingRule["type"]) {
  return {
    free_from_amount: "ارسال رایگان از مبلغ",
    free_from_meters: "ارسال رایگان از متراژ",
    free_scope: "ارسال رایگان برای گروه / محصول",
    free_segment: "ارسال رایگان برای بخش مشتریان",
    percent_off: "درصد تخفیف روی ارسال",
  }[t];
}

export function scopeLabel(s: DiscountScope) {
  const kind = { all: "همه محصولات", material: "جنس", pattern: "طرح", usage: "کاربرد", products: "محصولات انتخابی" }[s.kind];
  return s.kind === "all" ? kind : `${kind}: ${s.values.join("، ")}`;
}
