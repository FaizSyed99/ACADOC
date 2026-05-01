import { ClipboardList } from "lucide-react";
import { ModerationWrapper } from "../../../../src/components/admin/ModerationWrapper";

async function getReviews() {
  const url = `${process.env.NEXTAUTH_URL}/api/admin/reviews`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    console.error("Fetch Reviews Error:", err);
    return [];
  }
}

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-amber-600 mb-1">
          <ClipboardList className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Moderation Queue</span>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Content Review</h1>
        <p className="text-slate-500 mt-2 font-medium">Verify user-submitted textbook summaries before they are finalized in the knowledge base.</p>
      </div>

      <div className="pt-4">
        <ModerationWrapper initialReviews={reviews} />
      </div>
    </div>
  );
}
