import React from 'react';
import { BookOpen, Shield, AlertTriangle, Trash2, Clock, UserX, Globe } from 'lucide-react';
import useIsDark from '../../lib/useIsDark';

const SECTIONS = [
  {
    title: 'Content Moderation',
    icon: Shield,
    color: 'from-blue-500 to-cyan-500',
    iconColor: 'text-blue-400',
    content: 'Use the Moderation Table to review all posts. Search by username or keywords, filter by "Reported" status, or filter by time.',
  },
  {
    title: 'Reporting Queue',
    icon: AlertTriangle,
    color: 'from-amber-500 to-orange-500',
    iconColor: 'text-amber-400',
    content: 'Posts reported by community members appear in the "Reported" tab. Approve to clear the report or Delete to remove the post.',
  },
  {
    title: 'User Management',
    icon: UserX,
    color: 'from-violet-500 to-purple-500',
    iconColor: 'text-violet-400',
    content: 'The "RESET" button unlocks a user\'s name and clears their post history. Use if a user wants to change identity or hit rate limits.',
  },
  {
    title: 'Word Blacklist',
    icon: Globe,
    color: 'from-red-500 to-rose-500',
    iconColor: 'text-red-400',
    content: 'Add words to the blacklist to prevent them from being used in usernames. Helps keep the community clean and professional.',
  },
  {
    title: 'Purge vs Nuclear',
    icon: Trash2,
    color: 'from-pink-500 to-fuchsia-500',
    iconColor: 'text-pink-400',
    content: '"Purge Expired" cleans up old posts. "Nuclear Reset" wipes ALL posts and ALL name locks. Use with extreme caution!',
  },
  {
    title: 'Real-time Updates',
    icon: Clock,
    color: 'from-emerald-500 to-teal-500',
    iconColor: 'text-emerald-400',
    content: 'The dashboard updates in real-time via Supabase subscriptions. New posts, reports, and postcards appear automatically.',
  },
];

const AdminGuidelines = () => {
  const isDark = useIsDark();

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border backdrop-blur-xl p-6 transition-all duration-300 ${isDark ? 'bg-white/[0.03] border-white/8' : 'bg-white/60 border-white/60 shadow-glass'}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-xl ${isDark ? 'bg-violet-500/15' : 'bg-violet-100'}`}>
            <BookOpen size={18} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
          </div>
          <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Administrator Guidelines
          </h2>
        </div>
        <p className={`text-sm mb-6 ml-[52px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          Follow these guidelines to maintain a healthy and safe anonymous environment.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className={`group relative p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${isDark ? 'bg-white/[0.02] border-white/6 hover:border-white/12 hover:shadow-[0_0_25px_rgba(139,92,246,0.05)]' : 'bg-white/40 border-gray-100 hover:border-gray-200 hover:shadow-md'}`}
              >
                {/* Gradient accent line */}
                <div className={`absolute top-0 left-5 right-5 h-px bg-gradient-to-r ${s.color} opacity-0 group-hover:opacity-40 transition-opacity`} />

                <div className="flex items-center gap-3 mb-3">
                  <Icon size={18} className={isDark ? s.iconColor : 'text-gray-600'} />
                  <h3 className={`text-sm font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    {s.title}
                  </h3>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {s.content}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`text-center py-4 rounded-2xl border border-dashed transition-colors ${isDark ? 'border-white/8 text-gray-600' : 'border-gray-200 text-gray-400'}`}>
        <p className="text-xs italic">
          "Anonymous freedom is a privilege, not a right. Moderate with fairness."
        </p>
      </div>
    </div>
  );
};

export default AdminGuidelines;
