import { useState } from 'react';
import { X, MessageSquareHeart, Star } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  answerId?: string;
}

export default function FeedbackModal({ isOpen, onClose, answerId }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerId: answerId || "general-chat",
          rating,
          comment: feedback
        })
      });
      
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFeedback('');
        setRating(0);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Failed to submit feedback", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-lg border border-primary/30">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold font-space-grotesk text-slate-100">Rate Response</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-400/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-400/20">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <p className="text-xl font-bold text-slate-100">Feedback Received!</p>
              <p className="text-sm text-slate-400 font-medium">Your rating helps us improve AcaDoc.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2 text-center">
                <label className="block font-label-caps mb-2 text-slate-300">How accurate was this response?</label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1 transition-all hover:scale-110"
                    >
                      <Star 
                        className={`w-8 h-8 ${
                          (hoveredRating || rating) >= star 
                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" 
                            : "text-slate-600"
                        } transition-all duration-200`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block font-label-caps text-slate-300">
                  Additional comments (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what was good or what was missing..."
                  className="w-full h-24 p-4 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none text-slate-200 placeholder:text-slate-500 text-sm transition-all"
                />
              </div>
              
              <button
                type="submit"
                disabled={rating === 0 || isSubmitting}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none transition-all uppercase tracking-widest text-xs"
              >
                {isSubmitting ? "Submitting..." : "Submit Rating"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
