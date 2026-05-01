'use client';

import * as React from 'react';
import { Review } from '../../lib/models/review';
import { Badge } from '../ui/Badge';
import { Check, X, Book } from 'lucide-react';

interface ReviewQueueProps {
  reviews: Review[];
  onModerate: (id: string, status: 'approved' | 'rejected') => Promise<void>;
}

export function ReviewQueue({ reviews, onModerate }: ReviewQueueProps) {
  if (!reviews.length) {
    return (
      <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <h3 className="text-slate-800 font-bold">Queue Empty</h3>
        <p className="text-slate-500 text-sm mt-1">No pending content reviews at this time.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col h-full hover:border-blue-200 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <Badge variant="pending">Pending Review</Badge>
            <div className="flex items-center text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded">
              <Book className="w-3 h-3 mr-1" />
              {review.sourceReference}
            </div>
          </div>
          
          <p className="text-sm text-slate-700 flex-1 leading-relaxed">
            {review.content}
          </p>

          <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => onModerate(review.id!, 'approved')}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => onModerate(review.id!, 'rejected')}
              className="flex-1 flex items-center justify-center gap-1 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
