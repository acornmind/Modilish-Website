const steps = ["سبد خرید", "آدرس و ارسال", "پرداخت"];

/** سبد → آدرس → پرداخت progress strip shown at the top of each checkout step. */
export default function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="modi-container flex items-center justify-between gap-2 px-5 py-3 text-[11px] lg:max-w-xl lg:px-8 lg:text-xs">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                active
                  ? "bg-modi-purple-800 text-white"
                  : done
                    ? "bg-modi-purple-500 text-white"
                    : "bg-modi-gray-500 text-modi-gray-900"
              }`}
            >
              {done ? "✓" : n.toLocaleString("fa-IR")}
            </span>
            <span
              className={`whitespace-nowrap ${
                active ? "font-bold text-[#2b2740]" : "text-modi-gray-900"
              }`}
            >
              {label}
            </span>
            {n < steps.length && (
              <span
                className={`mx-1 h-px flex-1 ${done ? "bg-modi-purple-500" : "bg-modi-gray-500"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
