import React, { useState } from 'react';
import { Settings, ShieldAlert, Plus, X, Clock } from 'lucide-react';
import useIsDark from '../../lib/useIsDark';

const ControlPanel = ({ settings, onSettingsChange, blacklistedWords, onAddWord, onRemoveWord }) => {
  const [newWord, setNewWord] = useState('');
  const isDark = useIsDark();

  const handleAutoDeleteChange = (e) => {
    onSettingsChange({ ...settings, autoDeleteHours: Number(e.target.value) });
  };

  const handleAddBadWord = (e) => {
    e.preventDefault();
    if (newWord.trim()) {
      onAddWord(newWord.trim());
      setNewWord('');
    }
  };

  return (
    <div className={`rounded-2xl border backdrop-blur-xl p-6 h-fit transition-all duration-300 ${isDark ? 'bg-white/[0.03] border-white/8' : 'bg-white/60 border-white/60 shadow-glass'}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-2 rounded-xl ${isDark ? 'bg-violet-500/15' : 'bg-violet-100'}`}>
          <Settings size={18} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
        </div>
        <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Control Panel
        </h2>
      </div>

      <div className="space-y-7">
        {/* Auto-Delete Timer */}
        <div>
          <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Clock size={14} className={isDark ? 'text-blue-400' : 'text-blue-500'} />
            Auto-Delete Timer
          </label>

          <div className={`relative rounded-2xl border p-4 transition-all duration-300 ${isDark ? 'bg-white/[0.03] border-white/8' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {settings.autoDeleteHours}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                hours
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="72"
              value={settings.autoDeleteHours}
              onChange={handleAutoDeleteChange}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-violet-500 to-fuchsia-500 accent-violet-500"
            />
            <div className={`flex justify-between mt-1.5 text-[10px] font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              <span>1h</span>
              <span>24h</span>
              <span>48h</span>
              <span>72h</span>
            </div>
          </div>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Posts older than this are automatically purged.
          </p>
        </div>

        {/* Blacklisted Words */}
        <div>
          <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <ShieldAlert size={14} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
            Blacklisted Words
          </label>
          <p className={`text-xs mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Posts containing these words are blocked.
          </p>

          <form onSubmit={handleAddBadWord} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Add word..."
              className={`flex-1 px-3.5 py-2 rounded-xl border text-sm outline-none transition-all duration-300 focus:ring-2 focus:ring-amber-500/30 ${isDark ? 'bg-white/5 border-white/8 text-white placeholder-gray-600 focus:border-amber-500/30' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-amber-300'}`}
            />
            <button
              type="submit"
              disabled={!newWord.trim()}
              className={`p-2 rounded-xl transition-all duration-300 disabled:opacity-30 ${isDark ? 'bg-white/5 border border-white/8 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Plus size={18} />
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {blacklistedWords.map(word => (
              <span
                key={word}
                className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-xl text-xs font-bold transition-all duration-300 ${isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/15 hover:border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
              >
                {word}
                <button
                  onClick={() => onRemoveWord(word)}
                  className={`p-0.5 rounded-lg transition-colors ${isDark ? 'hover:bg-amber-500/20 text-amber-500' : 'hover:bg-amber-100 text-amber-600'}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {blacklistedWords.length === 0 && (
              <p className={`text-xs italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                No words blacklisted
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
