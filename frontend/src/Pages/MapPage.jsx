import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map as MlMap, Marker, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ArrowLeft,
  X,
  MapPin,
  Loader2,
  Search,
  Navigation,
  Compass,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Type,
  Palette,
  Eye,
  Sliders,
  Check,
} from 'lucide-react';
import { fetchMapNotes, postMapNote, getIdentity, lockIdentity, fetchSettings } from '../lib/api';
import { getDeviceId } from '../lib/identity';
import ThemeToggle from '../Components/ThemeToggle';
import Logo from '../Components/Logo';

// ── Philippines bounds (mirrors server + DB constraint) ──────────
const PH = { latMin: 4.4, latMax: 21.2, lngMin: 115.0, lngMax: 131.0 };
const PH_CENTER = [122.94, 12.87];
const PH_ZOOM = 5.05;

const POPULAR_LOCATIONS = [
  { name: 'Metro Manila', lat: 14.5995, lng: 120.9842, zoom: 12 },
  { name: 'Cebu City', lat: 10.3157, lng: 123.8854, zoom: 13 },
  { name: 'Baguio City', lat: 16.4023, lng: 120.596, zoom: 13 },
  { name: 'Davao City', lat: 7.1907, lng: 125.4553, zoom: 12 },
  { name: 'Boracay', lat: 11.9674, lng: 121.9248, zoom: 13.5 },
  { name: 'Siargao', lat: 9.8558, lng: 126.0465, zoom: 11.5 },
];

// ── STYLE PRESETS ────────────────────────────────────────────────
export const NOTE_FONTS = [
  { id: 'modern', label: 'Modern', font: "'Inter', sans-serif" },
  { id: 'handwritten', label: 'Handwritten', font: "'Caveat', cursive" },
  { id: 'script', label: 'Script', font: "'Dancing Script', cursive" },
  { id: 'elegant', label: 'Elegant', font: "'Playfair Display', serif" },
  { id: 'marker', label: 'Marker', font: "'Permanent Marker', cursive" },
  { id: 'classic', label: 'Classic', font: "'Georgia', serif" },
  { id: 'playful', label: 'Playful', font: "'Comic Sans MS', cursive" },
  { id: 'serif', label: 'Serif', font: "'Merriweather', serif" },
];

export const NOTE_THEMES = {
  sakura: {
    name: 'Sakura Rose',
    primary: '#ec4899',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)',
    glow: 'rgba(236, 72, 153, 0.45)',
    light: '#fbcfe8',
    cardBg: 'from-pink-500/10 to-rose-500/10',
  },
  violet: {
    name: 'Cyber Violet',
    primary: '#a855f7',
    gradient: 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)',
    glow: 'rgba(168, 85, 247, 0.45)',
    light: '#e9d5ff',
    cardBg: 'from-purple-500/10 to-violet-500/10',
  },
  ocean: {
    name: 'Ocean Cyan',
    primary: '#06b6d4',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
    glow: 'rgba(6, 182, 212, 0.45)',
    light: '#cffafe',
    cardBg: 'from-cyan-500/10 to-blue-500/10',
  },
  sunset: {
    name: 'Sunset Amber',
    primary: '#f59e0b',
    gradient: 'linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)',
    glow: 'rgba(245, 158, 11, 0.45)',
    light: '#fef3c7',
    cardBg: 'from-amber-500/10 to-orange-500/10',
  },
  emerald: {
    name: 'Emerald Mint',
    primary: '#10b981',
    gradient: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
    glow: 'rgba(16, 185, 129, 0.45)',
    light: '#d1fae5',
    cardBg: 'from-emerald-500/10 to-teal-500/10',
  },
  midnight: {
    name: 'Midnight Indigo',
    primary: '#6366f1',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)',
    glow: 'rgba(99, 102, 241, 0.45)',
    light: '#e0e7ff',
    cardBg: 'from-indigo-500/10 to-blue-500/10',
  },
  ruby: {
    name: 'Ruby Romance',
    primary: '#e11d48',
    gradient: 'linear-gradient(135deg, #be123c 0%, #fb7185 100%)',
    glow: 'rgba(225, 29, 72, 0.45)',
    light: '#ffe4e6',
    cardBg: 'from-rose-500/10 to-red-500/10',
  },
  golden: {
    name: 'Golden Glow',
    primary: '#eab308',
    gradient: 'linear-gradient(135deg, #ca8a04 0%, #facc15 100%)',
    glow: 'rgba(234, 179, 8, 0.45)',
    light: '#fef9c3',
    cardBg: 'from-yellow-500/10 to-amber-500/10',
  },
};

