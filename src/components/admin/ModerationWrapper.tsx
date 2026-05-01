'use client';

import * as React from 'react';
import { ReviewQueue } from './ReviewQueue';
import { Review } from '../../lib/models/review';
import { useRouter } from 'next/navigation';

export function ModerationWrapper({ initialReviews }: { initialReviews: Review[] }) {
  const [reviews, setReviews] = React.useState(initialReviews);
  const router = useRouter();

  const handleModerate = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        // Optimistic update: remove from current view
        setReviews(prev => prev.filter(r => r.id !== id));
        router.refresh();
      }
    } catch (err) {
      console.error("Moderation failed:", err);
    }
  };

  return <ReviewQueue reviews={reviews} onModerate={handleModerate} />;
}
