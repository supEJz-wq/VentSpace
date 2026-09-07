import React from 'react';
import PostCard from './PostCard';
import Pagination from './Pagination';
import { PenLine } from 'lucide-react';

const Feed = ({ posts, toggleLike, addComment, addReply, deleteComment, myCommentIds, addReaction, addCommentReaction, currentPage, totalPages, handlePageChange, myPostIds, deletePost, onReportPost, reportedPostIds, onNewPost }) => {
  return (
    <div key={currentPage} className="animate-fadeInUp space-y-5">
      
      {posts.length > 0 ? (
        <>
          {posts.map((post, i) => (
            <div key={post.id} className="animate-popIn" style={{ animationDelay: `${i * 0.06}s` }}>
              <PostCard 
                post={post} 
                toggleLike={toggleLike} 
                addComment={addComment}
                addReply={addReply}
                deleteComment={deleteComment}
                myCommentIds={myCommentIds}
                addReaction={addReaction}
                addCommentReaction={addCommentReaction}
                isMyPost={myPostIds.includes(post.id)}
                deletePost={deletePost}
                onReportPost={onReportPost}
                isReported={reportedPostIds.includes(post.id)}
              />
            </div>
          ))}
          
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            handlePageChange={handlePageChange} 
          />
        </>
      ) : (
        <div className="glass-card p-12 text-center relative overflow-hidden animate-fadeInUp">
          {/* Decorative blobs */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-fuchsia-200/40 to-purple-200/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-gradient-to-br from-pink-200/40 to-rose-200/40 blur-3xl pointer-events-none" />
          
          <div className="relative">
            {/* Decorative rings */}
            <div className="relative mx-auto w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-200 to-pink-200 animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-fuchsia-100 to-purple-100" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">💭</span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-gray-700 mb-2">No thoughts yet</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto mb-6 leading-relaxed">
              Be the first to share what's on your mind. Your feelings matter here.
            </p>
            
            {onNewPost && (
              <button
                onClick={onNewPost}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white rounded-full font-semibold shadow-glow-sm hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                <PenLine size={17} />
                Share a Thought
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Feed;
