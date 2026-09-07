import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Clock } from 'lucide-react';
import { fetchPostcards } from '../lib/api';
import { supabase } from '../lib/supabase';
import Pagination from '../Components/Pagination';
import ThemeToggle from '../Components/ThemeToggle';
import Logo from '../Components/Logo';

// ── HELPERS ──────────────────────────────────────────────────────────────────
const timeAgo = (ts) => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const borderClass = {
  elegant: 'ring-4 ring-white/60 shadow-2xl',
  none: 'shadow-lg',
  dashed: 'border-4 border-dashed border-white/60 shadow-xl',
};

const TEMPLATES = [
  { id: 'classic',  name: 'Classic',  icon: '✉️' },
  { id: 'sunset',   name: 'Sunset',   icon: '🌅' },
  { id: 'ocean',    name: 'Ocean',    icon: '🌊' },
  { id: 'vintage',  name: 'Vintage',  icon: '📜' },
  { id: 'neon',     name: 'Neon',     icon: '💜' },
];

// ── DEMO POSTCARDS (fallback when DB is empty) ──
const MOCK_POSTCARDS = [
  {
    id: 'demo-1', to: 'My Best Friend', from: 'Luna',
    message: 'Thank you for always being there through the thick and thin. You make every day brighter just by being you.',
    bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #f9a8d4, #fbbf24)', bgColor: '#fce7f3',
    textColor: '#78350f', font: "'Georgia', serif", align: 'center',
    stickers: [{ emoji: '🌸', x: 20, y: 25 }, { emoji: '🦋', x: 75, y: 30 }, { emoji: '✨', x: 50, y: 80 }], borderStyle: 'elegant', createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'demo-2', to: 'Mom & Dad', from: 'Your Grateful Kid',
    message: 'No words can express how much I appreciate everything you have done for me. Your love is my foundation.',
    bgType: 'solid', bgColor: '#ede9fe', textColor: '#4c1d95',
    font: "'Georgia', serif", align: 'center',
    stickers: [{ emoji: '❤️', x: 30, y: 20 }, { emoji: '🌿', x: 70, y: 75 }], borderStyle: 'elegant', createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'demo-3', to: 'Stranger Reading This', from: 'A Fellow Human',
    message: 'Hey! Just wanted to remind you that you are doing amazing. Keep going, keep growing, and never forget how much the world needs your light.',
    bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #6ee7b7, #818cf8)', bgColor: '#d1fae5',
    textColor: '#1e3a5f', font: "'Inter', sans-serif", align: 'center',
    stickers: [{ emoji: '💫', x: 25, y: 30 }, { emoji: '🕊️', x: 65, y: 20 }, { emoji: '🌙', x: 80, y: 70 }], borderStyle: 'none', createdAt: Date.now() - 3600000 * 8,
  },
  {
    id: 'demo-4', to: 'Future Me', from: 'Present Me',
    message: 'Remember this moment. Remember how far youve come. Whatever happens next, trust the journey and keep your heart open.',
    bgType: 'solid', bgColor: '#1e293b', textColor: '#e2e8f0',
    font: "'Times New Roman', serif", align: 'left',
    stickers: [{ emoji: '🌙', x: 20, y: 25 }, { emoji: '✨', x: 80, y: 60 }], borderStyle: 'dashed', createdAt: Date.now() - 3600000 * 12,
  },
  {
    id: 'demo-5', to: 'My Dearest Grandma', from: 'With All My Heart',
    message: 'Your stories, your hugs, your cookies — everything about you makes this world a better place. I love you more than words can say.',
    bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #fda4af, #c084fc)', bgColor: '#fce7f3',
    textColor: '#831843', font: "'Georgia', serif", align: 'center',
    stickers: [{ emoji: '🌺', x: 15, y: 20 }, { emoji: '❤️', x: 50, y: 15 }, { emoji: '🎀', x: 80, y: 25 }, { emoji: '🌼', x: 45, y: 75 }], borderStyle: 'elegant', createdAt: Date.now() - 86400000,
  },
  {
    id: 'demo-6', to: 'The Person Who Made My Day', from: 'A Grateful Soul',
    message: 'You held the door open for me this morning and smiled. That tiny act changed the entire trajectory of my day.',
    bgType: 'solid', bgColor: '#fef3c7', textColor: '#78350f',
    font: "'Comic Sans MS', cursive", align: 'center',
    stickers: [{ emoji: '🌼', x: 25, y: 30 }, { emoji: '💛', x: 55, y: 20 }, { emoji: '🍃', x: 75, y: 70 }], borderStyle: 'none', createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'demo-7', to: 'My Rescue Cat Whiskers', from: 'Your Human',
    message: 'You chose me from the shelter that day. Now every morning you wake me up with purrs and I wouldnt trade it for anything.',
    bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #bae6fd, #6d28d9)', bgColor: '#e0f2fe',
    textColor: '#1e1b4b', font: "'Inter', sans-serif", align: 'center',
    stickers: [{ emoji: '🌸', x: 20, y: 25 }, { emoji: '🌿', x: 50, y: 70 }, { emoji: '💕', x: 80, y: 30 }], borderStyle: 'elegant', createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'demo-8', to: 'Everyone Who Believed in Me', from: 'Me, Finally Believing in Myself',
    message: 'I did it. I finally did it. After all those late nights, the doubt, the tears — here I am. This ones for all of us.',
    bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #fef3c7, #f59e0b)', bgColor: '#fef9c3',
    textColor: '#78350f', font: "'Comic Sans MS', cursive", align: 'center',
    stickers: [{ emoji: '🎉', x: 20, y: 20 }, { emoji: '✨', x: 50, y: 15 }, { emoji: '💫', x: 75, y: 25 }, { emoji: '🌟', x: 45, y: 70 }], borderStyle: 'none', createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'demo-9', to: 'My Little Sister', from: 'Big Sis',
    message: 'Watching you grow up has been the greatest privilege. Never stop being curious, kind, and unapologetically you.',
    bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #c084fc, #818cf8)', bgColor: '#ede9fe',
    textColor: '#3b0764', font: "'Inter', sans-serif", align: 'center',
    stickers: [{ emoji: '🎀', x: 25, y: 20 }, { emoji: '🌸', x: 55, y: 70 }, { emoji: '💕', x: 80, y: 25 }], borderStyle: 'elegant', createdAt: Date.now() - 86400000 * 6,
  },
  {
    id: 'demo-10', to: 'The Kind Librarian', from: 'A Book Lover',
    message: 'You always recommended the perfect book at the perfect time. You changed my life one story at a time.',
    bgType: 'solid', bgColor: '#d1fae5', textColor: '#065f46',
    font: "'Georgia', serif", align: 'left',
    stickers: [{ emoji: '🍃', x: 20, y: 25 }, { emoji: '🌿', x: 55, y: 70 }, { emoji: '📚', x: 80, y: 30 }], borderStyle: 'none', createdAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'demo-11', to: 'Myself at 3AM', from: 'Myself at 3PM',
    message: 'Hey — it gets better. I promise. The panic fades, the clarity comes, and tomorrow you will laugh about this. Sleep well.',
    bgType: 'solid', bgColor: '#0f172a', textColor: '#cbd5e1',
    font: "'Times New Roman', serif", align: 'center',
    stickers: [{ emoji: '🌙', x: 30, y: 25 }, { emoji: '☁️', x: 70, y: 65 }], borderStyle: 'dashed', createdAt: Date.now() - 86400000 * 8,
  },
  {
    id: 'demo-12', to: 'The Bus Driver Who Waited', from: 'The Running Passenger',
    message: 'Thank you for seeing me sprinting from two blocks away and waiting those extra 10 seconds. You saved my entire day.',
    bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #fde68a, #f97316)', bgColor: '#fef3c7',
    textColor: '#7c2d12', font: "'Comic Sans MS', cursive", align: 'center',
    stickers: [{ emoji: '☀️', x: 20, y: 20 }, { emoji: '💛', x: 55, y: 70 }, { emoji: '🚌', x: 80, y: 25 }], borderStyle: 'none', createdAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'demo-13', to: 'My College Roommate', from: 'Your Forever Friend',
    message: 'From splitting instant noodles at midnight to crying over finals — those years shaped who I am. Miss you always.',
    bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #fecaca, #fb7185)', bgColor: '#fce7f3',
    textColor: '#881337', font: "'Georgia', serif", align: 'center',
    stickers: [{ emoji: '🍜', x: 25, y: 25 }, { emoji: '😂', x: 55, y: 70 }, { emoji: '❤️', x: 80, y: 30 }], borderStyle: 'elegant', createdAt: Date.now() - 86400000 * 14,
  },
  {
    id: 'demo-14', to: 'Everyone Who Feels Alone Right Now', from: 'Someone Who Gets It',
    message: 'You are not as alone as your brain tells you at 2AM. There are people out there who will love you exactly as you are. Keep going.',
    bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #a78bfa, #c084fc)', bgColor: '#ede9fe',
    textColor: '#1e1b4b', font: "'Inter', sans-serif", align: 'center',
    stickers: [{ emoji: '💜', x: 20, y: 20 }, { emoji: '🌙', x: 55, y: 70 }, { emoji: '✨', x: 80, y: 25 }, { emoji: '🫶', x: 45, y: 45 }], borderStyle: 'elegant', createdAt: Date.now() - 86400000 * 20,
  },
];

