import React, { useState, useRef } from 'react';
import { MessageCircle, Send, Trash2, AlertTriangle, SmilePlus, CornerDownRight, ArrowRight } from 'lucide-react';
import { getStoredUsername } from '../lib/identity';
import useIsDark from '../lib/useIsDark';

// ========== MOOD CONFIGURATION (Colors & Emojis) ==========
const moodColors = {
  Happy: 'bg-yellow-100/80 text-yellow-700 border-yellow-200',
  Sad: 'bg-blue-100/80 text-blue-700 border-blue-200',
  Angry: 'bg-red-100/80 text-red-700 border-red-200',
  Hopeful: 'bg-green-100/80 text-green-700 border-green-200',
  Anxious: 'bg-purple-100/80 text-purple-700 border-purple-200',
};

const moodEmojis = { Happy: '😊', Sad: '😢', Angry: '😠', Hopeful: '🤞', Anxious: '😰' };

// ========== REACTION OPTIONS ==========
const REACTIONS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '👏', label: 'Support' },
];

// ========== TEXT TRUNCATION LIMIT ==========
const TEXT_LIMIT = 150;

const countAllComments = (comments) =>
  comments.reduce((sum, comment) => sum + 1 + countAllComments(comment.replies || []), 0);

// ========== COMMENT REACTION STORAGE HELPERS ==========
const COMMENT_REACTIONS_KEY = 'ventspace_comment_reactions';

const getMyCommentReaction = (commentId) => {
  const saved = JSON.parse(localStorage.getItem(COMMENT_REACTIONS_KEY) || '{}');
  return saved[commentId] || null;
};

const saveMyCommentReaction = (commentId, emoji) => {
  const saved = JSON.parse(localStorage.getItem(COMMENT_REACTIONS_KEY) || '{}');
  if (emoji) { saved[commentId] = emoji; } else { delete saved[commentId]; }
  localStorage.setItem(COMMENT_REACTIONS_KEY, JSON.stringify(saved));
};