export const BORDER_STYLES = [
  { id: 'solid', label: 'Solid', icon: '◻️' },
  { id: 'glowing', label: 'Glowing', icon: '✨' },
  { id: 'dashed', label: 'Dashed', icon: '✂️' },
  { id: 'double', label: 'Double', icon: '⏸️' },
  { id: 'gradient', label: 'Gradient', icon: '🌈' },
];

export const STICKER_EMOJIS = [
  // 😭 Crying, Sad & Heartbreak
  '😭', '💔', '🥺', '😢', '🥀', '❤️‍🩹', '🌧️', '🩹',
  // 🥰 In love, Kiss & Affection
  '🥰', '😍', '😘', '💋', '💖', '🫶', '🥹', '💌',
  // 😴 Moods, Venting & Reactions
  '😴', '😮‍💨', '🫠', '💀', '🤡', '🙃', '🤐', '🔥',
  // ✨ Aesthetic & Vibes
  '✨', '🌙', '🌸', '🌿', '🕊️', '🦋', '⚡', '⭐',
  // 📍 Places, Food & Daily
  '📍', '☕', '🍺', '🍜', '🍕', '🏖️', '🎵', '💭',
];

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

const inPhilippines = (lat, lng) =>
  lat >= PH.latMin && lat <= PH.latMax && lng >= PH.lngMin && lng <= PH.lngMax;

const fmtClock = ts =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtCountdown = ts => {
  const ms = new Date(ts).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
};

// Calculate Haversine distance in kilometers
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Note serialization & parsing helpers ───────────────────────────
function serializeNoteMessage(text, { font, themeId, borderStyle, emoji }) {
  return `__FS_NOTE__${JSON.stringify({
    m: text,
    f: font,
    c: themeId,
    b: borderStyle,
    e: emoji,
  })}`;
}

function parseNote(note) {
  let text = note.message || '';
  let font = "'Inter', sans-serif";
  let themeId = 'sakura';
  let borderStyle = 'solid';
  let emoji = '📍';

  if (typeof text === 'string' && text.startsWith('__FS_NOTE__')) {
    try {
      const data = JSON.parse(text.slice(11));
      text = data.m || '';
      font = data.f || font;
      themeId = data.c || themeId;
      borderStyle = data.b || borderStyle;
      emoji = data.e || emoji;
    } catch {
      // fallback
    }
  }

  return {
    ...note,
    displayMessage: text,
    font,
    themeId,
    borderStyle,
    emoji,
  };
}

/** XSS-safe popup with custom font, theme colors & border styles */
function buildPopupContent(note) {
  const parsed = parseNote(note);
  const theme = NOTE_THEMES[parsed.themeId] || NOTE_THEMES.sakura;

  const wrap = document.createElement('div');
  wrap.className = `fs-popup-wrap fs-border-${parsed.borderStyle}`;
  wrap.style.color = theme.primary;

  if (parsed.borderStyle === 'glowing') {
    wrap.style.boxShadow = `0 0 14px ${theme.glow}`;
  }

  const header = document.createElement('div');
  header.className = 'fs-popup-header';

  const emoji = document.createElement('span');
  emoji.className = 'fs-popup-emoji';
  emoji.textContent = parsed.emoji || '📍';

  const name = document.createElement('p');
  name.className = 'fs-popup-name';
  name.textContent = parsed.name;
  name.style.color = theme.light || theme.primary;

  header.append(emoji, name);

  const msg = document.createElement('p');
  msg.className = 'fs-popup-msg';
  msg.style.fontFamily = parsed.font;
  msg.textContent = parsed.displayMessage;

  const exp = document.createElement('p');
  exp.className = 'fs-popup-exp';
  exp.textContent = `🕒 Expires at ${fmtClock(parsed.expires_at)} (${fmtCountdown(parsed.expires_at)})`;

  wrap.append(header, msg, exp);
  return wrap;
}

