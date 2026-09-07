import React from 'react';
import { FileText, Heart, Wifi, TrendingUp } from 'lucide-react';
import useIsDark from '../../lib/useIsDark';

const STATS_CONFIG = [
  {
    title: 'Total Posts',
    icon: FileText,
    gradient: 'from-blue-500 to-cyan-500',
    glowDark: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    getValue: (posts) => posts.length,
  },
  {
    title: 'Online Now',
    icon: Wifi,
    gradient: 'from-emerald-500 to-teal-500',
    glowDark: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    getValue: (_, online) => online,
  },
  {
    title: 'Total Likes',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-500',
    glowDark: 'shadow-[0_0_30px_rgba(244,63,94,0.15)]',
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
    getValue: (posts) => posts.reduce((acc, p) => acc + p.likes, 0),
  },
];

const AdminStats = ({ posts, onlineUsers }) => {
  const isDark = useIsDark();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {STATS_CONFIG.map((stat, i) => {
        const Icon = stat.icon;
        const value = stat.getValue(posts, onlineUsers);
        return (
          <div
            key={i}
            className={`group relative p-5 rounded-2xl border backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] ${isDark ? `bg-white/[0.03] border-white/8 hover:border-white/15 ${stat.glowDark}` : `bg-white/60 border-white/60 shadow-glass hover:shadow-glass-lg`}`}
          >
            {/* Gradient accent line at top */}
            <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${stat.gradient} opacity-40 group-hover:opacity-70 transition-opacity`} />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isDark ? stat.iconBg : 'bg-gray-100'}`}>
                  <Icon size={22} className={isDark ? stat.iconColor : 'text-gray-600'} />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {stat.title}
                  </p>
                  <p className={`text-3xl font-extrabold tracking-tight mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {value.toLocaleString()}
                  </p>
                </div>
              </div>
              <TrendingUp size={16} className={`${isDark ? 'text-gray-700' : 'text-gray-300'} group-hover:text-emerald-400 transition-colors`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminStats;
