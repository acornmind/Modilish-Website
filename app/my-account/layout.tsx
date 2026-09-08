import AccountNav from "./AccountNav";

export const metadata = { title: "حساب کاربری" };

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="woocommerce-account page-bg modi-container min-h-[calc(100vh-64px)] p-4 lg:flex lg:items-start lg:gap-8 lg:px-8 lg:py-10">
      <div className="lg:w-64 lg:shrink-0">
        <AccountNav />
      </div>
      <div className="woocommerce-MyAccount-content mt-4 min-w-0 flex-1 rounded-2xl bg-white p-5 text-sm leading-7 shadow-[0_2px_16px_-10px_rgba(43,39,64,0.35)] lg:mt-0 lg:p-8">
        {children}
      </div>
    </main>
  );
}
