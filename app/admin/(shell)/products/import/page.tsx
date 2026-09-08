import { products } from "@/lib/products";
import { ensureHydrated } from "@/lib/productStore";
import { materials } from "@/lib/taxonomy";
import ImportWizard from "@/app/admin/_components/ImportWizard";

export const metadata = { title: "درون‌ریزی محصولات" };

// §4.3.4 — CSV in, mapping, preview, then create/update in one go.
export default function AdminImportPage() {
  ensureHydrated();
  return <ImportWizard existingCodes={products.map((p) => p.slug)} materials={materials.map((m) => m.name)} />;
}
