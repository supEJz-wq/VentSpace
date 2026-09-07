import React from 'react';
import { Hash, Activity } from 'lucide-react';

const MOOD_EMOJI = {
  Happy: '😊',
  Sad: '😢',
  Angry: '😠',
  Hopeful: '🤞',
  Anxious: '😰',
};

const RANK_STYLES = [
  { badge: 'bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-sm', hover: 'group-hover:text-amber-600' },
  { badge: 'bg-gradient-to-br from-slate-200 to-slate-400 text-white shadow-sm', hover: 'group-hover:text-slate-500' },
  { badge: 'bg-gradient-to-br from-orange-200 to-amber-500 text-white shadow-sm', hover: 'group-hover:text-orange-500' },
];

const RightSidebar = ({ activeTag, onTagClick, activeContributor, onContributorClick, recentActivity, recentTopics }) => {
  return (
    <div className="space-y-6">

      {/* ========== RECENT TOPICS SECTION ========== */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-orange-200/50 to-pink-200/50 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
              <Hash size={15} className="text-orange-500" />
            </span>
            <h2 className="font-bold text-gray-700 tracking-tight">Recent Topics</h2>
          </div>
          <span className="text-lg animate-bounce-soft">🔥</span>
        </div>

        <div className="space-y-1.5">
          {recentTopics.length > 0 ? (
            recentTopics.map((topic, i) => {
              const isActive = activeTag === topic;
              const rank = RANK_STYLES[i];
              return (
                <button
                  key={i}
                  onClick={() => onTagClick(topic)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-300 group ${isActive
                      ? 'bg-gradient-to-r from-purple-100 to-fuchsia-100 ring-2 ring-fuchsia-300/60 shadow-glass'
                      : 'hover:bg-purple-50/70 hover:translate-x-1'
                    }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold shrink-0 ${rank ? rank.badge : 'bg-purple-50 text-purple-400'}`}>
                    {i + 1}
                  </span>
                  <span className={`flex items-center gap-0.5 text-sm font-semibold truncate transition-colors ${isActive ? 'text-purple-700' : rank ? `text-gray-600 ${rank.hover}` : 'text-gray-600 group-hover:text-purple-600'}`}>
                    <Hash size={12} className="opacity-50 shrink-0" />
                    {topic.replace('#', '')}
                  </span>
                </button>
              );
            })
          ) : (
            /* Empty state */
            <div className="text-center py-4">
              <p className="text-3xl mb-2">🌱</p>
              <p className="text-sm text-gray-400 italic leading-snug">No topics yet.<br />Start posting with #hashtags!</p>
            </div>
          )}
        </div>
      </div>

      {/* ========== RECENT ACTIVITY SECTION ========== */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-200/50 to-amber-100/50 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center">
              <Activity size={15} className="text-amber-500" />
            </span>
            <h2 className="font-bold text-gray-700 tracking-tight">Recent Activity</h2>
          </div>
          <span className="text-lg animate-bounce-soft" style={{ animationDelay: '1s' }}>✨</span>
        </div>

        <div className="space-y-1.5">
          {recentActivity.length > 0 ? (
            recentActivity.map((user, i) => {
              const isActive = activeContributor === user.name;
              const medal = ['🥇', '🥈', '🥉'][i];
              return (
                <button
                  key={i}
                  onClick={() => onContributorClick(user.name)}
                  className={`w-full flex items-center justify-between group cursor-pointer px-2 py-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-purple-100 to-fuchsia-100 ring-2 ring-fuchsia-300/60' : 'hover:bg-purple-50/70 hover:translate-x-1'
                    }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {medal ? (
                      <span className="text-lg shrink-0">{medal}</span>
                    ) : (
                      <span className="w-6 text-center text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 shrink-0">
                        #{i + 1}
                      </span>
                    )}
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-xs shadow-md shrink-0 ${isActive ? 'from-fuchsia-400 to-purple-500 text-white scale-110' : 'from-purple-200 to-pink-200 text-purple-700'
                      } transition-transform duration-300`}>
                      {user.name[0]}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-purple-600 transition-colors truncate">
                      {user.name}
                    </span>
                  </div>
                  <span className="text-lg shrink-0" title={`Feeling ${user.mood}`}>
                    {MOOD_EMOJI[user.mood] || '✨'}
                  </span>
                </button>
              );
            })
          ) : (
            /* Empty state */
            <div className="text-center py-4">
              <p className="text-3xl mb-2">🫶</p>
              <p className="text-sm text-gray-400 italic leading-snug">No activity yet.<br />Be the first to post!</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default RightSidebar;
