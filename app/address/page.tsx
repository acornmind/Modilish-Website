import { Suspense } from "react";
import AddressClient from "./AddressClient";
import { getSite } from "@/lib/siteStore";

export default async function AddressPage() {
  const { delivery, store, referral } = (await getSite()).settings;
  return (
    <Suspense fallback={<div className="p-4 text-sm">در حال بارگذاری…</div>}>
      <AddressClient delivery={delivery} store={store} referralEnabled={referral.enabled} />
    </Suspense>
  );
}
