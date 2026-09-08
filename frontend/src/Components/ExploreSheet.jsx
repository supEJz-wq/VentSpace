import React, { useEffect } from 'react';
import { X, Rainbow } from 'lucide-react';
import RightSidebar from './RightSidebar';

// Mobile "Explore" bottom sheet: topics + activity + vibe summary for screens
// where the sidebars are hidden (lg+ only). Mounted ONLY while open so the
// sidebar headings stay hidden otherwise (mobile e2e relies on that).
const ExploreSheet = ({
  onClose,
  activeTag,
  onTagClick,
  activeContributor,
  onContributorClick,
  recentActivity,
  recentTopics,
  moodData,
}) => {
  // Escape closes; lock body scroll while open.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Picking a filter navigates the feed — close the sheet so results show.
  const pick = (fn) => (...args) => { fn(...args); onClose(); };

  const total = moodData.reduce((sum, m) => sum + m.count, 0);
  const dominant = [...moodData].sort((a, b) => b.count - a.count)[0];
  const topShare = total > 0 ? Math.round((dominant.count / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Explore topics and activity">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="absolute bottom-0 inset-x-0 sm:max-w-lg sm:mx-auto max-h-[85vh] overflow-y-auto rounded-t-3xl bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 border-t border-x border-white/60 shadow-glass-lg px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] animate-in fade-in slide-in-from-bottom-8 duration-300">
        <div className="w-10 h-1 rounded-full bg-purple-200 mx-auto my-2" aria-hidden="true" />
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-gray-800 tracking-tight">Explore</h2>
          <button
            onClick={onClose}
            aria-label="Close explore panel"
            className="w-9 h-9 rounded-full bg-white/70 border border-purple-100 text-gray-500 hover:text-gray-800 flex items-center justify-center active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Compact vibe summary (full donut lives in the desktop sidebar) */}
        <div className="glass-card p-4 mb-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-100 to-amber-100 flex items-center justify-center shrink-0">
            <Rainbow size={18} className="text-pink-500" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Vibe</p>
            <p className="text-sm font-bold text-gray-800 truncate">
              {total > 0 ? `${dominant.name} · ${topShare}% of ${total} thought${total !== 1 ? 's' : ''}` : 'No vibes yet — post the first thought!'}
            </p>
          </div>
        </div>

        <RightSidebar
          activeTag={activeTag}
          onTagClick={pick(onTagClick)}
          activeContributor={activeContributor}
          onContributorClick={pick(onContributorClick)}
          recentActivity={recentActivity}
          recentTopics={recentTopics}
        />
      </div>
    </div>
  );
};

export default ExploreSheet;
