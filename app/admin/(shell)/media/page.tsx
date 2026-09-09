import { listMedia } from "@/lib/productStore";
import MediaGrid from "@/app/admin/_components/MediaGrid";

export const metadata = { title: "رسانه" };

export default async function AdminMediaPage() {
  return <MediaGrid items={await listMedia()} />;
}
