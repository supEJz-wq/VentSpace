import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { SlidersHorizontal, Rainbow, Heart } from 'lucide-react';
import { moods } from '../Data/mockData';

const COLORS = { Happy: "#FFD700", Sad: "#6CA6CD", Hopeful: "#77DD77", Anxious: "#B19CD9", Angry: "#FF6961" };
const MOOD_ACCENTS = {
  'All Thoughts': 'from-purple-500 to-fuchsia-500',
  'My Posts': 'from-sky-400 to-blue-500',
  Happy: 'from-amber-300 to-yellow-500',
  Sad: 'from-sky-300 to-blue-400',
  Angry: 'from-red-300 to-rose-500',
  Hopeful: 'from-green-300 to-emerald-500',
  Anxious: 'from-violet-300 to-purple-500',
};

const LeftSidebar = ({ activeMood, setActiveMood, moodData }) => {
  const totalPosts = moodData.reduce((sum, m) => sum + m.count, 0);
  const dominantMood = [...moodData].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-6">

      {/* ========== MOOD FILTER ========== */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
            <SlidersHorizontal size={15} className="text-purple-500" />
          </span>
          <h2 className="font-bold text-gray-700 tracking-tight">Mood Filter</h2>
        </div>

        <div className="space-y-1.5">
          {moods.map((mood) => {
            const isActive = activeMood === mood.name;
            const count = moodData.find(m => m.name === mood.name)?.count;
            return (
              <button
                key={mood.name}
                onClick={() => setActiveMood(mood.name)}
                className={`relative w-full text-left px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 transition-all duration-300 group overflow-hidden ${isActive
                    ? 'bg-white text-purple-700 font-semibold shadow-glass ring-2 ring-fuchsia-300/60 scale-[1.02]'
                    : 'hover:bg-white/70 text-gray-600 hover:translate-x-1'
                  }`}
              >
                {/* Active gradient bar on the left */}
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-full bg-gradient-to-b transition-all duration-300 ${MOOD_ACCENTS[mood.name] || 'from-purple-400 to-pink-400'} ${isActive ? 'opacity-100' : 'opacity-0'}`}
                />
                <div className="flex items-center gap-3 pl-1">
                  <span className={`text-xl transition-transform duration-300 ${isActive ? 'scale-125 -rotate-12' : 'group-hover:scale-125 group-hover:-rotate-12'}`}>
                    {mood.icon}
                  </span>
                  <span className="text-sm">{mood.name}</span>
                </div>
                {typeof count === 'number' && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center transition-colors ${isActive ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-sm' : 'bg-purple-50 text-purple-400 group-hover:bg-purple-100'
                    }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========== TODAY'S VIBE DONUT ========== */}
      <div className="glass-card p-5 relative overflow-hidden">
        {/* Decorative corner blob */}
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-fuchsia-200/40 to-purple-200/40 blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-100 to-amber-100 flex items-center justify-center">
            <Rainbow size={15} className="text-pink-500" />
          </span>
          <h2 className="font-bold text-gray-700 tracking-tight">Today's Vibe</h2>
        </div>

        <div className="relative h-44">
          {totalPosts > 0 ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={moodData.filter(m => m.count > 0)}
                  innerRadius={52}
                  outerRadius={74}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  cornerRadius={6}
                >
                  {moodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} className="stroke-white stroke-2" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : null}

          {/* Donut center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {totalPosts > 0 ? (
              <>
                <span className="text-3xl">{dominantMood && ['Happy', 'Sad', 'Angry', 'Hopeful', 'Anxious'].includes(dominantMood.name) ? moods.find(m => m.name === dominantMood.name)?.icon : '✨'}</span>
                <span className="text-xs font-semibold text-gray-500 mt-0.5">{totalPosts} thought{totalPosts !== 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <Heart size={20} className="text-purple-300" />
                <span className="text-[11px] font-medium text-gray-400 mt-1">Be the first vibe</span>
              </>
            )}
          </div>
        </div>

        {/* Legend with progress bars */}
        <div className="mt-3 space-y-2">
          {moodData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: COLORS[entry.name] }} />
              <span className="text-[11px] font-semibold text-gray-600 w-14">{entry.name}</span>
              <div className="flex-1 h-1.5 rounded-full bg-purple-50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${entry.value}%`, backgroundColor: COLORS[entry.name] }}
                />
              </div>
              <span className="text-[11px] font-bold text-gray-400 w-8 text-right">{entry.value}%</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default LeftSidebar;
