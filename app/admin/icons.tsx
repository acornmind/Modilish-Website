// Line-icon set for the admin shell — same visual language as
// app/my-account/AccountNav.tsx (24x24, 1.6 stroke, currentColor).
export type AdminIconName =
  | "dashboard"
  | "orders"
  | "products"
  | "attributes"
  | "home"
  | "offer"
  | "magazine"
  | "pages"
  | "customers"
  | "reviews"
  | "marketing"
  | "sms"
  | "navigation"
  | "media"
  | "settings"
  | "search"
  | "bell"
  | "external"
  | "hamburger"
  | "close"
  | "chevronLeft"
  | "user";

export default function AdminIcon({
  name,
  size = 18,
  className,
}: {
  name: AdminIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
    >
      <IconPath name={name} />
    </svg>
  );
}

function IconPath({ name }: { name: AdminIconName }) {
  const c = "currentColor";
  switch (name) {
    case "dashboard":
      return (
        <path
          d="M4 4h7v7H4V4zm9 0h7v4h-7V4zm0 7h7v9h-7v-9zM4 14h7v6H4v-6z"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "orders":
      return (
        <path
          d="M6 2h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM8 9h8M8 13h8M8 17h5"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      );
    case "products":
      return (
        <path
          d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2L12 3zM4 7.2L12 11l8-3.8M12 11v10"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "attributes":
      return (
        <path
          d="M3 12L12 3h6a2 2 0 012 2v6l-9 9a1.5 1.5 0 01-2 0l-6-6a1.5 1.5 0 010-2z M16.5 7.5a1 1 0 100-2 1 1 0 000 2z"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "home":
      return (
        <path
          d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1v-9z"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "offer":
      return (
        <path
          d="M20 12l-8 8-9-9V4h7l9 9a1.4 1.4 0 010 2z M8 8.5a1 1 0 100-2 1 1 0 000 2z"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "magazine":
      return (
        <path
          d="M4 4h13a2 2 0 012 2v13a1 1 0 01-1 1H6a2 2 0 01-2-2V4zM7 8h7M7 11.5h7M7 15h4"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      );
    case "pages":
      return (
        <path
          d="M6 3h8l4 4v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v4h4M8 12h8M8 16h5"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "customers":
      return (
        <path
          d="M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16.5 11a3 3 0 100-6M21 20c0-2.6-1.8-4.5-4-5.2"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      );
    case "reviews":
      return (
        <path
          d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3z"
          fill={c}
        />
      );
    case "marketing":
      return (
        <path
          d="M3 10v4a1 1 0 001 1h2l9 4V5L6 9H4a1 1 0 00-1 1zM15 8.5v7M19 7v10"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      );
    case "sms":
      return (
        <path
          d="M4 5h16v11H8l-4 4V5z M8 9.5h8M8 12.5h5"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      );
    case "navigation":
      return (
        <path
          d="M4 6h16M4 12h16M4 18h10"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      );
    case "media":
      return (
        <path
          d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM3 16l5-5 4 4 3-3 6 6M9 9.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case "settings":
      return (
        <path
          d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 12a7.4 7.4 0 01-.1 1.3l2 1.6-2 3.4-2.4-.9a7.5 7.5 0 01-2.2 1.3l-.4 2.5H10l-.4-2.5a7.5 7.5 0 01-2.2-1.3l-2.4.9-2-3.4 2-1.6a7.4 7.4 0 010-2.6l-2-1.6 2-3.4 2.4.9a7.5 7.5 0 012.2-1.3L10 2.6h4l.4 2.5a7.5 7.5 0 012.2 1.3l2.4-.9 2 3.4-2 1.6c.1.4.1.9.1 1.3z"
          fill="none"
          stroke={c}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      );
    case "search":
      return (
        <path
          d="M11 4a7 7 0 105.2 11.7l3.6 3.6 1.4-1.4-3.6-3.6A7 7 0 0011 4zm0 2a5 5 0 110 10 5 5 0 010-10z"
          fill={c}
        />
      );
    case "bell":
      return (
        <path
          d="M12 3a5 5 0 00-5 5v3.4c0 .6-.2 1.2-.6 1.7L5 15.5h14l-1.4-2.4a2.8 2.8 0 01-.6-1.7V8a5 5 0 00-5-5zM10 18a2 2 0 004 0"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "external":
      return (
        <path
          d="M9 5h10v10M19 5L9 15M6 5H5a1 1 0 00-1 1v13a1 1 0 001 1h13a1 1 0 001-1v-1"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "hamburger":
      return (
        <path
          d="M4 6h16M4 12h16M4 18h16"
          fill="none"
          stroke={c}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      );
    case "close":
      return (
        <path
          d="M5 5l14 14M19 5L5 19"
          fill="none"
          stroke={c}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      );
    case "chevronLeft":
      return (
        <path
          d="M14.5 5l-7 7 7 7"
          fill="none"
          stroke={c}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "user":
    default:
      return (
        <path
          d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8c0-3.9 3.1-6 7-6s7 2.1 7 6"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
        />
      );
  }
}
