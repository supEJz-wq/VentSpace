import React, { useState, useEffect } from 'react';
import { Shield, LogOut, BookOpen, MessageSquare, Image, BarChart3, FileText, Map as MapIcon, Settings as SettingsIcon, Eye, EyeOff, KeyRound, ClipboardPaste } from 'lucide-react';
import useIsDark from '../lib/useIsDark';
import Logo from '../Components/Logo';
import ThemeToggle from '../Components/ThemeToggle';
import AdminStats from '../Components/Admin/AdminStats';
import ModerationTable from '../Components/Admin/ModerationTable';
import ControlPanel from '../Components/Admin/ControlPanel';
import AdminGuidelines from '../Components/Admin/AdminGuidelines';
import FeedbackReportsTable from '../Components/Admin/FeedbackReportsTable';
import PostcardsTable from '../Components/Admin/PostcardsTable';
import MapNotesTable from '../Components/Admin/MapNotesTable';
import { supabase } from '../lib/supabase';
import { loginAdmin, logoutAdmin, copyAdminPassword } from '../lib/api';
import { onPresenceChange } from '../lib/presence';
import { getDeviceId } from '../lib/identity';
import {
  fetchPosts, deletePost, purgeExpiredPosts,
  fetchReportedIds, unreportPost,
  fetchSettings, updateSetting,
  resetIdentity, hardDeletePostsByDevice, hardResetDatabase,
  unlockAllNames, deleteAllPostsAdmin, deleteAllMapNotesAdmin,
  fetchAllMapNotesAdmin, deleteMapNoteAdmin,
  fetchBugReports, deleteBugReport, deleteBugReports,
  fetchPostcards, deletePostcard, deletePostcards
} from '../lib/api';

const TABS = [
  { id: 'moderation', label: 'Dashboard', icon: BarChart3 },
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'mapnotes', label: 'Map Notes', icon: MapIcon },
  { id: 'postcards', label: 'Postcards', icon: Image },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'guidelines', label: 'Guidelines', icon: BookOpen },
];

