"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

/**
 * Tiny global toast queue — lets any client component confirm an action
 * ("added to cart", "saved to wishlist") without navigating away.
 */

export type Toast = {
  id: number;
  message: string;
  action?: { label: string; href: string };
};

const SERVER: Toast[] = [];
let snapshot: Toast[] = SERVER;
const listeners = new Set<() => void>();
let seq = 0;

function commit(next: Toast[]) {
  snapshot = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function toast(message: string, action?: Toast["action"]) {
  const id = ++seq;
  commit([...snapshot, { id, message, action }].slice(-3));
  setTimeout(() => commit(snapshot.filter((t) => t.id !== id)), 3500);
}

export function useToasts() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER,
  );
}

export function Toaster() {
  const items = useToasts();
  if (items.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[7.5rem] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex w-full max-w-[368px] items-center justify-between gap-3 rounded-xl bg-[#2b2740] px-4 py-3 text-xs text-white shadow-[0_8px_24px_-8px_rgba(43,39,64,0.6)]"
        >
          <span className="leading-6">{t.message}</span>
          {t.action && (
            <Link
              href={t.action.href}
              className="shrink-0 rounded-lg bg-white/15 px-3 py-1.5 font-bold text-white hover:bg-white/25"
            >
              {t.action.label}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
