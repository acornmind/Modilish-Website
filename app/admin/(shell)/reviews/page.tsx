import { getMessages, getQuestions, getReviews } from "@/lib/orderStore";
import { getSite } from "@/lib/siteStore";
import ReviewsPanel from "@/app/admin/_components/ReviewsPanel";

export const metadata = { title: "دیدگاه‌ها و پیام‌ها" };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initial = (["reviews", "questions", "messages"] as const).find((t) => t === tab);
  const [reviews, questions, messages, site] = await Promise.all([getReviews(), getQuestions(), getMessages(), getSite()]);
  return <ReviewsPanel reviews={reviews} questions={questions} messages={messages} settings={site.settings.reviews} initialTab={initial} />;
}
