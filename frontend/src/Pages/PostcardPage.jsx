import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { ArrowLeft, Download, RotateCcw, Palette, Type, AlignLeft, AlignCenter, AlignRight, Globe, CheckCircle } from 'lucide-react';
import { sharePostcardDB } from '../lib/api';
import ThemeToggle from '../Components/ThemeToggle';
import Logo from '../Components/Logo';

// ── PRESET COLORS ────────────────────────────────────────────────────────────
const BG_PRESETS = [
  { label: 'Rose Blush',   value: '#fce7f3' },
  { label: 'Lavender',     value: '#ede9fe' },
  { label: 'Sky Blue',     value: '#e0f2fe' },
  { label: 'Mint',         value: '#d1fae5' },
  { label: 'Peach',        value: '#ffedd5' },
  { label: 'Lemon',        value: '#fef9c3' },
  { label: 'Slate',        value: '#1e293b' },
  { label: 'Night Purple', value: '#2e1065' },
  { label: 'Deep Rose',    value: '#881337' },
  { label: 'Forest',       value: '#14532d' },
  { label: 'White',        value: '#ffffff' },
  { label: 'Cream',        value: '#fdf6e3' },
];

const TEXT_PRESETS = [
  { label: 'Charcoal',  value: '#1f2937' },
  { label: 'White',     value: '#ffffff' },
  { label: 'Rose',      value: '#e11d48' },
  { label: 'Purple',    value: '#7c3aed' },
  { label: 'Sky',       value: '#0284c7' },
  { label: 'Amber',     value: '#d97706' },
  { label: 'Emerald',   value: '#059669' },
  { label: 'Pink',      value: '#db2777' },
];

const GRADIENT_PRESETS = [
  { label: 'Sunset',     value: 'linear-gradient(135deg, #f9a8d4, #fbbf24)' },
  { label: 'Ocean',      value: 'linear-gradient(135deg, #bae6fd, #6d28d9)' },
  { label: 'Aurora',     value: 'linear-gradient(135deg, #6ee7b7, #818cf8)' },
  { label: 'Flamingo',   value: 'linear-gradient(135deg, #fda4af, #c084fc)' },
  { label: 'Midnight',   value: 'linear-gradient(135deg, #0f172a, #4f46e5)' },
  { label: 'Golden',     value: 'linear-gradient(135deg, #fef3c7, #f59e0b)' },
  { label: 'Cherry',     value: 'linear-gradient(135deg, #fce7f3, #be185d)' },
  { label: 'Forest',     value: 'linear-gradient(135deg, #d1fae5, #065f46)' },
];

const FONTS = [
  { label: 'Elegant',      value: "'Georgia', serif" },
  { label: 'Modern',       value: "'Inter', sans-serif" },
  { label: 'Playful',      value: "'Comic Sans MS', cursive" },
  { label: 'Classic',      value: "'Times New Roman', serif" },
  { label: 'Handwritten',  value: "'Caveat', cursive" },
  { label: 'Script',       value: "'Dancing Script', cursive" },
  { label: 'Retro',        value: "'Pacifico', cursive" },
  { label: 'Bold',         value: "'Lobster', cursive" },
  { label: 'Clean',        value: "'Raleway', sans-serif" },
  { label: 'Serif',        value: "'Merriweather', serif" },
  { label: 'Romantic',     value: "'Satisfy', cursive" },
  { label: 'Marker',       value: "'Permanent Marker', cursive" },
  { label: 'Luxury',       value: "'Playfair Display', serif" },
];

