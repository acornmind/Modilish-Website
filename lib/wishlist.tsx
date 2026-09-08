"use client";

import { useSyncExternalStore } from "react";

/** YITH-style wishlist, per the site spec's /my-account/wishlist page. */

const STORAGE_KEY = "modilish-wishlist";
const SERVER: number[] = [];
let snapshot: number[] = SERVER;
const listeners = new Set<() => void>();
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) snapshot = JSON.parse(raw) as number[];
  } catch {
    /* ignore */
  }
}

function commit(next: number[]) {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function toggleWishlist(productId: number) {
  load();
  commit(
    snapshot.includes(productId)
      ? snapshot.filter((id) => id !== productId)
      : [...snapshot, productId],
  );
}

export function clearWishlist() {
  commit([]);
}

export function useWishlist() {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return snapshot;
    },
    () => SERVER,
  );
}
