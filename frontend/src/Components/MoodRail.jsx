import React from 'react';
import { moods } from '../Data/mockData';

// Mobile mood filter: horizontal snap-scroll pill rail (sidebars are lg+ only).
// No section heading here — MOB-2 asserts the sidebar headings stay hidden.
const MoodRail = ({ activeMood, onSelect, moodData }) => {
  return (
    <div
      role="tablist"
      aria-label="Filter by mood"
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x"
    >
      {moods.map((mood) => {
        const isActive = activeMood === mood.name;
        const count = moodData.find((m) => m.name === mood.name)?.count;
        return (
          <button
            key={mood.name}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(mood.name)}
            className={`snap-start shrink-0 flex items-center gap-1.5 pl-3 pr-2.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 active:scale-95 ${
              isActive
                ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-glow-sm'
                : 'bg-white/70 border border-purple-100/70 text-gray-600 hover:bg-white'
            }`}
          >
            <span className="text-base leading-none">{mood.icon}</span>
            {mood.name}
            {typeof count === 'number' && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold min-w-[20px] text-center ${
                isActive ? 'bg-white/25 text-white' : 'bg-purple-50 text-purple-400'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MoodRail;