const TEMPLATES = [
  { id: 'classic',  name: 'Classic',  icon: '✉️',  bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #fdfcfb, #f5f0eb)', bgColor: '#fdfcfb', textColor: '#333333', font: "'Georgia', serif", borderStyle: 'elegant', stickers: [] },
  { id: 'sunset',   name: 'Sunset',   icon: '🌅', bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #f97316, #ec4899)', bgColor: '#f97316', textColor: '#ffffff', font: "'Inter', sans-serif", borderStyle: 'none', stickers: [{ emoji: '🔥', x: 80, y: 15 }] },
  { id: 'ocean',    name: 'Ocean',    icon: '🌊', bgType: 'gradient', bgGradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)', bgColor: '#06b6d4', textColor: '#ffffff', font: "'Inter', sans-serif", borderStyle: 'none', stickers: [{ emoji: '🐚', x: 75, y: 80 }] },
  { id: 'vintage',  name: 'Vintage',  icon: '📜', bgType: 'solid',    bgColor: '#f5f0e1', bgGradient: '', textColor: '#5c4033', font: "'Times New Roman', serif", borderStyle: 'dashed', stickers: [] },
  { id: 'neon',     name: 'Neon',     icon: '💜', bgType: 'solid',    bgColor: '#1e1b4b', bgGradient: '', textColor: '#e879f9', font: "'Comic Sans MS', cursive", borderStyle: 'none', stickers: [{ emoji: '⚡', x: 20, y: 20 }] },
];

const STICKERS = ['🌸', '💌', '✨', '🌹', '🦋', '🌙', '❤️', '🌿', '🍃', '🕊️', '🌼', '💫', '🎀', '🌺', '🫶'];

const DEFAULT_STATE = {
  to: '',
  from: '',
  message: '',
  template: '',              // active template id (informational)
  bgType: 'solid',         // 'solid' | 'gradient'
  bgColor: '#fce7f3',
  bgGradient: 'linear-gradient(135deg, #f9a8d4, #fbbf24)',
  textColor: '#1f2937',
  font: "'Georgia', serif",
  align: 'center',
  stickers: [],            // placed sticker emojis
  borderStyle: 'elegant',  // 'elegant' | 'none' | 'dashed'
};

export default function PostcardPage() {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const [card, setCard] = useState(DEFAULT_STATE);
  const [activeTab, setActiveTab] = useState('content');
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

  const set = (key, val) => setCard(prev => ({ ...prev, [key]: val }));

  // ── STICKER DRAG ──────────────────────────────────────────────────────────
  const dragRef = useRef({ index: null, startX: 0, startY: 0, startStickerX: 0, startStickerY: 0 });

  const getRelativePosition = useCallback((clientX, clientY) => {
    if (!cardRef.current) return { x: 50, y: 50 };
    const rect = cardRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, []);

  const startDrag = useCallback((e, index) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const sticker = card.stickers[index];
    dragRef.current = { index, startX: clientX, startY: clientY, startStickerX: sticker.x, startStickerY: sticker.y };

    const onMove = (ev) => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const dx = ((cx - dragRef.current.startX) / (cardRef.current?.getBoundingClientRect().width || 1)) * 100;
      const dy = ((cy - dragRef.current.startY) / (cardRef.current?.getBoundingClientRect().height || 1)) * 100;
      const newX = Math.min(100, Math.max(0, dragRef.current.startStickerX + dx));
      const newY = Math.min(100, Math.max(0, dragRef.current.startStickerY + dy));
      setCard(prev => ({
        ...prev,
        stickers: prev.stickers.map((s, i) => i === dragRef.current.index ? { ...s, x: Math.round(newX), y: Math.round(newY) } : s),
      }));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      dragRef.current.index = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }, [card.stickers]);

  const removeSticker = useCallback((index) => {
    set('stickers', card.stickers.filter((_, i) => i !== index));
  }, [card.stickers, set]);

  // ── DOWNLOAD ─────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `postcard-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  // ── SHARE TO WALL ─────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleShare = async () => {
    if (!card.to.trim() || !card.from.trim()) {
      showToast('error', 'Please fill in both To and From fields before sharing.');
      return;
    }
    
    // Get or create device ID
    let deviceId = localStorage.getItem('freespace_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('freespace_device_id', deviceId);
    }

    setSharing(true);
    try {
      const result = await sharePostcardDB({ ...card, deviceId });
      
      if (result.error === 'LIMIT_REACHED') {
        showToast('error', 'Limit reached! You can share 5 postcards per 24 hours.');
      } else if (result.error) {
        showToast('error', 'Failed to share. Please try again.');
      } else {
        showToast('success', 'Postcard shared to the Wall! 🎉');
      }
    } finally {
      setSharing(false);
    }
  };

  // ── BACKGROUND STYLE ─────────────────────────────────────────────────────
  const bgStyle = card.bgType === 'gradient'
    ? { background: card.bgGradient }
    : { background: card.bgColor };

  const borderClass = {
    elegant: 'ring-4 ring-white/60 shadow-2xl',
    none: 'shadow-lg',
    dashed: 'border-4 border-dashed border-white/70 shadow-xl',
  }[card.borderStyle];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 font-sans relative overflow-hidden">

      {/* ── BACKGROUND MESH BLOBS ── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-300/30 to-fuchsia-200/30 blur-3xl animate-drift" />
        <div className="absolute top-[40%] right-[-8%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-pink-200/30 to-rose-200/30 blur-3xl animate-drift" style={{ animationDelay: '6s' }} />
        <div className="absolute bottom-[-5%] left-[30%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-200/25 to-violet-200/25 blur-3xl animate-drift" style={{ animationDelay: '12s' }} />
      </div>

      <div className="relative z-10">

      {/* ── TOAST ── */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-glass-lg text-sm font-semibold transition-all animate-fadeInUp
          ${ toast.type === 'success'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
            : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'}`}
        >
          {toast.type === 'success' && <CheckCircle size={17} />}
          {toast.msg}
          {toast.type === 'success' && (
            <button
              onClick={() => navigate('/postcard-wall')}
              className="ml-2 underline font-bold opacity-90 hover:opacity-100"
            >
              View Wall →
            </button>
          )}
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50">
        <div className="bg-white/55 backdrop-blur-2xl border-b border-white/60 shadow-glass">
          <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2">
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

            <div className="flex items-center gap-2 min-w-0">
              <Logo size={28} className="sm:hidden" />
              <Logo size={36} className="hidden sm:block" />
              <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-transparent bg-clip-text truncate">
                Postcard Creator
              </h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <ThemeToggle />
              <button
                onClick={() => setCard(DEFAULT_STATE)}
                className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-sm font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 border border-purple-100/60 bg-white/70 transition-all duration-300"
                title="Reset postcard"
              >
                <RotateCcw size={14} />
                <span className="hidden lg:inline">Reset</span>
              </button>
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full text-sm font-semibold shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-60"
              >
                <Globe size={16} />
                <span className="hidden lg:inline">{sharing ? 'Sharing…' : 'Share to Wall'}</span>
                <span className="hidden sm:inline lg:hidden">Share</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 bg-[length:200%_auto] hover:bg-right text-white rounded-full text-sm font-semibold shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all duration-500 disabled:opacity-60"
              >
                <Download size={16} />
                <span className="hidden lg:inline">{downloading ? 'Saving…' : 'Download'}</span>
                <span className="hidden sm:inline lg:hidden">Save</span>
              </button>
            </div>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-300/70 to-transparent" />
      </header>

      {/* ── BODY ── */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-10 flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">

        {/* ══ LEFT: EDITOR ══ */}
        <div className="w-full lg:w-[420px] flex-shrink-0">
          <div className="glass-card overflow-hidden">

            {/* Tab switcher */}
            <div className="flex border-b border-purple-100/60 bg-white/30">
              {[
                { id: 'content', icon: <AlignLeft size={15}/>, label: 'Content' },
                { id: 'style',   icon: <Palette   size={15}/>, label: 'Style'   },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-all duration-300
                    ${activeTab === tab.id
                      ? 'text-purple-700'
                      : 'text-gray-400 hover:text-purple-500'}`}
                >
                  {tab.icon} {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-1/4 right-1/4 h-[3px] rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6 space-y-5">

              {/* ── CONTENT TAB ── */}
              {activeTab === 'content' && (
                <>
                  {/* To */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">To</label>
                    <input
                      type="text"
                      placeholder="e.g. My dearest friend…"
                      value={card.to}
                      onChange={e => set('to', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-purple-100/70 bg-white/60 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-transparent focus:bg-white outline-none text-sm transition-all placeholder-purple-300 shadow-inner"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Message</label>
                    <textarea
                      placeholder="Write your heartfelt message here…"
                      value={card.message}
                      onChange={e => set('message', e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 rounded-2xl border border-purple-100/70 bg-white/60 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-transparent focus:bg-white outline-none text-sm resize-none transition-all placeholder-purple-300 shadow-inner leading-relaxed"
                    />
                  </div>

                  {/* From */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">From</label>
                    <input
                      type="text"
                      placeholder="e.g. With love, Alex"
                      value={card.from}
                      onChange={e => set('from', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-purple-100/70 bg-white/60 focus:ring-2 focus:ring-fuchsia-400/60 focus:border-transparent focus:bg-white outline-none text-sm transition-all placeholder-purple-300 shadow-inner"
                    />
                  </div>

                  {/* Stickers */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Add Stickers</label>
                    <div className="grid grid-cols-5 gap-1 sm:gap-2">
                      {STICKERS.map(s => (
                        <button
                          key={s}
                          onClick={() => set('stickers', [...card.stickers, { emoji: s, x: 40 + Math.random() * 20, y: 40 + Math.random() * 20 }])}
                          className="text-2xl p-2.5 rounded-xl hover:bg-purple-50 hover:scale-125 hover:-rotate-6 active:scale-95 transition-all duration-200"
                          title="Add sticker (drag to position)"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {card.stickers.length > 0 && (
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{card.stickers.length} sticker{card.stickers.length !== 1 ? 's' : ''} — drag to position, double-click to remove</span>
                        <button
                          onClick={() => set('stickers', [])}
                          className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-all"
                        >
                          <span>Clear all</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── STYLE TAB ── */}
              {activeTab === 'style' && (
                <>
                  {/* Templates */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Quick Templates</label>
                    <div className="grid grid-cols-5 gap-2">
                      {TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            set('template', t.id);
                            set('bgType', t.bgType);
                            set('bgColor', t.bgColor);
                            set('bgGradient', t.bgGradient);
                            set('textColor', t.textColor);
                            set('font', t.font);
                            set('borderStyle', t.borderStyle);
                            set('stickers', [...t.stickers]);
                          }}
                          className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border transition-all duration-300 text-center
                            ${card.template === t.id
                              ? 'bg-gradient-to-r from-purple-100 to-fuchsia-100 border-fuchsia-400 shadow-glass scale-105'
                              : 'bg-white/70 border-purple-100 hover:border-purple-300 hover:bg-purple-50'}`}
                        >
                          <span className="text-lg leading-none">{t.icon}</span>
                          <span className="text-[10px] font-bold text-gray-600">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bg type toggle */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Background</label>
                    <div className="flex gap-2 mb-3">
                      {['solid', 'gradient'].map(t => (
                        <button
                          key={t}
                          onClick={() => set('bgType', t)}
                          className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all duration-300 capitalize
                            ${card.bgType === t
                              ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white border-transparent shadow-glow-sm'
                              : 'bg-white/70 text-gray-500 border-purple-100 hover:border-purple-300'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {card.bgType === 'solid' ? (
                      <>
                        <div className="flex flex-wrap gap-2.5 mb-3">
                          {BG_PRESETS.map(c => (
                            <button
                              key={c.value}
                              onClick={() => set('bgColor', c.value)}
                              title={c.label}
                              className={`w-10 h-10 rounded-2xl border-2 transition-all duration-300 hover:scale-110 hover:-rotate-3
                                ${card.bgColor === c.value ? 'border-fuchsia-500 scale-110 ring-2 ring-fuchsia-300 shadow-glow-sm' : 'border-white/80 shadow-md hover:shadow-lg'}`}
                              style={{ background: c.value }}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-1 bg-white/50 rounded-xl px-3 py-2">
                          <label className="text-xs text-gray-400 font-medium">Custom:</label>
                          <input
                            type="color"
                            value={card.bgColor}
                            onChange={e => set('bgColor', e.target.value)}
                            className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0 shadow-md"
                          />
                          <span className="text-xs font-mono text-gray-400">{card.bgColor}</span>
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-4 gap-2.5">
                        {GRADIENT_PRESETS.map(g => (
                          <button
                            key={g.value}
                            onClick={() => set('bgGradient', g.value)}
                            title={g.label}
                            className={`aspect-square rounded-2xl transition-all duration-300 hover:scale-110 hover:-rotate-3 shadow-md hover:shadow-lg
                              ${card.bgGradient === g.value ? 'ring-2 ring-fuchsia-500 scale-110 shadow-glow-sm' : ''}`}
                            style={{ background: g.value }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">
                      <Type size={13}/> Text Color
                    </label>
                    <div className="flex flex-wrap gap-2.5 mb-2">
                      {TEXT_PRESETS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => set('textColor', c.value)}
                          title={c.label}
                          className={`w-10 h-10 rounded-2xl border-2 transition-all duration-300 hover:scale-110 hover:rotate-3
                            ${card.textColor === c.value ? 'border-fuchsia-500 scale-110 ring-2 ring-fuchsia-300 shadow-glow-sm' : 'border-gray-200 shadow-sm hover:shadow-md'}`}
                          style={{ background: c.value }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 bg-white/50 rounded-xl px-3 py-2">
                      <label className="text-xs text-gray-400 font-medium">Custom:</label>
                      <input
                        type="color"
                        value={card.textColor}
                        onChange={e => set('textColor', e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0 shadow-md"
                      />
                      <span className="text-xs font-mono text-gray-400">{card.textColor}</span>
                    </div>
                  </div>

                  {/* Font */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Font Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {FONTS.map(f => (
                        <button
                          key={f.value}
                          onClick={() => set('font', f.value)}
                          className={`py-2.5 px-3 rounded-2xl text-sm border transition-all duration-300
                            ${card.font === f.value
                              ? 'bg-gradient-to-r from-purple-100 to-fuchsia-100 border-fuchsia-300 text-purple-700 font-semibold shadow-glass'
                              : 'bg-white/70 border-purple-100 text-gray-600 hover:border-purple-300 hover:bg-purple-50'}`}
                          style={{ fontFamily: f.value }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Align */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Text Alignment</label>
                    <div className="flex gap-2">
                      {[
                        { val: 'left',   icon: <AlignLeft   size={16}/> },
                        { val: 'center', icon: <AlignCenter size={16}/> },
                        { val: 'right',  icon: <AlignRight  size={16}/> },
                      ].map(a => (
                        <button
                          key={a.val}
                          onClick={() => set('align', a.val)}
                          className={`flex-1 flex items-center justify-center py-2.5 rounded-2xl border transition-all duration-300
                            ${card.align === a.val
                              ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white border-transparent shadow-glow-sm'
                              : 'bg-white/70 text-gray-500 border-purple-100 hover:border-purple-300'}`}
                        >
                          {a.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">Border Style</label>
                    <div className="flex gap-2">
                      {['none', 'elegant', 'dashed'].map(b => (
                        <button
                          key={b}
                          onClick={() => set('borderStyle', b)}
                          className={`flex-1 py-2.5 rounded-2xl text-sm border capitalize transition-all duration-300 font-medium
                            ${card.borderStyle === b
                              ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white border-transparent shadow-glow-sm'
                              : 'bg-white/70 text-gray-500 border-purple-100 hover:border-purple-300'}`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ══ RIGHT: LIVE PREVIEW ══ */}
        {/* w-full: in the mobile column layout (items-start) this block would
            otherwise shrink-to-fit and pin the card narrow to the left. */}
        <div className="w-full flex-1 flex flex-col items-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-5">Live Preview</p>

          {/* Postcard card */}
          <div
            ref={cardRef}
            className={`relative w-full max-w-[600px] min-h-[320px] sm:min-h-[400px] rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.01] ${borderClass}`}
            style={{
              ...bgStyle,
              fontFamily: card.font,
              color: card.textColor,
            }}
          >
            {/* Decorative corner ornaments */}
            <div className="absolute top-4 left-4 text-2xl opacity-30 select-none">✦</div>
            <div className="absolute top-4 right-4 text-2xl opacity-30 select-none">✦</div>
            <div className="absolute bottom-4 left-4 text-2xl opacity-30 select-none">✦</div>
            <div className="absolute bottom-4 right-4 text-2xl opacity-30 select-none">✦</div>

            <div
              className="relative z-10 flex flex-col justify-between px-6 py-8 sm:px-12 sm:py-10 min-h-[320px] sm:min-h-[400px]"
              style={{ textAlign: card.align }}
            >
              {/* TO */}
              <div>
                {card.to ? (
                  <p className="text-lg font-semibold mb-1 opacity-90 italic">
                    To: <span className="not-italic font-bold">{card.to}</span>
                  </p>
                ) : (
                  <p className="text-lg opacity-25 italic">To: …</p>
                )}
              </div>

              {/* DIVIDER */}
              <div className="my-4 flex items-center gap-3 justify-center opacity-30">
                <div className="flex-1 h-px" style={{ background: card.textColor }} />
                <span className="text-lg">💌</span>
                <div className="flex-1 h-px" style={{ background: card.textColor }} />
              </div>

              {/* MESSAGE */}
              <div className="flex-1 flex items-center justify-center my-2">
                {card.message ? (
                  <p className="text-lg sm:text-xl leading-relaxed whitespace-pre-wrap">
                    {card.message}
                  </p>
                ) : (
                  <p className="text-lg sm:text-xl opacity-25 italic">Your message appears here…</p>
                )}
              </div>

              {/* STICKERS — draggable, positioned absolutely */}
              {card.stickers.length > 0 && card.stickers.map((s, i) => (
                <span
                  key={i}
                  className="absolute text-2xl cursor-grab active:cursor-grabbing select-none z-20 transition-shadow hover:drop-shadow-lg"
                  style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%, -50%)' }}
                  onMouseDown={(e) => startDrag(e, i)}
                  onTouchStart={(e) => startDrag(e, i)}
                  onDoubleClick={() => removeSticker(i)}
                >
                  {s.emoji}
                </span>
              ))}

              {/* DIVIDER */}
              <div className="my-4 flex items-center gap-3 justify-center opacity-30">
                <div className="flex-1 h-px" style={{ background: card.textColor }} />
                <span className="text-lg">✨</span>
                <div className="flex-1 h-px" style={{ background: card.textColor }} />
              </div>

              {/* FROM */}
              <div>
                {card.from ? (
                  <p className="text-base font-semibold opacity-90 italic">
                    — <span className="font-bold">{card.from}</span>
                  </p>
                ) : (
                  <p className="text-base opacity-25 italic">— From: …</p>
                )}
              </div>
            </div>
          </div>

          {/* Download hint */}
          <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
            <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-sm">🖼️</span>
            Click <strong className="text-purple-500">Download</strong> to save your postcard as an image
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
