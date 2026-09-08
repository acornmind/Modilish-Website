"use client";

import { useSyncExternalStore } from "react";

/**
 * What the shopper entered during checkout (phone verification + address
 * step), kept in localStorage so the payment page can recap it and the
 * account "addresses" page can show it. Demo only — nothing leaves the
 * browser.
 */

export type DeliveryMethod = "shipping" | "no-shipping";

export type CheckoutInfo = {
  phone: string;
  name: string;
  melicode: string;
  mobile: string;
  state: string;
  city: string;
  landline: string;
  postcode: string;
  address: string;
  method: DeliveryMethod;
  pickupDay: string;
  pickupHour: string;
  /** «معرف» — referral code (§4.11.7), optional */
  referral?: string;
  /** coupon applied in the cart, carried to checkout */
  coupon?: string;
};

const STORAGE_KEY = "modilish-checkout";
const SERVER: CheckoutInfo | null = null;
let snapshot: CheckoutInfo | null = SERVER;
const listeners = new Set<() => void>();
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) snapshot = JSON.parse(raw) as CheckoutInfo;
  } catch {
    /* ignore */
  }
}

function commit(next: CheckoutInfo | null) {
  snapshot = next;
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getCheckout(): CheckoutInfo | null {
  load();
  return snapshot;
}

export function saveCheckout(patch: Partial<CheckoutInfo>) {
  load();
  const base: CheckoutInfo = snapshot ?? {
    phone: "",
    name: "",
    melicode: "",
    mobile: "",
    state: "تهران",
    city: "",
    landline: "",
    postcode: "",
    address: "",
    method: "shipping",
    pickupDay: "",
    pickupHour: "",
  };
  commit({ ...base, ...patch });
}

export function useCheckout() {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return snapshot;
    },
    () => SERVER,
  );
}

/* ---- validation helpers shared by the address form ---- */

const toLatinDigits = (s: string) =>
  s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");

/** Accepts 09xxxxxxxxx, 9xxxxxxxxx, +989…, 00989… — returns 09xxxxxxxxx or "". */
export function normalizeMobile(input: string): string {
  let d = toLatinDigits(input);
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("9")) d = "0" + d;
  return /^09\d{9}$/.test(d) ? d : "";
}

export const isPostcode = (s: string) => /^\d{10}$/.test(toLatinDigits(s));
export const isMelicode = (s: string) => /^\d{10}$/.test(toLatinDigits(s));
