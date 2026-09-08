import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from '../Components/Header';
import LeftSidebar from '../Components/LeftSidebar';
import MoodRail from '../Components/MoodRail';
import ExploreSheet from '../Components/ExploreSheet';
import Feed from '../Components/Feed';
import RightSidebar from '../Components/RightSidebar';
import PostModal from '../Components/PostModal';
import BugReportModal from '../Components/BugReportModal'; // Added BugReportModal
import { supabase } from '../lib/supabase';
import {
  fetchPosts, createPost, deletePost,
  incrementLikes, addReactionDB, addCommentDB, addReplyDB, deleteCommentDB,
  fetchReportedIds, reportPost, unreportPost,
  fetchSettings, updateSetting,
  addCommentReactionDB,
} from '../lib/api';
import { Bug, Lightbulb, X } from 'lucide-react';
import { getStoredUsername } from '../lib/identity';

const getMyCommentName = () => getStoredUsername()?.name || 'You';

function Dashboard() {
  // ========== STATE ==========
  const [posts, setPosts]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [activeMood, setActiveMood]         = useState('All Thoughts');
  const [searchQuery, setSearchQuery]       = useState('');
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [bugModalMode, setBugModalMode]     = useState('bug'); // Added bugModalMode
  const [activeTag, setActiveTag]           = useState(null);

  // ... (rest of the code)

  const openBugModal = (mode) => {
    setBugModalMode(mode);
    setIsBugModalOpen(true);
  };
  const [activeContributor, setActiveContributor] = useState(null);
  const [currentPage, setCurrentPage]       = useState(1);
  const POSTS_PER_PAGE = 4;

  const [myPostIds, setMyPostIds] = useState(() => {
    // Clear stale mock-data IDs when switching to Supabase backend
    const version = localStorage.getItem('ventspace_version');
    if (version !== 'supabase-v1') {
      localStorage.removeItem('ventspace_my_posts');
      localStorage.setItem('ventspace_version', 'supabase-v1');
      return [];
    }
    const saved = localStorage.getItem('ventspace_my_posts');
    return saved ? JSON.parse(saved) : [];
  });

  const [myCommentIds, setMyCommentIds] = useState(() => {
    const saved = localStorage.getItem('ventspace_my_comments');
    return saved ? JSON.parse(saved) : [];
  });

  const trackMyComment = (commentId) => {
    setMyCommentIds(prev => {
      if (prev.includes(commentId)) return prev;
      const updated = [...prev, commentId];
      localStorage.setItem('ventspace_my_comments', JSON.stringify(updated));
      return updated;
    });
  };

  const untrackMyComments = (commentIds) => {
    setMyCommentIds(prev => {
      const updated = prev.filter(id => !commentIds.includes(id));
      localStorage.setItem('ventspace_my_comments', JSON.stringify(updated));
      return updated;
    });
  };

  const [reportedPostIds, setReportedPostIds] = useState([]);
  const [blacklistedWords, setBlacklistedWords] = useState(['spam', 'hate']);
  const [autoDeleteHours, setAutoDeleteHours] = useState(10);

  const backgroundEmojis = ['🌸', '❤️‍🔥', '🕊️', '🥺', '☁️', '😻', '🦋'];

  // ========== SCROLL TO TOP ON MOUNT ==========
  useEffect(() => {
    // Disable browser scroll restoration so it doesn't auto-scroll down on refresh
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, []);

  // ========== INITIAL DATA LOAD ==========
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [fetchedPosts, reportedIds, settings] = await Promise.all([
        fetchPosts(),
        fetchReportedIds(),
        fetchSettings(),
      ]);
      setPosts(fetchedPosts);
      setReportedPostIds(reportedIds);
      if (settings.blacklisted_words) setBlacklistedWords(settings.blacklisted_words);
      if (settings.auto_delete_hours !== undefined) setAutoDeleteHours(Number(settings.auto_delete_hours));
      setLoading(false);
    };
    load();
  }, []);


  // ========== REALTIME SUBSCRIPTION ==========
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async () => {
          const refreshed = await fetchPosts();
          setPosts(refreshed);
        })
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        async () => {
          const refreshed = await fetchPosts();
          setPosts(refreshed);
        })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ========== ADD POST ==========
  const addPost = async (newPost) => {
    const created = await createPost(newPost);
    if (!created) return;
    setPosts(prev => [created, ...prev]);
    setCurrentPage(1);
    const updatedMyIds = [created.id, ...myPostIds];
    setMyPostIds(updatedMyIds);
    localStorage.setItem('ventspace_my_posts', JSON.stringify(updatedMyIds));
  };

  // ========== DELETE POST ==========
  const handleDeletePost = async (postId) => {
    await deletePost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
    const updatedMyIds = myPostIds.filter(id => id !== postId);
    setMyPostIds(updatedMyIds);
    localStorage.setItem('ventspace_my_posts', JSON.stringify(updatedMyIds));
  };

  // ========== LIKE ==========
  const toggleLike = async (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    await incrementLikes(postId, post.likes);
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likes: p.likes + 1 } : p
    ));
  };

  // ========== REACTION ==========
  const addReaction = async (postId, emoji, prevEmoji) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const updated = await addReactionDB(postId, emoji, prevEmoji, post.reactions || {});
    if (!updated) return;
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, reactions: updated } : p
    ));
  };

  // ========== COMMENT ==========
  const addComment = async (postId, commentText) => {
    const comment = await addCommentDB(postId, getMyCommentName(), commentText);
    if (!comment) return;
    trackMyComment(comment.id);
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: [...p.comments, comment] }
        : p
    ));
  };

  const addReplyToTree = (comments, parentId, reply) =>
    comments.map(comment => {
      if (comment.id === parentId) {
        return { ...comment, replies: [...(comment.replies || []), reply] };
      }
      if (comment.replies?.length) {
        return { ...comment, replies: addReplyToTree(comment.replies, parentId, reply) };
      }
      return comment;
    });

  const addReply = async (postId, parentCommentId, replyText) => {
    const reply = await addReplyDB(postId, parentCommentId, getMyCommentName(), replyText);
    if (!reply) return;
    trackMyComment(reply.id);
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: addReplyToTree(p.comments, parentCommentId, reply) }
        : p
    ));
  };

  const collectCommentIds = (comment) => [
    comment.id,
    ...(comment.replies || []).flatMap(collectCommentIds),
  ];

  const findCommentInTree = (comments, commentId) => {
    for (const comment of comments) {
      if (comment.id === commentId) return comment;
      const found = findCommentInTree(comment.replies || [], commentId);
      if (found) return found;
    }
    return null;
  };

  const removeCommentFromTree = (comments, commentId) =>
    comments
      .filter(c => c.id !== commentId)
      .map(c => ({
        ...c,
        replies: removeCommentFromTree(c.replies || [], commentId),
      }));

  const deleteComment = async (postId, commentId) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const target = findCommentInTree(post.comments, commentId);
    const canDelete = myCommentIds.includes(commentId)
      || target?.username === getMyCommentName();
    if (!canDelete) return;

    const ok = await deleteCommentDB(commentId);
    if (!ok) return;

    if (target) untrackMyComments(collectCommentIds(target));
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: removeCommentFromTree(p.comments, commentId) }
        : p
    ));
  };

  // ========== COMMENT REACTION ==========
  const updateCommentReactionInTree = (comments, commentId, updatedReactions) =>
    comments.map(comment => {
      if (comment.id === commentId) return { ...comment, reactions: updatedReactions };
      if (comment.replies?.length) {
        return { ...comment, replies: updateCommentReactionInTree(comment.replies, commentId, updatedReactions) };
      }
      return comment;
    });

  const addCommentReaction = async (postId, commentId, emoji, prevEmoji) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const comment = findCommentInTree(post.comments, commentId);
    if (!comment) return;
    const updated = await addCommentReactionDB(commentId, emoji, prevEmoji, comment.reactions || {});
    if (!updated) return;
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, comments: updateCommentReactionInTree(p.comments, commentId, updated) }
        : p
    ));
  };

  // ========== REPORT ==========
  const handleReportPost = async (postId) => {
    if (!reportedPostIds.includes(postId)) {
      await reportPost(postId);
      setReportedPostIds(prev => [...prev, postId]);
      alert('Post reported to admins. Thank you for keeping VentSpace safe!');
    } else {
      await unreportPost(postId);
      setReportedPostIds(prev => prev.filter(id => id !== postId));
    }
  };

  // ========== PAGINATION ==========
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ========== FILTER HANDLERS ==========
  const handleMoodChange      = (mood)  => { setActiveMood(mood); setActiveTag(null); setActiveContributor(null); setSearchQuery(''); setCurrentPage(1); };
  const handleSearchChange    = (query) => { setSearchQuery(query); setActiveTag(null); setActiveContributor(null); setActiveMood('All Thoughts'); setCurrentPage(1); };
  const handleTagClick        = (tag)   => { setActiveTag(tag); setActiveContributor(null); setActiveMood('All Thoughts'); setSearchQuery(''); setCurrentPage(1); };
  const handleContributorClick= (name)  => { setActiveContributor(name); setActiveTag(null); setActiveMood('All Thoughts'); setSearchQuery(''); setCurrentPage(1); };
  const clearFilters          = ()      => { setActiveTag(null); setActiveContributor(null); setActiveMood('All Thoughts'); setSearchQuery(''); setCurrentPage(1); };

  // ========== FILTERING LOGIC ==========
  const filteredPosts = useMemo(() => {
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return posts.filter(post => {
      const matchesMood = activeMood === 'All Thoughts' ||
        (activeMood === 'My Posts' ? myPostIds.includes(post.id) : post.mood === activeMood);
      const matchesSearch =
        post.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.mood.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = !activeTag || post.text.toLowerCase().includes(activeTag.toLowerCase());
      const matchesContributor = !activeContributor || post.username === activeContributor;
      return matchesMood && matchesSearch && matchesTag && matchesContributor;
    }).map(post => {
      let censoredText = post.text;
      blacklistedWords.forEach(word => {
        if (!word.trim()) return;
        const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
        censoredText = censoredText.replace(regex, match => '*'.repeat(match.length));
      });
      return { ...post, text: censoredText };
    });
  }, [posts, activeMood, searchQuery, activeTag, activeContributor, myPostIds, blacklistedWords]);

  // ========== PAGINATION SLICING ==========
  const totalPages   = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const currentPosts = filteredPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  // ========== SIDEBAR DATA ==========
  const moodData = useMemo(() => {
    const counts = { Happy: 0, Sad: 0, Angry: 0, Hopeful: 0, Anxious: 0 };
    posts.forEach(p => { if (counts[p.mood] !== undefined) counts[p.mood]++; });
    const total = posts.length;
    return Object.keys(counts).map(name => ({
      name,
      value: total > 0 ? Math.round((counts[name] / total) * 100) : 0,
      count: counts[name],
    }));
  }, [posts]);

  // Recent Activity — most recent unique posters (newest first), with their mood
  const recentActivity = useMemo(() => {
    const seen = new Set();
    const users = [];
    posts.forEach(p => {           // posts arrive newest-first
      if (!seen.has(p.username)) {
        seen.add(p.username);
        users.push({ name: p.username, mood: p.mood });
      }
    });
    return users.slice(0, 5);
  }, [posts]);

  // Recent Topics — hashtags in order of most recent use (deduped)
  const recentTopics = useMemo(() => {
    const seen = new Set();
    const topics = [];
    posts.forEach(p => {           // newest-first, so first sighting = most recent
      const matches = p.text.match(/#\w+/g);
      if (matches) matches.forEach(tag => {
        const t = tag.toLowerCase();
        if (!seen.has(t)) { seen.add(t); topics.push(t); }
      });
    });
    return topics.slice(0, 8);
  }, [posts]);

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 font-sans text-gray-800 relative overflow-hidden">

      {/* BACKGROUND MESH BLOBS + FLOATING EMOJIS */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-300/30 to-fuchsia-200/30 blur-3xl animate-drift" />
        <div className="absolute top-[40%] right-[-8%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-pink-200/30 to-rose-200/30 blur-3xl animate-drift" style={{ animationDelay: '6s' }} />
        <div className="absolute bottom-[-5%] left-[30%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-200/25 to-violet-200/25 blur-3xl animate-drift" style={{ animationDelay: '12s' }} />
        {backgroundEmojis.map((emoji, i) => (
          <div key={i}
            className="absolute text-5xl opacity-15 animate-float"
            style={{
              top: `${(i * 13 + 8) % 85}%`,
              left: `${(i * 17 + 5) % 85}%`,
              animationDelay: `${i * 0.9}s`,
              animationDuration: `${5 + i * 0.7}s`,
            }}>
            {emoji}
          </div>
        ))}
      </div>

      <PostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onPost={addPost} 
        autoDeleteHours={autoDeleteHours}
      />

      <BugReportModal 
        isOpen={isBugModalOpen} 
        onClose={() => setIsBugModalOpen(false)} 
        initialMode={bugModalMode}
      />

      {/* Mobile Explore sheet — mounted only while open (see ExploreSheet) */}
      {isExploreOpen && (
        <ExploreSheet
          onClose={() => setIsExploreOpen(false)}
          activeTag={activeTag}
          onTagClick={handleTagClick}
          activeContributor={activeContributor}
          onContributorClick={handleContributorClick}
          recentActivity={recentActivity}
          recentTopics={recentTopics}
          moodData={moodData}
        />
      )}

      <div className="relative z-10">
        {/* FLOATING FEEDBACK BUTTONS */}
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2.5 sm:gap-3 items-end">
          <button
            onClick={() => openBugModal('suggestion')}
            className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-white/80 backdrop-blur-xl rounded-full shadow-glass border border-amber-200/60 text-amber-500 hover:bg-amber-50 hover:shadow-glass-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 group"
          >
            <span className="hidden sm:inline text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Have an Idea?</span>
            <Lightbulb size={18} className="sm:group-hover:rotate-12 transition-transform duration-300" />
          </button>
          <button
            onClick={() => openBugModal('bug')}
            className="flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-white/80 backdrop-blur-xl rounded-full shadow-glass border border-red-200/60 text-red-500 hover:bg-red-50 hover:shadow-glass-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 group"
          >
            <span className="hidden sm:inline text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Got a Bug?</span>
            <Bug size={18} className="sm:group-hover:rotate-12 transition-transform duration-300" />
          </button>
        </div>

        <Header 
          openModal={() => setIsModalOpen(true)} 
          searchQuery={searchQuery} 
          setSearchQuery={handleSearchChange} 
        />

        {/* ACTIVE FILTER BANNER */}
        {(activeTag || activeContributor) && (
          <div className="max-w-[1400px] mx-auto px-3 sm:px-6 mt-4">
            <div className="glass-card px-5 py-3 flex items-center justify-between animate-fadeInUp">
              <span className="text-sm text-purple-700 font-semibold">
                Showing posts {activeTag ? <span className="text-fuchsia-600">for {activeTag}</span> : <span className="text-fuchsia-600">by {activeContributor}</span>}
              </span>
              <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-all duration-300">
                <X size={13} /> Clear Filter
              </button>
            </div>
          </div>
        )}

        {/* MOBILE DISCOVER — sidebars are lg+ only, so phones/tablets get the
            mood rail + Explore sheet trigger instead (above the feed). */}
        <div className="lg:hidden max-w-[1400px] mx-auto px-3 sm:px-6 pt-4 space-y-2.5">
          <MoodRail activeMood={activeMood} onSelect={handleMoodChange} moodData={moodData} />
          <button
            onClick={() => setIsExploreOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/70 border border-purple-100/70 text-xs font-bold text-purple-600 hover:bg-white active:scale-[0.99] transition-all shadow-glass"
          >
            <span aria-hidden="true">✨</span>
            Explore topics, activity &amp; vibe
          </button>
        </div>

        {/* MAIN 3-COLUMN LAYOUT */}
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_300px] gap-6 lg:gap-8 items-start">

          {/* LEFT SIDEBAR — sticky */}
          <div className="hidden lg:block sticky top-24">
            <LeftSidebar activeMood={activeMood} setActiveMood={handleMoodChange} moodData={moodData} />
          </div>

          {/* FEED */}
          <div className="min-w-0 max-w-[700px] mx-auto w-full">
            {loading ? (
              <div className="glass-card p-16 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-fuchsia-500 animate-spin" />
                <p className="text-gray-400 font-medium text-sm">Loading thoughts...</p>
              </div>
            ) : (
              <Feed
                posts={currentPosts}
                toggleLike={toggleLike}
                addComment={addComment}
                addReply={addReply}
                deleteComment={deleteComment}
                myCommentIds={myCommentIds}
                addReaction={addReaction}
                addCommentReaction={addCommentReaction}
                currentPage={currentPage}
                totalPages={totalPages}
                handlePageChange={(p) => setCurrentPage(p)}
                myPostIds={myPostIds}
                deletePost={handleDeletePost}
                onReportPost={handleReportPost}
                reportedPostIds={reportedPostIds}
                onNewPost={() => setIsModalOpen(true)}
              />
            )}
          </div>

          {/* RIGHT SIDEBAR — sticky */}
          <div className="hidden lg:block sticky top-24">
            <RightSidebar
              activeTag={activeTag}
              onTagClick={handleTagClick}
              activeContributor={activeContributor}
              onContributorClick={handleContributorClick}
              recentActivity={recentActivity}
              recentTopics={recentTopics}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;