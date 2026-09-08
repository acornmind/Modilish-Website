"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A `<select>` look-alike whose option list always opens *upward*.
 *
 * The real `<select>` this replaces sits inside the buy panel, which is
 * pinned to the bottom of the screen — there's rarely enough room below it,
 * and browsers don't reliably auto-flip a native select's popup, so the
 * list opened downward and ran off-screen. This one is positioned with
 * `bottom-full`, so it's never a viewport-dependent guess.
 */
export default function UpSelect({
  value,
  options,
  format,
  onChange,
  className = "",
}: {
  value: number;
  options: number[];
  format: (n: number) => string;
  onChange: (n: number) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-16 items-center justify-center rounded-lg border border-modi-gray-500 bg-white text-center text-sm text-[#2b2740]"
      >
        {format(value)}
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute bottom-full left-0 z-20 mb-1 max-h-44 w-16 overflow-y-auto rounded-lg border border-modi-gray-500 bg-white py-1 shadow-[0_-8px_24px_-8px_rgba(43,39,64,0.3)]"
        >
          {options.map((o) => (
            <li key={o} role="option" aria-selected={o === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(o);
                  setOpen(false);
                }}
                className={`flex h-8 w-full items-center justify-center text-sm ${
                  o === value ? "bg-modi-purple-200 font-bold text-modi-purple-800" : "text-[#2b2740]"
                }`}
              >
                {format(o)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