// ========== COMMENT ITEM ==========
const CommentItem = ({ comment, postId, addReply, deleteComment, myCommentIds, addCommentReaction, parentUsername = null, depth = 0 }) => {
  const isDark = useIsDark();
  const [replyingTo, setReplyingTo] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showCommentReactionPicker, setShowCommentReactionPicker] = useState(false);
  const [myReaction, setMyReaction] = useState(() => getMyCommentReaction(comment.id));
  const hoverTimeout = useRef(null);
  const myName = getStoredUsername()?.name || 'You';
  const canDelete = myCommentIds.includes(comment.id) || comment.username === myName;

  const reactions = comment.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
  const totalCommentReactions = reactionEntries.reduce((sum, [, c]) => sum + c, 0);

  const handleMouseEnterReact = () => {
    clearTimeout(hoverTimeout.current);
    setShowCommentReactionPicker(true);
  };

  const handleMouseLeaveReact = () => {
    hoverTimeout.current = setTimeout(() => setShowCommentReactionPicker(false), 300);
  };

  const handlePickCommentReaction = (emoji) => {
    const prev = myReaction;
    const next = prev === emoji ? null : emoji;
    setMyReaction(next);
    saveMyCommentReaction(comment.id, next);
    addCommentReaction(postId, comment.id, next, prev);
    setShowCommentReactionPicker(false);
  };

  const handleSubmitReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    addReply(postId, comment.id, replyText);
    setReplyText('');
    setReplyingTo(false);
  };

  return (
    <div className={`relative ${depth > 0 ? 'mt-3' : ''}`}>
      {depth > 0 && (
        <div className="absolute -left-3 top-0 bottom-0 flex flex-col items-center">
          <div className={`w-px flex-1 ${isDark ? 'bg-purple-800' : 'bg-purple-200'}`} />
          <div className={`w-3 h-px -ml-3 self-end ${isDark ? 'bg-purple-800' : 'bg-purple-200'}`} />
        </div>
      )}

      <div className={depth > 0 ? 'ml-6' : ''}>
        {parentUsername && (
          <div className="flex items-center gap-1.5 mb-1.5 text-xs">
            <span className={`font-semibold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>{comment.username}</span>
            <ArrowRight size={12} className={isDark ? 'text-purple-600' : 'text-purple-300'} />
            <span className="text-gray-400">replied to</span>
            <span className={`font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>@{parentUsername}</span>
          </div>
        )}

        <div className={`flex items-start gap-3 p-3 rounded-xl border ${isDark ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50/50 border-purple-100/60'}`}>
          <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${isDark ? 'bg-purple-800 text-purple-200' : 'bg-purple-200'}`}>
            {comment.username[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>{comment.username}</span>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => deleteComment(postId, comment.id)}
                  className={`p-1 rounded-full text-gray-400 hover:text-red-500 transition-all ${isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}
                  title="Delete comment"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{comment.text}</p>

            {/* ── REACTION BAR ── */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {/* Reaction summary bubbles */}
              {reactionEntries.map(([emoji, count]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handlePickCommentReaction(emoji)}
                  title={REACTIONS.find(r => r.emoji === emoji)?.label || emoji}
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all
                    ${myReaction === emoji
                      ? (isDark ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-semibold' : 'bg-purple-100 border-purple-300 text-purple-700 font-semibold')
                      : (isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/30 hover:bg-purple-500/10' : 'bg-white border-purple-100 text-gray-500 hover:border-purple-300 hover:bg-purple-50')}`}
                >
                  <span className="leading-none">{emoji}</span>
                  <span>{count}</span>
                </button>
              ))}

              {/* React button with hover picker */}
              <div
                className="relative"
                onMouseEnter={handleMouseEnterReact}
                onMouseLeave={handleMouseLeaveReact}
              >
                {showCommentReactionPicker && (
                  <div className={`absolute bottom-full left-0 mb-1.5 z-50 flex items-center gap-0.5 backdrop-blur-xl border rounded-full px-2 py-1.5 shadow-2xl ${isDark ? 'bg-gray-900/95 border-white/10' : 'bg-white/95 border-purple-100'}`}>
                    {REACTIONS.map(({ emoji, label }) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handlePickCommentReaction(emoji)}
                        title={label}
                        className={`text-lg transition-all hover:scale-150 hover:-translate-y-2 px-0.5 ${myReaction === emoji ? 'scale-125' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowCommentReactionPicker(prev => !prev)}
                  className={`flex items-center gap-1 text-xs transition-colors ${myReaction ? 'text-purple-500 font-semibold' : 'text-gray-400 hover:text-purple-500'}`}
                >
                  <SmilePlus size={13} />
                  {myReaction ? <span>{myReaction}</span> : null}
                </button>
              </div>

              {/* Reply button */}
              <button
                type="button"
                onClick={() => setReplyingTo(prev => !prev)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-500 transition-colors"
              >
                <CornerDownRight size={12} />
                {replyingTo ? 'Cancel' : 'Reply'}
              </button>
            </div>
          </div>
        </div>

        {replyingTo && (
          <div className="mt-2 ml-6 pl-4 border-l-2 border-purple-300">
            <div className={`flex items-center gap-1.5 mb-2 text-xs px-3 py-1.5 rounded-full w-fit ${isDark ? 'bg-purple-500/15' : 'bg-purple-100/60'}`}>
              <span className={`font-semibold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>{myName}</span>
              <ArrowRight size={12} className="text-purple-400" />
              <span className="text-gray-400">replying to</span>
              <span className={`font-semibold ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>@{comment.username}</span>
            </div>
                <form onSubmit={handleSubmitReply} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Write a reply to ${comment.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                autoFocus
                className={`flex-1 text-sm px-4 py-2 rounded-full border focus:ring-2 focus:ring-fuchsia-400/60 focus:border-transparent outline-none transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'border-purple-100'}`}
              />
              <button type="submit" className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white p-2 rounded-full shadow-sm hover:shadow-glow-sm hover:scale-105 active:scale-95 transition-all">
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {comment.replies?.length > 0 && (
          <div className={`space-y-0 border-l-2 ml-3 pl-3 mt-2 ${isDark ? 'border-purple-500/20' : 'border-purple-100'}`}>
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                addReply={addReply}
                deleteComment={deleteComment}
                myCommentIds={myCommentIds}
                addCommentReaction={addCommentReaction}
                parentUsername={comment.username}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PostCard = ({ post, toggleLike, addComment, addReply, deleteComment, myCommentIds, addReaction, addCommentReaction, isMyPost, deletePost, onReportPost, isReported }) => {
  const isDark = useIsDark();
  // ========== STATE VARIABLES ==========
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionBreakdown, setShowReactionBreakdown] = useState(false);
  const hoverTimeout = useRef(null);
  const breakdownTimeout = useRef(null);

  // ========== PERSIST REACTION IN LOCALSTORAGE ==========
  const [myReaction, setMyReaction] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('freespace_user_reactions') || '{}');
    return saved[post.id] || null;
  });

  const saveReaction = (postId, emoji) => {
    const saved = JSON.parse(localStorage.getItem('freespace_user_reactions') || '{}');
    if (emoji) { saved[postId] = emoji; } else { delete saved[postId]; }
    localStorage.setItem('freespace_user_reactions', JSON.stringify(saved));
  };

  // ========== REACTION HANDLERS ==========
  const handleMouseEnterReact = () => {
    clearTimeout(hoverTimeout.current);
    setShowReactionPicker(true);
  };

  const handleMouseLeaveReact = () => {
    hoverTimeout.current = setTimeout(() => setShowReactionPicker(false), 300);
  };

  const handlePickReaction = (emoji) => {
    const prev = myReaction;
    if (prev === emoji) {
      setMyReaction(null);
      saveReaction(post.id, null);
      addReaction(post.id, null, prev);
    } else {
      setMyReaction(emoji);
      saveReaction(post.id, emoji);
      addReaction(post.id, emoji, prev);
    }
    setShowReactionPicker(false);
  };

  // ========== COMMENT HANDLER ==========
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment(post.id, newComment);
    setNewComment("");
  };

  const isLongText = post.text.length > TEXT_LIMIT;
  const displayText = isLongText && !isExpanded ? post.text.substring(0, TEXT_LIMIT) + "..." : post.text;

  const timeAgo = (timestamp) => {
    const hours = Math.floor((Date.now() - timestamp) / 3600000);
    if (hours === 0) return "Just now";
    if (hours === 1) return "1h ago";
    return `${hours}h ago`;
  };

  const reactions = post.reactions || {};
  const reactionEntries = Object.entries(reactions)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalReactions = reactionEntries.reduce((sum, [, count]) => sum + count, 0);

  const getReactionLabel = (emoji) => REACTIONS.find(r => r.emoji === emoji)?.label || emoji;

  const handleReactionSummaryEnter = () => {
    clearTimeout(breakdownTimeout.current);
    setShowReactionBreakdown(true);
  };

  const handleReactionSummaryLeave = () => {
    breakdownTimeout.current = setTimeout(() => setShowReactionBreakdown(false), 200);
  };

  return (
    <div className="glass-card p-6 transition-all duration-300 hover:shadow-glass-lg hover:-translate-y-1 hover:border-purple-200/60 group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-300 to-pink-300 flex items-center justify-center text-white font-bold shadow-md">
            {post.username[0]}
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{post.username}</h3>
            <span className="text-xs text-gray-400">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm px-4 py-1.5 rounded-full font-medium border flex items-center gap-2 ${moodColors[post.mood]}`}>
            <span className="animate-bounce-soft">{moodEmojis[post.mood]}</span> {post.mood}
          </span>
          {isMyPost && (
            <button onClick={() => deletePost(post.id)} className={`p-2 rounded-full text-gray-400 hover:text-red-500 transition-all ${isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}>
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="mb-5">
        <p className={`leading-relaxed text-lg whitespace-pre-line ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{displayText}</p>
        {isLongText && (
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-rose-500 hover:text-rose-600 text-sm font-semibold mt-1">
            {isExpanded ? 'See less' : 'See more'}
          </button>
        )}
      </div>

      {totalReactions > 0 && (
        <div
          className="relative flex items-center justify-end mb-3"
          onMouseEnter={handleReactionSummaryEnter}
          onMouseLeave={handleReactionSummaryLeave}
        >
          {showReactionBreakdown && (
            <div className={`absolute bottom-full right-0 mb-2 z-50 backdrop-blur-xl border rounded-2xl px-4 py-3 shadow-2xl min-w-[140px] ${isDark ? 'bg-gray-900/95 border-white/10' : 'bg-white/95 border-purple-100'}`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reactions</p>
              <div className="space-y-1.5">
                {reactionEntries.map(([emoji, count]) => (
                  <div key={emoji} className="flex items-center justify-between gap-4 text-sm">
                    <span className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <span className="text-lg leading-none">{emoji}</span>
                      <span>{getReactionLabel(emoji)}</span>
                    </span>
                    <span className="font-semibold text-purple-600">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowReactionBreakdown(prev => !prev)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors"
          >
            <span className="flex items-center -space-x-1">
              {reactionEntries.slice(0, 3).map(([emoji]) => (
                <span
                  key={emoji}
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm shadow-sm ${isDark ? 'bg-white/10 border border-white/10' : 'bg-white border border-purple-100'}`}
                >
                  {emoji}
                </span>
              ))}
            </span>
            <span className="font-medium">{totalReactions}</span>
          </button>
        </div>
      )}

      <div className={`flex items-center gap-6 text-gray-400 border-t pt-4 ${isDark ? 'border-purple-500/15' : 'border-purple-100/50'}`}>
        <div className="relative" onMouseEnter={handleMouseEnterReact} onMouseLeave={handleMouseLeaveReact}>
          {showReactionPicker && (
            <div className={`absolute bottom-full left-0 mb-2 z-50 flex items-center gap-1 backdrop-blur-xl border rounded-full px-3 py-2 shadow-2xl ${isDark ? 'bg-gray-900/95 border-white/10' : 'bg-white/90 border-purple-100'}`}>
              {REACTIONS.map(({ emoji, label }) => (
                <button key={emoji} onClick={() => handlePickReaction(emoji)} title={label} className="text-2xl transition-all hover:scale-150 hover:-translate-y-2 p-1">
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <button className={`flex items-center gap-2 ${myReaction ? 'text-purple-500 font-semibold' : 'hover:text-purple-500'}`} onClick={() => setShowReactionPicker(!showReactionPicker)}>
            {myReaction ? <span className="text-xl leading-none">{myReaction}</span> : <SmilePlus size={18} />}
            <span className="text-sm">{myReaction ? REACTIONS.find(r => r.emoji === myReaction)?.label : 'React'}</span>
          </button>
        </div>

        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-2 hover:text-purple-500">
          <MessageCircle size={18} />
          <span className="text-sm font-medium">{countAllComments(post.comments)}</span>
        </button>

        {!isMyPost && (
          <button onClick={() => onReportPost(post.id)} className={`flex items-center gap-2 ml-auto text-sm ${isReported ? 'text-orange-500' : 'hover:text-orange-500'}`}>
            <AlertTriangle size={18} /> {isReported ? 'Reported' : 'Report'}
          </button>
        )}
      </div>

      {showComments && (
        <div className={`mt-4 border-t pt-4 space-y-3 ${isDark ? 'border-purple-500/15' : 'border-purple-100/50'}`}>
          {post.comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={post.id}
              addReply={addReply}
              deleteComment={deleteComment}
              myCommentIds={myCommentIds}
              addCommentReaction={addCommentReaction}
            />
          ))}
          <form onSubmit={handleAddComment} className="flex items-center gap-2 mt-3">
            <input type="text" placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className={`flex-1 text-sm px-4 py-2.5 rounded-full border focus:ring-2 focus:ring-fuchsia-400/60 focus:border-transparent outline-none transition-all ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'border-purple-100'}`} />
            <button type="submit" className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white p-2.5 rounded-full shadow-sm hover:shadow-glow-sm hover:scale-105 active:scale-95 transition-all"><Send size={16} /></button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PostCard;