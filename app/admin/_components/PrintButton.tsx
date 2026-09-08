"use client";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center justify-center rounded-xl bg-modi-purple-800 px-4 text-xs font-bold text-white hover:bg-modi-purple-500">
      چاپ
    </button>
  );
}
