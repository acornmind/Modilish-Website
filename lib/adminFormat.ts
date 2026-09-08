// Shared number/format helpers for the admin — docs/admin-spec.md §3.3:
// Persian digits everywhere, tabular numerals on every number column.
export function faNum(n: number, opts?: Intl.NumberFormatOptions) {
  return n.toLocaleString("fa-IR", opts);
}

export function tomanShort(n: number) {
  return faNum(n) + " تومان";
}

export function metersLabel(n: number) {
  return faNum(n, { maximumFractionDigits: 1 }) + " متر";
}

export function pct(n: number) {
  const sign = n > 0 ? "+" : "";
  return sign + faNum(n) + "٪";
}