const MapPage = () => {
  const navigate = useNavigate();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapReadyRef = useRef(false);
  const markersRef = useRef([]);
  const searchPinRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const searchDropdownRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // ── Search State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // ── Place-note flow & Style Customization ──
  const [draftCoords, setDraftCoords] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftMsg, setDraftMsg] = useState('');
  const [draftFont, setDraftFont] = useState("'Inter', sans-serif");
  const [draftTheme, setDraftTheme] = useState('sakura');
  const [draftBorderStyle, setDraftBorderStyle] = useState('solid');
  const [draftEmoji, setDraftEmoji] = useState('📍');
  const [modalTab, setModalTab] = useState('content'); // 'content' | 'style'

  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [nameLocked, setNameLocked] = useState(false);

  // Prefill + lock name from the shared VentSpace identity
  useEffect(() => {
    let alive = true;

    const loadIdentity = async () => {
      const deviceId = getDeviceId();
      const settings = await fetchSettings().catch(() => null);
      const lockHours = Number(settings?.auto_delete_hours) || 5;
      const identity = await getIdentity(deviceId).catch(() => null);

      if (!alive) return;
      if (identity?.username && identity?.created_at) {
        const hoursSinceSet = (Date.now() - new Date(identity.created_at).getTime()) / 3600000;
        if (hoursSinceSet < lockHours && identity.username.length <= 30) {
          setDraftName(identity.username);
          setNameLocked(true);
          return;
        }
      }
      setNameLocked(false);
    };

    loadIdentity();
    return () => {
      alive = false;
    };
  }, []);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Filter matching active notes in real-time ──
  const matchingNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return notes
      .map(parseNote)
      .filter(
        n =>
          n.name.toLowerCase().includes(q) ||
          n.displayMessage.toLowerCase().includes(q)
      );
  }, [notes, searchQuery]);

  // Combined selectable items for keyboard navigation
  const combinedResults = useMemo(() => {
    const items = [];
    matchingNotes.forEach(note => {
      items.push({ type: 'note', item: note });
    });
    locationResults.forEach(loc => {
      items.push({ type: 'location', item: loc });
    });
    return items;
  }, [matchingNotes, locationResults]);

  // ── Location Geocoding with OpenStreetMap Nominatim ──
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setLocationResults([]);
      setIsSearchingLocation(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearchingLocation(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}&countrycodes=ph&limit=5&addressdetails=1`;
        const res = await fetch(endpoint, {
          headers: { 'Accept-Language': 'en' },
        });
        if (!res.ok) throw new Error('Geocoding response failed');
        const data = await res.json();

        // Enrich each location result with nearby active notes count
        const parsed = (data || [])
          .map(item => {
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            if (!inPhilippines(lat, lng)) return null;

            const nearbyNotes = notes.filter(
              n => getDistanceKm(lat, lng, n.latitude, n.longitude) <= 15
            );

            return {
              id: item.place_id,
              name: item.name || item.display_name.split(',')[0],
              displayName: item.display_name,
              lat,
              lng,
              nearbyCount: nearbyNotes.length,
            };
          })
          .filter(Boolean);

        setLocationResults(parsed);
      } catch (err) {
        console.error('Location search error:', err);
        setLocationResults([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 320);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, notes]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = e => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Render markers for all active notes ──────────────────────────
  const renderMarkers = useCallback(list => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    markersRef.current.forEach(m => m.marker.remove());
    markersRef.current = [];

    list.forEach(rawNote => {
      const note = parseNote(rawNote);
      const theme = NOTE_THEMES[note.themeId] || NOTE_THEMES.sakura;

      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'fs-pin-custom';
      el.setAttribute('aria-label', `Note from ${note.name}`);
      el.style.background = theme.gradient;
      el.style.boxShadow = `0 4px 14px ${theme.glow}, 0 0 0 3px ${theme.glow}`;

      const emojiSpan = document.createElement('span');
      emojiSpan.textContent = note.emoji || '📍';
      el.appendChild(emojiSpan);

      const popup = new Popup({ offset: 22, closeButton: false, maxWidth: '290px' })
        .setDOMContent(buildPopupContent(note));

      const marker = new Marker({ element: el, anchor: 'bottom' })
        .setLngLat([note.longitude, note.latitude])
        .setPopup(popup)
        .addTo(map);

      // Hover to peek at the note; click/tap still works on touch devices
      el.addEventListener('mouseenter', () => marker.togglePopup());
      el.addEventListener('mouseleave', () => popup.remove());

      markersRef.current.push({ id: note.id, marker, popup, note });
    });
  }, []);

  // ── Init map once ────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;

    const map = new MlMap({
      container: mapContainerRef.current,
      style: OSM_STYLE,
      center: PH_CENTER,
      zoom: PH_ZOOM,
      attributionControl: { compact: false },
    });

    map.on('error', e => {
      console.error('[MapLibre error]', e.error?.message || e.message);
    });

    mapRef.current = map;
    map.getCanvas().style.cursor = 'crosshair';

    map.on('load', () => {
      mapReadyRef.current = true;
      renderMarkers(notes);
    });

    // Click → propose a new pin (only inside the Philippines)
    map.on('click', e => {
      const { lat, lng } = e.lngLat;
      if (!inPhilippines(lat, lng)) {
        setToast('📍 Notes can only be placed inside the Philippines.');
        return;
      }
      setPostError('');
      setDraftCoords({ lat, lng });
      setModalTab('content');
    });

    return () => {
      if (searchPinRef.current) searchPinRef.current.remove();
      markersRef.current.forEach(m => m.marker.remove());
      markersRef.current = [];
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load + periodic refresh ──────────────────────────────────────
  useEffect(() => {
    let alive = true;

    const load = async () => {
      const data = await fetchMapNotes();
      if (!alive) return;
      const active = data.filter(n => new Date(n.expires_at).getTime() > Date.now());
      setNotes(active);
      setLoading(false);
      renderMarkers(active);
    };

    load();
    const interval = setInterval(load, 60 * 1000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search Selection Actions ─────────────────────────────────────

  const handleSelectLocation = loc => {
    const map = mapRef.current;
    if (!map) return;

    setSearchOpen(false);
    setSearchQuery(loc.name);

    if (searchPinRef.current) {
      searchPinRef.current.remove();
      searchPinRef.current = null;
    }

    const el = document.createElement('div');
    el.className = 'fs-search-pin';
    const pin = new Marker({ element: el, anchor: 'center' })
      .setLngLat([loc.lng, loc.lat])
      .addTo(map);
    searchPinRef.current = pin;

    setTimeout(() => {
      if (searchPinRef.current === pin) {
        pin.remove();
        searchPinRef.current = null;
      }
    }, 12000);

    map.flyTo({
      center: [loc.lng, loc.lat],
      zoom: loc.zoom || 13.5,
      duration: 1300,
      essential: true,
    });

    const count =
      loc.nearbyCount !== undefined
        ? loc.nearbyCount
        : notes.filter(
            n => getDistanceKm(loc.lat, loc.lng, n.latitude, n.longitude) <= 15
          ).length;

    if (count > 0) {
      setToast(`📍 ${loc.name} — ${count} active note${count > 1 ? 's' : ''} nearby!`);
    } else {
      setToast(`📍 Flying to ${loc.name}`);
    }
  };

  const handleSelectNote = note => {
    const map = mapRef.current;
    if (!map) return;

    setSearchOpen(false);
    setSearchQuery(note.name);

    map.flyTo({
      center: [note.longitude, note.latitude],
      zoom: 15.5,
      duration: 1300,
      essential: true,
    });

    setTimeout(() => {
      const match = markersRef.current.find(m => m.id === note.id);
      if (match) {
        match.popup.addTo(map);
      }
    }, 700);

    setToast(`📌 Jumped to note by ${note.name}`);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setToast('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;

        if (!inPhilippines(latitude, longitude)) {
          setToast('📍 Your current location is outside the Philippines.');
          return;
        }

        const map = mapRef.current;
        if (map) {
          if (searchPinRef.current) searchPinRef.current.remove();

          const el = document.createElement('div');
          el.className = 'fs-search-pin';
          searchPinRef.current = new Marker({ element: el, anchor: 'center' })
            .setLngLat([longitude, latitude])
            .addTo(map);

          map.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            duration: 1300,
            essential: true,
          });

          const count = notes.filter(
            n => getDistanceKm(latitude, longitude, n.latitude, n.longitude) <= 15
          ).length;

          setToast(
            count > 0
              ? `📍 My Location: ${count} note${count > 1 ? 's' : ''} nearby!`
              : '📍 Centered at your location'
          );
        }
      },
      err => {
        setLocating(false);
        console.warn('Geolocation error:', err);
        setToast('Could not access your location. Please check browser permissions.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleKeyDown = e => {
    if (!searchOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < combinedResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev > 0 ? prev - 1 : combinedResults.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < combinedResults.length) {
        const selected = combinedResults[highlightedIndex];
        if (selected.type === 'note') {
          handleSelectNote(selected.item);
        } else {
          handleSelectLocation(selected.item);
        }
      } else if (combinedResults.length > 0) {
        const first = combinedResults[0];
        if (first.type === 'note') {
          handleSelectNote(first.item);
        } else {
          handleSelectLocation(first.item);
        }
      }
    } else if (e.key === 'Escape') {
      setSearchOpen(false);
    }
  };

  // ── Submit a new note with custom styles ──────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    if (!draftCoords || posting) return;

    const name = draftName.trim().slice(0, 30);
    const message = draftMsg.trim().slice(0, 150);
    if (!name || !message) {
      setPostError('Please fill in both your name and a message.');
      return;
    }

    setPosting(true);
    setPostError('');

    // Pack message and chosen font, theme, border style, and emoji
    const formattedMessage = serializeNoteMessage(message, {
      font: draftFont,
      themeId: draftTheme,
      borderStyle: draftBorderStyle,
      emoji: draftEmoji,
    });

    const result = await postMapNote({
      name,
      message: formattedMessage,
      latitude: draftCoords.lat,
      longitude: draftCoords.lng,
    });
    setPosting(false);

    if (result?.error) {
      setPostError(result.error);
      return;
    }

    const next = [result, ...notes];
    setNotes(next);
    renderMarkers(next);
    setDraftCoords(null);
    setDraftMsg('');
    setToast('📌 Note placed with your custom style! Disappears in 5 hours.');

    if (!nameLocked) {
      lockIdentity(getDeviceId(), name)
        .then(() => setNameLocked(true))
        .catch(() => {});
    }

    const map = mapRef.current;
    if (map) {
      map.easeTo({
        center: [result.longitude, result.latitude],
        zoom: Math.max(map.getZoom(), 12),
        duration: 900,
      });
      setTimeout(() => {
        const added = markersRef.current.find(m => m.id === result.id);
        if (added) added.popup.addTo(map);
      }, 500);
    }
  };

  const closeDraft = () => {
    setDraftCoords(null);
    setPostError('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setLocationResults([]);
    setSearchOpen(false);
    setHighlightedIndex(-1);
    if (searchPinRef.current) {
      searchPinRef.current.remove();
      searchPinRef.current = null;
    }
  };

  const activeTheme = NOTE_THEMES[draftTheme] || NOTE_THEMES.sakura;

  return (
    <div className="min-h-screen font-sans relative flex flex-col">
      {/* Background gradient — behind everything */}
      <div
        className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-[#0d0a1a] dark:via-[#140e2b] dark:to-[#0f0c24]"
        aria-hidden="true"
      />
      <div
        className="fixed -top-20 -left-20 w-72 h-72 bg-fuchsia-200/40 dark:bg-fuchsia-900/20 rounded-full blur-3xl animate-drift pointer-events-none -z-10"
        aria-hidden="true"
      />
      <div
        className="fixed top-1/3 -right-24 w-80 h-80 bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-3xl animate-drift animation-delay-2000 pointer-events-none -z-10"
        aria-hidden="true"
      />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-[60]">
        <div className="bg-white/55 dark:bg-[#130f28]/80 backdrop-blur-2xl border-b border-white/60 dark:border-white/10 shadow-glass">
          <div className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-semibold text-sm transition-colors group shrink-0"
            >
              <span className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/60 flex items-center justify-center transition-colors">
                <ArrowLeft size={16} />
              </span>
              <span className="hidden sm:inline">Back to Feed</span>
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <Logo size={34} />
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-transparent bg-clip-text truncate">
                FreeSpace Map
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-white/5 border border-purple-100/60 dark:border-violet-500/20 text-xs font-bold text-gray-600 dark:text-gray-300">
                <MapPin size={13} className="text-fuchsia-500" />
                {loading ? '…' : notes.length} active notes
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-300/70 dark:via-fuchsia-500/40 to-transparent" />
      </header>

      {/* ── MAP CONTAINER + FLOATING SEARCH BAR ── */}
      <main className="relative z-10 flex-1 px-3 sm:px-6 py-4 min-h-0">
        <div
          ref={mapContainerRef}
          className="w-full rounded-3xl overflow-hidden border border-white/60 shadow-glass-lg dark:border-white/10"
          style={{ height: 'calc(100vh - 130px)' }}
        />

        {/* ── FLOATING LOCATION & NOTE SEARCH BAR ── */}
        <div
          ref={searchDropdownRef}
          className="absolute top-7 left-1/2 -translate-x-1/2 z-30 w-[92%] sm:w-[480px] max-w-lg"
        >
          <div className="relative group">
            <div className="flex items-center bg-white/90 dark:bg-[#1a1535]/95 backdrop-blur-xl border border-purple-100/80 dark:border-violet-500/30 rounded-2xl shadow-glow transition-all duration-300 focus-within:ring-2 focus-within:ring-fuchsia-400/70 focus-within:border-fuchsia-400">
              <div className="pl-3.5 pr-2 text-fuchsia-500 dark:text-fuchsia-400">
                {isSearchingLocation ? (
                  <Loader2 size={18} className="animate-spin text-fuchsia-500" />
                ) : (
                  <Search size={18} />
                )}
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search location in PH or note..."
                className="w-full py-2.5 sm:py-3 bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-purple-300 dark:placeholder-purple-400/50 font-medium"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="p-1.5 mr-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}

              {/* My Location GPS Button */}
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={locating}
                title="Jump to My GPS Location"
                className="p-2 mr-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/60 active:scale-95 transition-all flex items-center justify-center"
              >
                {locating ? (
                  <Loader2 size={16} className="animate-spin text-fuchsia-500" />
                ) : (
                  <Navigation size={16} className="rotate-45" />
                )}
              </button>
            </div>

            {/* ── SEARCH RESULTS DROPDOWN ── */}
            {searchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-[#1a1535]/95 backdrop-blur-2xl border border-purple-100/80 dark:border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden max-h-[70vh] sm:max-h-[380px] overflow-y-auto z-40 animate-popIn">
                {/* Empty State / Quick Location Suggestions */}
                {!searchQuery.trim() && (
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-300 uppercase tracking-wider mb-2.5">
                      <Sparkles size={13} className="text-fuchsia-500" />
                      Popular Locations
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_LOCATIONS.map(item => {
                        const count = notes.filter(
                          n => getDistanceKm(item.lat, item.lng, n.latitude, n.longitude) <= 15
                        ).length;

                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => handleSelectLocation(item)}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-white/5 hover:bg-purple-100 dark:hover:bg-violet-900/40 text-xs font-medium text-gray-700 dark:text-gray-200 border border-purple-100/60 dark:border-violet-500/20 transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-95"
                          >
                            <Compass size={12} className="text-fuchsia-500" />
                            <span>{item.name}</span>
                            {count > 0 && (
                              <span className="ml-1 px-1.5 py-0.2 bg-fuchsia-500 text-white rounded-full text-[10px] font-bold">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── MATCHING ACTIVE NOTES SECTION ── */}
                {matchingNotes.length > 0 && (
                  <div className="p-2 border-b border-purple-100/50 dark:border-white/5">
                    <div className="px-2.5 py-1 text-[11px] font-bold text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare size={12} />
                      Matching Notes ({matchingNotes.length})
                    </div>
                    <div className="space-y-1 mt-1">
                      {matchingNotes.map(note => {
                        const itemIndex = combinedResults.findIndex(
                          c => c.type === 'note' && c.item.id === note.id
                        );
                        const isHighlighted = highlightedIndex === itemIndex;
                        const noteTheme = NOTE_THEMES[note.themeId] || NOTE_THEMES.sakura;

                        return (
                          <button
                            key={`note-${note.id}`}
                            type="button"
                            onClick={() => handleSelectNote(note)}
                            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                              isHighlighted
                                ? 'bg-fuchsia-100/70 dark:bg-fuchsia-900/40 text-fuchsia-900 dark:text-fuchsia-100'
                                : 'hover:bg-purple-50/80 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            <div
                              className="w-7 h-7 rounded-lg text-white flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-sm"
                              style={{ background: noteTheme.gradient }}
                            >
                              <span>{note.emoji || '📍'}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-purple-700 dark:text-fuchsia-300 truncate">
                                  {note.name}
                                </span>
                                <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                                  {fmtCountdown(note.expires_at)}
                                </span>
                              </div>
                              <p
                                className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 mt-0.5"
                                style={{ fontFamily: note.font }}
                              >
                                {note.displayMessage}
                              </p>
                            </div>
                            <ChevronRight size={14} className="text-gray-400 shrink-0 self-center" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── LOCATION / PLACE RESULTS SECTION ── */}
                {locationResults.length > 0 && (
                  <div className="p-2">
                    <div className="px-2.5 py-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Compass size={12} />
                      Places in Philippines ({locationResults.length})
                    </div>
                    <div className="space-y-1 mt-1">
                      {locationResults.map(loc => {
                        const itemIndex = combinedResults.findIndex(
                          c => c.type === 'location' && c.item.id === loc.id
                        );
                        const isHighlighted = highlightedIndex === itemIndex;

                        return (
                          <button
                            key={`loc-${loc.id}`}
                            type="button"
                            onClick={() => handleSelectLocation(loc)}
                            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 ${
                              isHighlighted
                                ? 'bg-purple-100/70 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100'
                                : 'hover:bg-purple-50/80 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                              <Compass size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-gray-800 dark:text-gray-100 truncate">
                                  {loc.name}
                                </span>
                                {loc.nearbyCount > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 text-[10px] font-bold shrink-0">
                                    {loc.nearbyCount} note{loc.nearbyCount > 1 ? 's' : ''} nearby
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {loc.displayName}
                              </p>
                            </div>
                            <ChevronRight size={14} className="text-gray-400 shrink-0 self-center" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── NO RESULTS STATE ── */}
                {searchQuery.trim().length >= 2 &&
                  !isSearchingLocation &&
                  matchingNotes.length === 0 &&
                  locationResults.length === 0 && (
                    <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
                      <p className="font-semibold text-gray-700 dark:text-gray-300">
                        No locations or notes found for "{searchQuery}"
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        Try searching for a Philippine city, province, town, or author name.
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Hint pill */}
        {!draftCoords && !loading && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 sm:bottom-8 z-10 max-w-[calc(100%-1.5rem)] px-3.5 sm:px-4 py-2 rounded-full bg-white/85 dark:bg-[#1c1838]/90 backdrop-blur-md border border-purple-100/70 dark:border-violet-400/20 text-[11px] sm:text-sm font-semibold text-gray-600 dark:text-gray-300 shadow-glass pointer-events-none whitespace-nowrap overflow-hidden text-ellipsis">
            🖱️ <span className="hidden sm:inline">Tap anywhere in the Philippines to leave an anonymous note</span>
            <span className="sm:hidden">Tap anywhere in the 🇵🇭 to leave a note</span>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 dark:bg-black/30 backdrop-blur-sm">
            <Loader2 size={34} className="text-fuchsia-500 animate-spin" />
          </div>
        )}
      </main>

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-semibold shadow-glow animate-popIn">
          {toast}
        </div>
      )}

      {/* ── PLACE-NOTE MODAL WITH CUSTOM FONTS, BORDERS & THEMES ── */}
      {draftCoords && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-popIn"
          onMouseDown={e => e.target === e.currentTarget && closeDraft()}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg bg-white/95 dark:bg-[#191436]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/60 dark:border-violet-500/20 relative my-auto max-h-[92vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 text-transparent bg-clip-text">
                  Drop a note here {draftEmoji}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {draftCoords.lat.toFixed(4)}°, {draftCoords.lng.toFixed(4)}° · visible for 5 hours
                </p>
              </div>

              <button
                type="button"
                onClick={closeDraft}
                className="w-8 h-8 rounded-full bg-purple-50 dark:bg-white/10 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 flex items-center justify-center transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Subtabs (Content vs Style) */}
            <div className="flex items-center gap-1.5 p-1 bg-purple-50/80 dark:bg-white/5 rounded-2xl mb-4 shrink-0 border border-purple-100/60 dark:border-violet-500/20">
              <button
                type="button"
                onClick={() => setModalTab('content')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  modalTab === 'content'
                    ? 'bg-white dark:bg-violet-600 text-purple-700 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-purple-600'
                }`}
              >
                <Sliders size={13} />
                <span>Message & Name</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('style')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  modalTab === 'style'
                    ? 'bg-white dark:bg-violet-600 text-purple-700 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-purple-600'
                }`}
              >
                <Palette size={13} />
                <span>Font & Border Style</span>
              </button>
            </div>

            {/* Modal Body Scroll Area */}
            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {modalTab === 'content' ? (
                <>
                  {/* Name field */}
                  <label className="block">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Name
                    </span>
                    <div className="relative mt-1">
                      <input
                        value={draftName}
                        onChange={e => {
                          if (!nameLocked) setDraftName(e.target.value.slice(0, 30));
                        }}
                        placeholder="Anonymous koala"
                        maxLength={30}
                        disabled={nameLocked}
                        className={`w-full px-4 py-2.5 sm:py-3 rounded-2xl bg-white/80 dark:bg-white/5 border border-purple-100/70 dark:border-violet-400/20 focus:ring-2 focus:ring-fuchsia-400/60 outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-purple-300 dark:placeholder-purple-500/40 transition-all ${
                          nameLocked ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                        required
                      />
                      {nameLocked && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-fuchsia-500">
                          🔒 Locked
                        </span>
                      )}
                    </div>
                    {!nameLocked && (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 float-right mt-1">
                        {draftName.length}/30
                      </span>
                    )}
                  </label>

                  {/* Message field */}
                  <label className="block clear-both">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Message
                    </span>
                    <textarea
                      value={draftMsg}
                      onChange={e => setDraftMsg(e.target.value.slice(0, 150))}
                      placeholder="What's on your mind at this spot?"
                      rows={3}
                      maxLength={150}
                      style={{ fontFamily: draftFont }}
                      className="mt-1 w-full px-4 py-3 rounded-2xl bg-white/80 dark:bg-white/5 border border-purple-100/70 dark:border-violet-400/20 focus:ring-2 focus:ring-fuchsia-400/60 outline-none text-base sm:text-sm text-gray-800 dark:text-gray-100 placeholder-purple-300 dark:placeholder-purple-500/40 resize-none transition-all"
                      required
                    />
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 float-right">
                      {draftMsg.length}/150
                    </span>
                  </label>

                  {/* Quick Sticker / Pin Icon Picker */}
                  <div className="clear-both pt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Pin Emoji
                      </span>
                      <span className="text-[11px] font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                        Selected: {draftEmoji}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 rounded-2xl bg-purple-50/50 dark:bg-white/5 border border-purple-100/60 dark:border-violet-500/10">
                      {STICKER_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setDraftEmoji(emoji)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all ${
                            draftEmoji === emoji
                              ? 'bg-fuchsia-500 text-white scale-110 shadow-glow-sm ring-2 ring-fuchsia-300'
                              : 'bg-white dark:bg-white/5 hover:bg-purple-100 dark:hover:bg-white/10 hover:scale-105'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* ── STYLE TAB (FONTS, COLOR THEMES, BORDER STYLES) ── */
                <div className="space-y-4">
                  {/* Font Family Selector */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                      <Type size={13} className="text-fuchsia-500" />
                      Font Family
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {NOTE_FONTS.map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setDraftFont(f.font)}
                          style={{ fontFamily: f.font }}
                          className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-center border truncate ${
                            draftFont === f.font
                              ? 'bg-fuchsia-500 text-white border-fuchsia-500 shadow-glow-sm scale-[1.02]'
                              : 'bg-purple-50/70 dark:bg-white/5 border-purple-100/60 dark:border-violet-500/20 text-gray-700 dark:text-gray-200 hover:bg-purple-100 dark:hover:bg-white/10'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color & Border Theme Palette */}
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                      <Palette size={13} className="text-fuchsia-500" />
                      Color & Pin Theme
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(NOTE_THEMES).map(([key, theme]) => {
                        const isSelected = draftTheme === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setDraftTheme(key)}
                            className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-left ${
                              isSelected
                                ? 'border-fuchsia-500 bg-fuchsia-50/80 dark:bg-fuchsia-950/30 ring-2 ring-fuchsia-400/50'
                                : 'border-purple-100/60 dark:border-violet-500/20 bg-white/60 dark:bg-white/5 hover:bg-purple-50 dark:hover:bg-white/10'
                            }`}
                          >
                            <span
                              className="w-5 h-5 rounded-full shrink-0 shadow-sm flex items-center justify-center text-[10px] text-white font-bold"
                              style={{ background: theme.gradient }}
                            >
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 truncate">
                              {theme.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Border Style Selector */}
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">
                      Border Style
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {BORDER_STYLES.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setDraftBorderStyle(b.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center gap-1 ${
                            draftBorderStyle === b.id
                              ? 'bg-fuchsia-500 text-white border-fuchsia-500 shadow-glow-sm scale-[1.02]'
                              : 'bg-purple-50/70 dark:bg-white/5 border-purple-100/60 dark:border-violet-500/20 text-gray-700 dark:text-gray-200 hover:bg-purple-100'
                          }`}
                        >
                          <span className="text-sm">{b.icon}</span>
                          <span className="text-[10px]">{b.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── LIVE PREVIEW BOX ── */}
              <div className="pt-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fuchsia-600 dark:text-fuchsia-400 mb-1.5">
                  <Eye size={13} />
                  Live Note Preview
                </div>
                <div
                  className={`p-3.5 rounded-2xl bg-gradient-to-br ${activeTheme.cardBg} bg-white/70 dark:bg-[#120d2a]/80 backdrop-blur-md transition-all fs-border-${draftBorderStyle}`}
                  style={{
                    borderColor: activeTheme.primary,
                    boxShadow:
                      draftBorderStyle === 'glowing'
                        ? `0 0 16px ${activeTheme.glow}`
                        : 'none',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-6 h-6 rounded-lg text-white flex items-center justify-center text-xs shadow-sm"
                      style={{ background: activeTheme.gradient }}
                    >
                      {draftEmoji}
                    </span>
                    <span
                      className="font-extrabold text-xs"
                      style={{ color: activeTheme.primary }}
                    >
                      {draftName.trim() || 'Anonymous author'}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto font-medium">
                      🕒 in 5h 0m
                    </span>
                  </div>
                  <p
                    className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed break-words"
                    style={{ fontFamily: draftFont }}
                  >
                    {draftMsg.trim() || 'Your message will appear here with selected font and border style.'}
                  </p>
                </div>
              </div>
            </div>

            {postError && (
              <p className="text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 rounded-xl px-3 py-2 mt-3 shrink-0">
                {postError}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={posting || !draftName.trim() || !draftMsg.trim()}
              style={{
                background:
                  !draftName.trim() || !draftMsg.trim()
                    ? undefined
                    : activeTheme.gradient,
              }}
              className="mt-4 w-full py-3.5 rounded-2xl font-bold text-white shadow-glow hover:shadow-glow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:hover:scale-100 transition-all duration-300 flex items-center justify-center gap-2 shrink-0 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500"
            >
              {posting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Placing note…
                </>
              ) : (
                <>📌 Pin my styled note</>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default MapPage;