// ── MINI POSTCARD ─────────────────────────────────────────────────────────────
const MiniPostcard = ({ card, onClick }) => {
  const bgStyle = card.bgType === 'gradient'
    ? { background: card.bgGradient }
    : { background: card.bgColor };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.03)`;
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
  };

  const template = TEMPLATES.find(t => t.id === card.template);

  return (
    <div
      onClick={() => onClick(card)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`postcard-tilt group relative rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer hover:-translate-y-2 hover:shadow-glass-lg ${borderClass[card.borderStyle] || ''}`}
      style={{ ...bgStyle, fontFamily: card.font, color: card.textColor }}
    >
      {template && (
        <span className="absolute top-2 right-2 z-10 text-[10px] px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-sm text-white/80 font-bold select-none">
          {template.icon} {template.name}
        </span>
      )}
      <span className="absolute top-2 left-2 text-sm opacity-25 select-none">✦</span>

      <div className="px-6 py-5" style={{ textAlign: card.align }}>
        <p className="text-[10px] font-bold opacity-50 mb-0.5 uppercase tracking-[0.2em]">To</p>
        <p className="text-base font-bold mb-3">{card.to}</p>

        <div className="flex items-center gap-2 mb-3 opacity-30">
          <div className="flex-1 h-px" style={{ background: card.textColor }} />
          <span className="text-sm">💌</span>
          <div className="flex-1 h-px" style={{ background: card.textColor }} />
        </div>

        {card.message && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3 opacity-85">
            {card.message.length > 140 ? card.message.slice(0, 140) + '…' : card.message}
          </p>
        )}

        {card.stickers?.length > 0 && card.stickers.map((s, i) => (
          <span
            key={i}
            className="absolute text-lg pointer-events-none select-none"
            style={{ left: `${s.x || 50}%`, top: `${s.y || 50}%`, transform: 'translate(-50%, -50%)' }}
          >
            {s.emoji || s}
          </span>
        ))}

        <div className="flex items-center gap-2 mb-3 opacity-30">
          <div className="flex-1 h-px" style={{ background: card.textColor }} />
          <span className="text-sm">✨</span>
          <div className="flex-1 h-px" style={{ background: card.textColor }} />
        </div>

        <p className="text-[10px] font-bold opacity-50 mb-0.5 uppercase tracking-[0.2em]">From</p>
        <p className="text-sm font-bold italic">— {card.from}</p>
      </div>

      <div className="px-4 pb-3 flex items-center gap-1 justify-end opacity-40">
        <Clock size={11} />
        <span className="text-xs" style={{ color: card.textColor }}>{timeAgo(card.createdAt)}</span>
      </div>
    </div>
  );
};

// ── FULL POSTCARD MODAL ───────────────────────────────────────────────────────
const FullPostcardModal = ({ card, onClose }) => {
  if (!card) return null;

  const bgStyle = card.bgType === 'gradient'
    ? { background: card.bgGradient }
    : { background: card.bgColor };

  const fullBorderClass = {
    elegant: 'ring-8 ring-white/60 shadow-glass-lg',
    none: 'shadow-glass-lg',
    dashed: 'border-8 border-dashed border-white/70 shadow-glass-lg',
  }[card.borderStyle] || '';

  const postedDate = new Date(card.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const postedTime = new Date(card.createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/50" onClick={onClose}>
      <div
        className="relative w-full max-w-[600px] flex flex-col items-center animate-fadeInUp"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-14 right-0 text-white/80 hover:text-white hover:scale-110 transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2.5"
        >
          <X size={22} />
        </button>

        <div
          className={`relative w-full rounded-3xl overflow-hidden transition-all duration-500 ${fullBorderClass}`}
          style={{
            ...bgStyle,
            minHeight: '420px',
            fontFamily: card.font,
            color: card.textColor,
          }}
        >
          <div className="absolute top-4 left-4 text-2xl opacity-25 select-none">✦</div>
          <div className="absolute top-4 right-4 text-2xl opacity-25 select-none">✦</div>
          <div className="absolute bottom-4 left-4 text-2xl opacity-25 select-none">✦</div>
          <div className="absolute bottom-4 right-4 text-2xl opacity-25 select-none">✦</div>

          <div
            className="relative z-10 flex flex-col justify-between px-8 sm:px-12 py-10"
            style={{ minHeight: '420px', textAlign: card.align }}
          >
            <div>
              <p className="text-lg font-semibold mb-1 opacity-90 italic">
                To: <span className="not-italic font-bold">{card.to}</span>
              </p>
            </div>

            <div className="my-4 flex items-center gap-3 justify-center opacity-30">
              <div className="flex-1 h-px" style={{ background: card.textColor }} />
              <span className="text-xl">💌</span>
              <div className="flex-1 h-px" style={{ background: card.textColor }} />
            </div>

            <div className="flex-1 flex items-center justify-center my-2">
              <p className="text-xl leading-relaxed whitespace-pre-wrap">
                {card.message}
              </p>
            </div>

            {card.stickers?.length > 0 && card.stickers.map((s, i) => (
              <span
                key={i}
                className="absolute text-3xl pointer-events-none select-none z-10"
                style={{ left: `${s.x || 50}%`, top: `${s.y || 50}%`, transform: 'translate(-50%, -50%)' }}
              >
                {s.emoji || s}
              </span>
            ))}

            <div className="my-4 flex items-center gap-3 justify-center opacity-30">
              <div className="flex-1 h-px" style={{ background: card.textColor }} />
              <span className="text-xl">✨</span>
              <div className="flex-1 h-px" style={{ background: card.textColor }} />
            </div>

            <div>
              <p className="text-base font-semibold opacity-90 italic">
                — <span className="font-bold">{card.from}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-white/90 bg-black/40 px-6 py-2.5 rounded-full backdrop-blur-sm text-sm font-medium flex items-center gap-2 shadow-glass">
          <Clock size={14} />
          Posted on {postedDate} at {postedTime}
        </div>
      </div>
    </div>
  );
};

// ── PAGE ──────────────────────────────────────────────────────────────────────
export default function PostcardWallPage() {
  const navigate = useNavigate();
  const [postcards, setPostcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 12;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchPostcards();
      setPostcards(data.length > 0 ? data : MOCK_POSTCARDS);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel('postcard-wall-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'postcards' },
        async () => {
          const data = await fetchPostcards();
          setPostcards(data.length > 0 ? data : MOCK_POSTCARDS);
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = postcards.filter(c => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return c.to.toLowerCase().includes(q) || c.from.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
  const currentCards = filtered.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  const handleQueryChange = (val) => {
    setQuery(val);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 font-sans relative overflow-hidden">

      {/* ── BACKGROUND MESH BLOBS ── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-300/30 to-fuchsia-200/30 blur-3xl animate-drift" />
        <div className="absolute top-[40%] right-[-8%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-pink-200/30 to-rose-200/30 blur-3xl animate-drift" style={{ animationDelay: '6s' }} />
        <div className="absolute bottom-[-5%] left-[30%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-200/25 to-violet-200/25 blur-3xl animate-drift" style={{ animationDelay: '12s' }} />
      </div>

      <div className="relative z-10">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50">
        <div className="bg-white/55 backdrop-blur-2xl border-b border-white/60 shadow-glass">
          <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 text-purple-500 hover:text-purple-700 font-semibold text-sm transition-colors group shrink-0"
              title="Back to Feed"
            >
              <span className="w-8 h-8 rounded-xl bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center transition-colors">
                <ArrowLeft size={16} />
              </span>
              <span className="hidden md:inline">Back to Feed</span>
            </button>

            <div className="flex-1 max-w-lg hidden sm:block">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={16} />
                <input
                  type="text"
                  placeholder="Search by name (To or From)…"
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 rounded-full bg-white/80 border border-purple-100/70 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-transparent focus:bg-white outline-none text-sm transition-all placeholder-purple-300 shadow-inner"
                />
                {query && (
                  <button
                    onClick={() => handleQueryChange('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-purple-100 text-purple-400 hover:bg-purple-200 hover:text-purple-600 flex items-center justify-center text-xs font-bold transition-all"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <ThemeToggle />
              <button
                onClick={() => navigate('/postcard')}
              className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-[length:200%_auto] hover:bg-right text-white rounded-full text-sm font-semibold shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all duration-500 whitespace-nowrap"
            >
                <span className="text-lg leading-none">+</span>
                <span className="hidden sm:inline">Create Postcard</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>

          {/* Mobile search row */}
          <div className="sm:hidden px-3 pb-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={16} />
              <input
                type="text"
                placeholder="Search by name (To or From)…"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-full bg-white/80 border border-purple-100/70 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-transparent focus:bg-white outline-none text-sm transition-all placeholder-purple-300 shadow-inner"
              />
              {query && (
                <button
                  onClick={() => handleQueryChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-purple-100 text-purple-400 hover:bg-purple-200 hover:text-purple-600 flex items-center justify-center text-xs font-bold transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-300/70 to-transparent" />
      </header>

      {/* ── BODY ── */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-10">

        {/* Title */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 sm:gap-2.5 mb-3">
            <Logo size={32} className="sm:hidden" />
            <Logo size={42} className="hidden sm:block" />
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-transparent bg-clip-text">
              Postcard Wall
            </h1>
          </div>
          <p className="text-gray-500 text-sm font-medium">
            {loading ? 'Loading postcards…' : `${filtered.length} postcard${filtered.length !== 1 ? 's' : ''}${query ? ` matching "${query}"` : ''}`}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="glass-card p-16 flex flex-col items-center justify-center gap-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-fuchsia-500 animate-spin" />
            <p className="text-gray-400 font-medium text-sm">Loading postcards…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="glass-card p-16 text-center max-w-md mx-auto relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-fuchsia-200/40 to-purple-200/40 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="relative mx-auto w-20 h-20 mb-5">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-fuchsia-100 to-purple-100" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl">💌</span>
                </div>
              </div>
              {query ? (
                <>
                  <p className="text-gray-700 font-bold text-lg mb-1">No postcards found</p>
                  <p className="text-gray-400 text-sm">No results for "<strong className="text-fuchsia-500">{query}</strong>". Try a different name.</p>
                </>
              ) : (
                <>
                  <p className="text-gray-700 font-bold text-lg mb-1">No postcards yet!</p>
                  <p className="text-gray-400 text-sm mb-5">Be the first to share a heartfelt postcard.</p>
                  <button
                    onClick={() => navigate('/postcard')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white rounded-full font-semibold text-sm shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                  >
                    Create a Postcard
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Postcard grid */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5">
              {currentCards.map((card, i) => (
                <div key={card.id} className="break-inside-avoid animate-popIn" style={{ animationDelay: `${i * 0.06}s` }}>
                  <MiniPostcard card={card} onClick={setSelectedCard} />
                </div>
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              handlePageChange={(p) => {
                setCurrentPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </div>

      {/* MODAL */}
      {selectedCard && (
        <FullPostcardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}

      </div>
    </div>
  );
}
