"use client";

import { useSyncExternalStore } from "react";

/* A single shared 1s clock. getSnapshot must return a stable value between
   ticks, so we cache `nowMs` and only advance it inside the interval. */
let nowMs = 0;
const clockListeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  clockListeners.add(listener);
  if (timer === null) {
    nowMs = Date.now();
    timer = setInterval(() => {
      nowMs = Date.now();
      clockListeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => nowMs;
const getServerSnapshot = () => 0;

/** Next occurrence of the given weekday at 23:59:59, derived purely from `now`. */
function nextWeekday(now: number, weekday: number) {
  const d = new Date(now);
  const delta = (weekday - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  d.setHours(23, 59, 59, 0);
  return d.getTime();
}

function parts(distance: number) {
  const d = Math.max(0, distance);
  return {
    days: Math.floor(d / (1000 * 60 * 60 * 24)),
    hours: Math.floor((d % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((d % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((d % (1000 * 60)) / 1000),
  };
}

/**
 * Ported from assets/js/mobile.js get_lottery_countdown_timer.
 * Counts down to the next occurrence of `weekday` (0=Sunday … 5=Friday).
 * Renders zeros on the server; the client clock takes over on hydration.
 */
export default function CountDown({ weekday = 5 }: { weekday?: number }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const remaining = now === 0 ? 0 : nextWeekday(now, weekday) - now;
  const { days, hours, minutes, seconds } = parts(remaining);
  const fa = (n: number) => n.toLocaleString("fa-IR");

  return (
    <div className="countDown" suppressHydrationWarning>
      <div className="seconds">
        <span className="value">{fa(seconds)}</span>
        <span className="label">ثانیه</span>
      </div>
      <div className="divider">:</div>
      <div className="minutes">
        <span className="value">{fa(minutes)}</span>
        <span className="label">دقیقه</span>
      </div>
      <div className="divider">:</div>
      <div className="hours">
        <span className="value">{fa(hours)}</span>
        <span className="label">ساعت</span>
      </div>
      <div className="divider">:</div>
      <div className="day">
        <span className="value">{fa(days)}</span>
        <span className="label">روز</span>
      </div>
    </div>
  );
}
