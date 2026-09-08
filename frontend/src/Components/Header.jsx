import React from 'react';
import { Search, PenLine, Mail, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';

const Header = ({ openModal, searchQuery, setSearchQuery }) => {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50">
      {/* Gradient glow line under header */}
      <div className="bg-white/55 backdrop-blur-2xl border-b border-white/60 shadow-glass">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">

          {/* Logo — click returns to the dashboard feed */}
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 sm:gap-2.5 group shrink-0" title="Back to Feed">
            <Logo size={32} className="sm:hidden group-hover:scale-105 transition-all duration-300" />
            <Logo size={42} className="hidden sm:block group-hover:scale-105 group-hover:rotate-6 transition-all duration-300" />
            <span className="hidden xs:block sm:text-2xl text-lg font-bold bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-transparent bg-clip-text tracking-tight">
              VentSpace
            </span>
          </button>

          {/* Search (tablet / laptop) */}
          <div className="flex-1 max-w-xl hidden sm:block">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 group-focus-within:text-purple-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search thoughts, moods, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-5 py-2.5 rounded-full bg-white/80 border border-purple-100/70 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60 focus:border-transparent focus:bg-white text-sm transition-all placeholder-purple-300 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-purple-100 text-purple-400 hover:bg-purple-200 hover:text-purple-600 flex items-center justify-center text-xs font-bold transition-all"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Nav actions (labels only on laptop+; icons-only on tablets/phones) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <button
              onClick={() => navigate('/postcard')}
              className="flex items-center gap-2 px-2.5 lg:px-4 py-2 sm:py-2.5 rounded-full text-sm font-semibold border border-pink-200/80 bg-white/70 text-pink-500 hover:bg-pink-50 hover:border-pink-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              title="Postcard"
            >
              <Mail size={16} />
              <span className="hidden lg:inline">Postcard</span>
            </button>
            <button
              onClick={() => navigate('/postcard-wall')}
              className="flex items-center gap-2 px-2.5 lg:px-4 py-2 sm:py-2.5 rounded-full text-sm font-semibold border border-purple-200/80 bg-white/70 text-purple-500 hover:bg-purple-50 hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              title="Postcard Wall"
            >
              🖼️
              <span className="hidden lg:inline">Wall</span>
            </button>
            <button
              onClick={() => navigate('/map')}
              className="flex items-center gap-2 px-2.5 lg:px-4 py-2 sm:py-2.5 rounded-full text-sm font-semibold border border-fuchsia-200/80 bg-white/70 text-fuchsia-600 hover:bg-fuchsia-50 hover:border-fuchsia-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              title="FreeSpace Map"
            >
              <MapPin size={16} />
              <span className="hidden lg:inline">Map</span>
            </button>
            <button
              onClick={openModal}
              className="relative overflow-hidden bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-[length:200%_auto] hover:bg-right text-white px-3.5 lg:px-5 py-2 sm:py-2.5 rounded-full flex items-center gap-2 font-semibold text-sm transition-all duration-500 shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0"
            >
              <PenLine size={17} />
              <span className="hidden lg:inline">Post Something</span>
              <span className="lg:hidden">Post</span>
            </button>
          </div>

        </div>

        {/* Mobile search row */}
        <div className="sm:hidden px-3 pb-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 group-focus-within:text-purple-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search thoughts, moods, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-full bg-white/80 border border-purple-100/70 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/60 focus:border-transparent focus:bg-white text-sm transition-all placeholder-purple-300 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-purple-100 text-purple-400 hover:bg-purple-200 hover:text-purple-600 flex items-center justify-center text-xs font-bold transition-all"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-300/70 to-transparent" />
    </header>
  );
};

export default Header;