const PAGE_META = {
  moderation: {
    title: 'Command Center',
    desc: 'Community overview, live stats and quick actions.',
  },
  posts: {
    title: 'Posts',
    desc: 'Moderate feed posts — review reports, delete or reset users.',
  },
  postcards: {
    title: 'Postcard Wall',
    desc: 'Every postcard shared to the community wall.',
  },
  mapnotes: {
    title: 'Map Notes',
    desc: 'Every pin on the FreeSpace Map — review and remove for safety.',
  },
  feedback: {
    title: 'Feedback & Bug Reports',
    desc: "What the community reported, suggested and broke.",
  },
  settings: {
    title: 'Settings',
    desc: 'Auto-delete window, blacklisted words and danger zone.',
  },
  guidelines: {
    title: 'Guidelines',
    desc: 'House rules and how the admin tools work.',
  },
};

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [allPosts, setAllPosts] = useState([]);
  const [reportedPostIds, setReportedPostIds] = useState([]);
  const [blacklistedWords, setBlacklistedWords] = useState(['spam', 'hate']);
  const [settings, setSettings] = useState({ autoDeleteHours: 10 });
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [activeAdminTab, setActiveAdminTab] = useState('moderation');
  const [bugReports, setBugReports] = useState([]);
  const [postcards, setPostcards] = useState([]);
  const [mapNotes, setMapNotes] = useState([]);

  const isDark = useIsDark();

  // ========== AUTH CHECK ==========
  // Flag lives in sessionStorage → closing the tab logs out automatically.
  // A refresh (F5) keeps you logged in; only closing the window/tab ends it.
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('freespace_admin_auth');
    if (savedAuth === 'true') setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      const [posts, reportedIds, s, feedback, fetchedPostcards, fetchedMapNotes] = await Promise.all([
        fetchPosts(),
        fetchReportedIds(),
        fetchSettings(),
        fetchBugReports(),
        fetchPostcards(),
        fetchAllMapNotesAdmin(),
      ]);
      setAllPosts(posts);
      setReportedPostIds(reportedIds);
      setBugReports(feedback);
      setPostcards(fetchedPostcards);
      setMapNotes(fetchedMapNotes || []);
      if (s.blacklisted_words) setBlacklistedWords(s.blacklisted_words);
      if (s.auto_delete_hours) setSettings(prev => ({ ...prev, autoDeleteHours: s.auto_delete_hours }));
    };
    load();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const postsChannel = supabase
      .channel('admin-posts-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        async () => { setAllPosts(await fetchPosts()); })
      .subscribe();
    const feedbackChannel = supabase
      .channel('admin-feedback-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bug_reports' },
        async () => { setBugReports(await fetchBugReports()); })
      .subscribe();
    const postcardsChannel = supabase
      .channel('admin-postcards-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'postcards' },
        async () => { setPostcards(await fetchPostcards()); })
      .subscribe();
    const mapNotesChannel = supabase
      .channel('admin-map-notes-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'map_notes' },
        async () => { setMapNotes((await fetchAllMapNotesAdmin()) || []); })
      .subscribe();
    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(feedbackChannel);
      supabase.removeChannel(postcardsChannel);
      supabase.removeChannel(mapNotesChannel);
    };
  }, [isAuthenticated]);

  // ========== REAL ONLINE USERS (Supabase Presence) ==========
  // Counts unique devices broadcasting on the presence channel.
  // Admin's own device is excluded so the stat reflects visitors only.
  useEffect(() => {
    if (!isAuthenticated) return;
    const myDevice = getDeviceId();
    const unsubscribe = onPresenceChange(users =>
      setOnlineUsers(users.filter(u => u.device_id !== myDevice).length)
    );
    return unsubscribe;
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    // Clean clipboard artifacts (trailing newline/space/quotes) before sending.
    let clean = String(passwordInput ?? '').trim();
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.slice(1, -1).trim();
    }
    const ok = await loginAdmin(clean);
    if (ok) {
      setIsAuthenticated(true);
      sessionStorage.setItem('freespace_admin_auth', 'true');
      setError('');
      setPasswordInput('');
    } else {
      setError('Incorrect password. Access denied. Tip: open .env and try ADMIN_BACKUP_PASSWORD — paste without extra spaces.');
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    const newPassword = await logoutAdmin();
    setIsAuthenticated(false);
    sessionStorage.removeItem('freespace_admin_auth');
    if (newPassword) {
      alert(`Logged out.\n\nPrimary password rotated — new one copied to clipboard:\n${newPassword}\n\nBackup password in .env still works too.`);
    }
  };

  const handleCopyPassword = async (which) => {
    const pw = await copyAdminPassword(which);
    if (pw) {
      alert(`${which === 'backup' ? 'Backup' : 'Primary'} password copied to clipboard!\n\n${pw}\n\n(Also saved in .env — paste without extra spaces.)`);
    } else {
      alert('Could not copy. Open .env and copy ADMIN_' + (which === 'backup' ? 'BACKUP_' : '') + 'PASSWORD manually.');
    }
  };

  // Login-screen clipboard flow: server auto-copies the password to the OS
  // clipboard on boot/logout (local dev = same machine). This pastes it
  // straight into the password field — no server roundtrip needed.
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        let clean = text.trim();
        if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
          clean = clean.slice(1, -1).trim();
        }
        setPasswordInput(clean);
        setError('');
      } else {
        setError('Clipboard is empty. The server copies the password on start/logout — then press this again.');
      }
    } catch {
      setError('Browser blocked clipboard read. Just press Ctrl+V directly into the password field.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post permanently?')) return;
    await deletePost(postId);
    setAllPosts(prev => prev.filter(p => p.id !== postId));
    setReportedPostIds(prev => prev.filter(id => id !== postId));
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('WARNING: Delete ALL posts? This cannot be undone!')) return;
    await Promise.all(allPosts.map(p => deletePost(p.id)));
    setAllPosts([]);
    setReportedPostIds([]);
  };

  const handlePurgeExpired = async () => {
    if (!window.confirm('This will permanently delete all posts older than the auto-delete window. Proceed?')) return;
    await purgeExpiredPosts();
    setAllPosts(await fetchPosts());
    alert('Expired posts purged successfully!');
  };

  const handleBulkDelete = async (postIds) => {
    if (postIds.length === 0) return;
    if (!window.confirm(`Delete ${postIds.length} selected posts?`)) return;
    await Promise.all(postIds.map(id => deletePost(id)));
    setAllPosts(prev => prev.filter(p => !postIds.includes(p.id)));
    setReportedPostIds(prev => prev.filter(id => !postIds.includes(id)));
  };

  const handleResetUser = async (deviceId) => {
    if (!window.confirm("Unlock this user's name and clear their post history?")) return;
    await resetIdentity(deviceId);
    await hardDeletePostsByDevice(deviceId);
    setAllPosts(await fetchPosts());
    alert("User has been reset.");
  };

  const handleHardReset = async () => {
    if (!window.confirm("NUCLEAR RESET: This will delete ALL posts and UNLOCK ALL names. Are you 100% sure?")) return;
    const pass = window.prompt("Type 'RESET' to confirm:");
    if (pass !== 'RESET') return;
    // NOTE: req() resolves null (never throws) when the server rejects the
    // call — e.g. admin token older than 1h or issued before a server restart
    // (tokens live in server memory). A null here means NOTHING was wiped, so
    // fail loudly instead of fake-celebrating below.
    const result = await hardResetDatabase();
    if (!result?.ok) {
      alert("Nuclear reset FAILED — the server rejected it (usually: admin session expired or server restarted since login).\n\nNothing was wiped. Log out, log back in, then try again.");
      return;
    }
    // ── Local refresh: the server just wiped posts (→ 5-post limit back to 0)
    // and device identities (→ name locks gone). Drop this browser's stale
    // copies too, clear every admin table, then reload so all timers/counts
    // re-render from the now-empty database.
    try {
      localStorage.removeItem('freespace_username_data');
      localStorage.removeItem('freespace_username');
      localStorage.removeItem('ventspace_my_posts');
      localStorage.removeItem('ventspace_my_comments');
    } catch { /* private-mode storage: reload still refreshes */ }
    setAllPosts([]);
    setReportedPostIds([]);
    setBugReports([]);
    setPostcards([]);
    setMapNotes([]);
    alert("The entire database has been wiped. Name locks and post limits are reset — refreshing.");
    window.location.reload();
  };

  const handleUnlockAllNames = async () => {
    if (!window.confirm('Unlock ALL names? Every user can immediately choose a new name.')) return;
    await unlockAllNames();
    alert('✅ All name locks have been reset.');
  };

  const handleDeleteAllPostsFast = async () => {
    if (!window.confirm('Delete ALL posts (including their comments)? This cannot be undone!')) return;
    await deleteAllPostsAdmin();
    setAllPosts([]);
    setReportedPostIds([]);
    alert('🗑️ All posts have been deleted.');
  };

  const handleDeleteAllMapNotes = async () => {
    if (!window.confirm('Delete ALL map notes? This cannot be undone!')) return;
    await deleteAllMapNotesAdmin();
    setMapNotes([]);
    alert('🗺️ All map notes have been deleted.');
  };

  const handleDeleteMapNote = async (id) => {
    await deleteMapNoteAdmin(id);
    setMapNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleClearReport = async (postId) => {
    await unreportPost(postId);
    setReportedPostIds(prev => prev.filter(id => id !== postId));
  };

  const handleBulkApprove = async (postIds) => {
    if (postIds.length === 0) return;
    await Promise.all(postIds.map(id => unreportPost(id)));
    setReportedPostIds(prev => prev.filter(id => !postIds.includes(id)));
  };

  const handleAddWord = async (word) => {
    const lw = word.toLowerCase();
    if (blacklistedWords.includes(lw)) return;
    const updated = [...blacklistedWords, lw];
    setBlacklistedWords(updated);
    await updateSetting('blacklisted_words', updated);
  };

  const handleRemoveWord = async (wordToRemove) => {
    const updated = blacklistedWords.filter(w => w !== wordToRemove);
    setBlacklistedWords(updated);
    await updateSetting('blacklisted_words', updated);
  };

  const handleSettingsChange = async (newSettings) => {
    const oldSettings = { ...settings };
    setSettings(newSettings);
    if (newSettings.autoDeleteHours !== oldSettings.autoDeleteHours) {
      await updateSetting('auto_delete_hours', newSettings.autoDeleteHours);
    }
  };

  const handleDeleteFeedback = async (id) => {
    await deleteBugReport(id);
    setBugReports(prev => prev.filter(r => r.id !== id));
  };

  const handleBulkDeleteFeedback = async (ids) => {
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected report(s)?`)) return;
    await deleteBugReports(ids);
    setBugReports(prev => prev.filter(r => !ids.includes(r.id)));
  };

  const handleDeleteAllFeedback = async (ids) => {
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ALL ${ids.length} report(s)? This cannot be undone!`)) return;
    await deleteBugReports(ids);
    setBugReports(prev => prev.filter(r => !ids.includes(r.id)));
  };

  const handleDeletePostcard = async (id) => {
    if (!window.confirm('Delete this postcard?')) return;
    await deletePostcard(id);
    setPostcards(prev => prev.filter(p => p.id !== id));
  };

  const handleBulkDeletePostcards = async (ids) => {
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected postcards?`)) return;
    await deletePostcards(ids);
    setPostcards(prev => prev.filter(p => !ids.includes(p.id)));
  };

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500 ${isDark ? 'bg-[#0b0a1a]' : 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50'}`}>
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-drift" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-drift animation-delay-2000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl animate-drift animation-delay-4000" />
        </div>

        <div className={`relative z-10 w-full max-w-md p-8 rounded-3xl border backdrop-blur-2xl transition-all duration-500 ${isDark ? 'bg-white/[0.04] border-white/10 shadow-[0_0_80px_rgba(139,92,246,0.08)]' : 'bg-white/60 border-white/60 shadow-glass-lg'}`}>
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 transition-all duration-500 ${isDark ? 'bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 shadow-[0_0_40px_rgba(139,92,246,0.2)]' : 'bg-gradient-to-br from-rose-100 to-pink-100'}`}>
              <Logo size={44} className="rounded-xl" />
            </div>
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Dashboard</span>
            </h1>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Enter your admin password to access the control panel.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setError(''); }}
                placeholder=" "
                autoComplete="current-password"
                className={`peer w-full px-5 py-4 pr-12 rounded-2xl border-2 text-sm font-medium outline-none transition-all duration-300 ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-violet-500 focus:shadow-[0_0_20px_rgba(139,92,246,0.15)]' : 'bg-white/80 border-gray-200 text-gray-900 focus:border-rose-400 focus:shadow-[0_0_20px_rgba(244,63,94,0.1)]'} placeholder-transparent`}
                required
              />
              <label className={`absolute left-5 top-4 text-sm pointer-events-none transition-all duration-200 ${isDark ? 'text-gray-500' : 'text-gray-400'} peer-focus:-translate-y-6 peer-focus:text-xs peer-focus:font-bold peer-focus:text-violet-400 peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold`}>
                Admin Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-200' : 'text-gray-400 hover:text-gray-700'}`}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                <Shield size={16} /> {error}
              </div>
            )}

            <button
              type="button"
              onClick={handlePasteClipboard}
              className={`w-full py-3 rounded-2xl font-bold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2 ${isDark ? 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-gray-100 border border-gray-200 text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
            >
              <ClipboardPaste size={14} /> Copy clipboard password into field
            </button>

            <div className={`px-4 py-3 rounded-xl text-xs leading-relaxed flex items-start gap-2 ${isDark ? 'bg-white/5 border border-white/10 text-gray-400' : 'bg-gray-50 border border-gray-200 text-gray-500'}`}>
              <KeyRound size={14} className="mt-0.5 shrink-0" />
              <span>
                Clipboard not working? Open <code className="font-bold">.env</code> and use
                the <code className="font-bold">ADMIN_BACKUP_PASSWORD</code> instead — paste
                without extra spaces or quotes.
              </span>
            </div>

            <button
              type="submit"
              disabled={loginLoading || !passwordInput}
              className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-[0_0_40px_rgba(139,92,246,0.25)] hover:scale-[1.02] active:scale-[0.98]' : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-[0_0_30px_rgba(244,63,94,0.2)] hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              {loginLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : 'Enter Dashboard'}
            </button>
          </form>

          <p className={`text-center text-xs mt-6 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Server-side authenticated. No credentials exposed to client.
          </p>
        </div>
      </div>
    );
  }

  const tabCounts = {
    moderation: null,
    posts: allPosts.length,
    mapnotes: mapNotes.length,
    postcards: postcards.length,
    feedback: bugReports.length,
    settings: null,
    guidelines: null,
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-[#0b0a1a]' : 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50'}`}>
      {/* Subtle background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-fuchsia-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen">

        {/* ═══ LEFT SIDEBAR (desktop) ═══ */}
        <aside className={`hidden md:flex sticky top-0 h-screen w-[232px] shrink-0 flex-col border-r backdrop-blur-xl transition-all duration-300 ${isDark ? 'bg-white/[0.02] border-white/8' : 'bg-white/40 border-white/60'}`}>
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <Logo size={30} className="rounded-lg shrink-0" />
            <div className="leading-tight min-w-0">
              <p className={`text-sm font-extrabold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>VentSpace</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-500">Admin</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeAdminTab === tab.id;
              const count = tabCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`relative w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${active
                    ? (isDark
                      ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/15 text-white shadow-[0_0_18px_rgba(139,92,246,0.12)]'
                      : 'bg-white text-gray-900 shadow-sm border border-purple-100')
                    : (isDark
                      ? 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/70')}`}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-gradient-to-b from-violet-500 to-fuchsia-500" />}
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{tab.label}</span>
                  {count !== null && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${active ? (isDark ? 'bg-violet-500/25 text-violet-200' : 'bg-rose-100 text-rose-600') : (isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Logout pinned bottom */}
          <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <div className={`shrink-0 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/70'} border ${isDark ? 'border-white/8' : 'border-gray-200'}`}>
              <ThemeToggle />
            </div>
            <button
              onClick={handleLogout}
              className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </aside>

        {/* ═══ MAIN ═══ */}
        <div className="flex-1 min-w-0">

          {/* Mobile top nav */}
          <div className={`md:hidden sticky top-0 z-20 flex items-center gap-2 px-4 py-3 overflow-x-auto border-b backdrop-blur-xl ${isDark ? 'bg-[#0b0a1a]/90 border-white/8' : 'bg-white/70 border-white/60'}`}>
            <Logo size={26} className="rounded-lg shrink-0 mr-1" />
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeAdminTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${active
                    ? (isDark ? 'bg-white/10 text-white' : 'bg-white text-gray-900 shadow-sm border border-gray-200')
                    : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-800')}`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
            <div className={`shrink-0 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/70'} border ${isDark ? 'border-white/8' : 'border-gray-200'} ml-1`}>
              <ThemeToggle />
            </div>
            <button
              onClick={handleLogout}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold ${isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'}`}
            >
              <LogOut size={14} /> Exit
            </button>
          </div>

          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

            {/* ─── PAGE HEADER ─── */}
            <div className="flex items-center gap-3 mb-6">
              <div className="hidden sm:block">
                <h1 className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {PAGE_META[activeAdminTab].title}
                </h1>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {PAGE_META[activeAdminTab].desc}
                </p>
              </div>
              <h1 className={`sm:hidden text-lg font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {PAGE_META[activeAdminTab].title}
              </h1>
            </div>

            {/* ─── CONTENT ─── */}
            <div className={`animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              {activeAdminTab === 'moderation' && (
                <>
                  <AdminStats posts={allPosts} onlineUsers={onlineUsers} />

                  {/* ─── QUICK ACTIONS ─── */}
                  <h2 className={`mt-7 mb-3.5 text-base font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[
                      {
                        icon: '🧹', title: 'Purge Expired',
                        desc: 'Delete posts older than the auto-delete window.',
                        onClick: handlePurgeExpired,
                        cls: isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/15' : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100',
                      },
                      {
                        icon: '🔓', title: 'Reset All Hours',
                        desc: "Unlock everyone's 5-hour name lock right now.",
                        onClick: handleUnlockAllNames,
                        cls: isDark ? 'bg-sky-500/10 border-sky-500/20 text-sky-300 hover:bg-sky-500/15' : 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100',
                      },
                      {
                        icon: '🗑️', title: 'Delete All Posts',
                        desc: 'Wipe the whole feed, comments included.',
                        onClick: handleDeleteAllPostsFast,
                        cls: isDark ? 'bg-orange-500/10 border-orange-500/20 text-orange-300 hover:bg-orange-500/15' : 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100',
                      },
                      {
                        icon: '🗺️', title: 'Delete Map Notes',
                        desc: 'Clear every pin on the FreeSpace Map.',
                        onClick: handleDeleteAllMapNotes,
                        cls: isDark ? 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/15' : 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800 hover:bg-fuchsia-100',
                      },
                      {
                        icon: '☢️', title: 'Nuclear Reset',
                        desc: 'Wipe EVERYTHING — posts, names, postcards, map notes.',
                        onClick: handleHardReset,
                        cls: isDark ? 'bg-red-500/10 border-red-500/25 text-red-300 hover:bg-red-500/15' : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
                      },
                    ].map(a => (
                      <button
                        key={a.title}
                        onClick={a.onClick}
                        className={`group flex items-start gap-3 p-4 rounded-2xl border text-left transition-all duration-300 ${a.cls}`}
                      >
                        <span className="text-xl leading-none mt-0.5">{a.icon}</span>
                        <span className="min-w-0">
                          <span className="block font-bold text-sm">{a.title}</span>
                          <span className="block text-xs opacity-70 mt-0.5 leading-relaxed">{a.desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeAdminTab === 'posts' && (
                <ModerationTable
                  posts={allPosts}
                  onDeletePost={handleDeletePost}
                  onDeleteAll={handleDeleteAll}
                  reportedPostIds={reportedPostIds}
                  onClearReport={handleClearReport}
                  onBulkDelete={handleBulkDelete}
                  onBulkApprove={handleBulkApprove}
                  onResetUser={handleResetUser}
                />
              )}

              {activeAdminTab === 'feedback' && (
                <FeedbackReportsTable
                  reports={bugReports}
                  onDeleteReport={handleDeleteFeedback}
                  onBulkDeleteReports={handleBulkDeleteFeedback}
                  onDeleteAllReports={handleDeleteAllFeedback}
                />
              )}

          {activeAdminTab === 'postcards' && (
            <PostcardsTable
              postcards={postcards}
              onDeletePostcard={handleDeletePostcard}
              onBulkDelete={handleBulkDeletePostcards}
            />
          )}

          {activeAdminTab === 'mapnotes' && (
            <MapNotesTable
              notes={mapNotes}
              onDeleteNote={handleDeleteMapNote}
            />
          )}

              {activeAdminTab === 'settings' && (
                <div className="max-w-3xl space-y-4">
                  {/* ─── PASSWORD MANAGER (both passwords copy via browser clipboard) ─── */}
                  <div className={`rounded-2xl border backdrop-blur-xl p-6 transition-all duration-300 ${isDark ? 'bg-white/[0.03] border-white/8' : 'bg-white/60 border-white/60 shadow-glass'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/15' : 'bg-emerald-100'}`}>
                        <KeyRound size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                      </div>
                      <h2 className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Admin Passwords
                      </h2>
                    </div>
                    <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <b>Primary</b> rotates every logout. <b>Backup</b> (ADMIN_BACKUP_PASSWORD in .env)
                      never rotates — your 2nd option when clipboard copy fails.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCopyPassword('primary')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white' : 'bg-gray-100 border border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                      >
                        📋 Copy primary password
                      </button>
                      <button
                        onClick={() => handleCopyPassword('backup')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/15' : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}
                      >
                        📋 Copy backup password
                      </button>
                    </div>
                  </div>
                  <ControlPanel
                    settings={settings}
                    onSettingsChange={handleSettingsChange}
                    blacklistedWords={blacklistedWords}
                    onAddWord={handleAddWord}
                    onRemoveWord={handleRemoveWord}
                  />
                </div>
              )}

              {activeAdminTab === 'guidelines' && (
                <div className="max-w-4xl">
                  <AdminGuidelines />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
