"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { products, type Product } from "./products";
import { cartTierDiscount, cartTierHint, priceOf, shippingFor, type PriceInfo } from "./pricing";
import type { DiscountRule, ShippingSettings } from "./siteContent";

export type CartItem = {
  productId: number;
  /** whole-unit part of the order (meters or pieces) */
  meter: number;
  /** centimetre part, only meaningful when unit === "متر" */
  centimeter: number;
};

/** What the admin controls that the cart needs — passed in by the root layout. */
export type SitePricing = {
  rules: DiscountRule[];
  shipping: ShippingSettings;
  /** base price of the first active shipping method */
  methodPrice: number;
  strings: Record<string, string>;
};

type CartContextValue = {
  items: CartItem[];
  add: (productId: number, meter: number, centimeter: number) => void;
  update: (productId: number, meter: number, centimeter: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  count: number;
  /** goods after per-line discounts */
  subtotal: number;
  /** cart-level tier discount (§4.11.1) */
  cartDiscount: { toman: number; label: string };
  cartHint: string;
  /** goods total after cart discount, before coupon and shipping */
  total: number;
  shipping: { fee: number; label: string; hint: string };
  lineTotal: (item: CartItem) => number;
  qtyOf: (item: CartItem) => number;
  productFor: (item: CartItem) => Product | undefined;
  /** price a product at a quantity through the discount rules */
  priceOf: (product: Product, qty?: number) => PriceInfo;
  strings: Record<string, string>;
  pricing: SitePricing;
};

const STORAGE_KEY = "modilish-cart";

/** "۱ متر و ۵۰ سانتی‌متر" / "۵۰ سانتی‌متر" / "۲ عدد" — one wording everywhere. */
export function formatLength(meter: number, centimeter: number, unit: string) {
  const fa = (n: number) => n.toLocaleString("fa-IR");
  if (unit !== "متر") return `${fa(meter)} ${unit}`;
  if (meter === 0 && centimeter > 0) return `${fa(centimeter)} سانتی‌متر`;
  return `${fa(meter)} متر${centimeter ? ` و ${fa(centimeter)} سانتی‌متر` : ""}`;
}

/** 0.5 → { meter: 0, centimeter: 50 } — the shape the cart + qty modal use. */
export function splitLength(length: number): {
  meter: number;
  centimeter: number;
} {
  const meter = Math.floor(length);
  const centimeter = Math.round((length - meter) * 10) * 10;
  return { meter, centimeter };
}

/* ---- module-level store, synced to localStorage ---- */

const SERVER_SNAPSHOT: CartItem[] = [];
let snapshot: CartItem[] = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let loaded = false;

/** id of the product most recently added — drives the cart "added" banner */
let _lastAddedId: number | null = null;
export const lastAddedId = () => _lastAddedId;
export const clearLastAdded = () => {
  _lastAddedId = null;
};

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) snapshot = JSON.parse(raw) as CartItem[];
  } catch {
    /* ignore */
  }
}

function commit(next: CartItem[]) {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  load();
  return snapshot;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

const store = {
  add(productId: number, meter: number, centimeter: number) {
    _lastAddedId = productId;
    const existing = snapshot.find((i) => i.productId === productId);
    commit(
      existing
        ? snapshot.map((i) =>
            i.productId === productId ? { ...i, meter, centimeter } : i,
          )
        : [...snapshot, { productId, meter, centimeter }],
    );
  },
  update(productId: number, meter: number, centimeter: number) {
    commit(
      snapshot.map((i) =>
        i.productId === productId ? { ...i, meter, centimeter } : i,
      ),
    );
  },
  remove(productId: number) {
    commit(snapshot.filter((i) => i.productId !== productId));
  },
  clear() {
    commit([]);
  },
};

/* ---- context wrapper ---- */

const CartContext = createContext<CartContextValue | null>(null);

const DEFAULT_PRICING: SitePricing = { rules: [], shipping: { freeEverywhere: true, rules: [] }, methodPrice: 0, strings: {} };

export function CartProvider({ children, pricing = DEFAULT_PRICING }: { children: ReactNode; pricing?: SitePricing }) {
  const items = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const value = useMemo<CartContextValue>(() => {
    const productFor = (item: CartItem) =>
      products.find((p) => p.id === item.productId);
    const qtyOf = (item: CartItem) => {
      const p = productFor(item);
      return p?.unit === "متر" ? item.meter + item.centimeter / 100 : item.meter;
    };
    const price = (product: Product, qty?: number) => priceOf(product, pricing.rules, qty ?? (product.limit || 1));
    const lineTotal = (item: CartItem) => {
      const p = productFor(item);
      if (!p) return 0;
      return Math.round(price(p, qtyOf(item)).unit * qtyOf(item));
    };
    const subtotal = items.reduce((sum, i) => sum + lineTotal(i), 0);
    const cartDiscount = cartTierDiscount(subtotal, pricing.rules);
    const total = Math.max(0, subtotal - cartDiscount.toman);
    const lines = items.map((i) => ({ product: productFor(i)!, qty: qtyOf(i) })).filter((l) => l.product);
    const meters = lines.reduce((s, l) => s + (l.product.unit === "متر" ? l.qty : 0), 0);
    const shipping = shippingFor({ subtotal: total, meters, lines, methodPrice: pricing.methodPrice }, pricing.shipping);

    return {
      items,
      productFor,
      qtyOf,
      lineTotal,
      priceOf: price,
      add: store.add,
      update: store.update,
      remove: store.remove,
      clear: store.clear,
      count: items.length,
      subtotal,
      cartDiscount,
      cartHint: cartTierHint(subtotal, pricing.rules),
      total,
      shipping,
      strings: pricing.strings,
      pricing,
    };
  }, [items, pricing]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

/** Site microcopy (admin → تنظیمات → متن‌ها) with a fallback. */
export function useStrings() {
  const { strings } = useCart();
  return (key: string, fallback: string, arg?: string) => (strings[key] ?? fallback).replace("%s", arg ?? "");
}
