import { getMessages, getQuestions, getReviews } from "@/lib/orderStore";
import { getSite } from "@/lib/siteStore";
import ReviewsPanel from "@/app/admin/_components/ReviewsPanel";

export const metadata = { title: "دیدگاه‌ها و پیام‌ها" };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initial = (["reviews", "questions", "messages"] as const).find((t) => t === tab);
  return <ReviewsPanel reviews={getReviews()} questions={getQuestions()} messages={getMessages()} settings={getSite().settings.reviews} initialTab={initial} />;
}
