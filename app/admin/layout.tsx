// Own title scheme for the admin subtree (overrides the storefront's SEO template).
// The sidebar/topbar shell and the sign-in gate live in (shell)/layout.tsx so
// /admin/login and the print sheets render without them.
export const metadata = { title: { absolute: "مدیریت | مدیلیش", template: "%s | مدیریت مدیلیش" } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
