import { getSite } from "@/lib/siteStore";
import NavigationEditor from "@/app/admin/_components/NavigationEditor";

export const metadata = { title: "منو و فوتر" };

export default function AdminNavigationPage() {
  const { header, footer } = getSite().settings;
  return <NavigationEditor header={header} footer={footer} />;
}
