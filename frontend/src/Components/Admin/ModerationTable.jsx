import React, { useState, useEffect } from 'react';
import { Trash2, Trash, Filter, X, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import AdminPagination from './AdminPagination';
import useIsDark from '../../lib/useIsDark';

const countAllComments = (comments = []) =>
  comments.reduce((sum, comment) => sum + 1 + countAllComments(comment.replies), 0);

const AdminCommentItem = ({ comment, isDark, parentUsername = null, depth = 0 }) => (
  <div className={`relative ${depth > 0 ? 'mt-2' : ''}`}>
    <div className={depth > 0 ? 'ml-6 border-l-2 border-purple-200/40 pl-3' : ''}>
      {parentUsername && (
        <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <span className={`font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{comment.username}</span>
          {' → replied to '}
          <span className="font-semibold">@{parentUsername}</span>
        </p>
      )}
      <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
        <span className={`text-xs font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{comment.username}</span>
        <p className="text-sm mt-1">{comment.text}</p>
      </div>
      {comment.replies?.map(reply => (
        <AdminCommentItem
          key={reply.id}
          comment={reply}
          isDark={isDark}
          parentUsername={comment.username}
          depth={depth + 1}
        />
      ))}
    </div>
  </div>
);

const ModerationTable = ({ posts, onDeletePost, onDeleteAll, reportedPostIds, onClearReport, onBulkDelete, onBulkApprove, onResetUser }) => {
  const isDark = useIsDark();
  const POSTS_PER_PAGE = 10;
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Time Filter State
  const [filterDate, setFilterDate] = useState("");

  // Review Modal State
  const [viewingPost, setViewingPost] = useState(null);

  // Tab Filter State
  const [activeTab, setActiveTab] = useState("all"); // "all" or "reported"

  // Search State
  const [adminSearch, setAdminSearch] = useState("");

  // NEW: Multi-select State
  const [selectedPostIds, setSelectedPostIds] = useState([]);

  // Apply Filters: Time FIRST
  let filteredPosts = filterDate 
    ? posts.filter(p => p.createdAt >= new Date(filterDate).getTime())
    : posts;

  // Apply Tab Filter
  if (activeTab === "reported") {
    filteredPosts = filteredPosts.filter(p => reportedPostIds.includes(p.id));
  }

  // Apply Search (Name or Text)
  if (adminSearch) {
    const q = adminSearch.toLowerCase();
    filteredPosts = filteredPosts.filter(p => 
      p.username.toLowerCase().includes(q) || 
      p.text.toLowerCase().includes(q)
    );
  }

  // Calculate pagination based on fully filtered posts
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));

  // Reset page if filters change or items are deleted
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    if (totalPages === 0 && currentPage !== 1) setCurrentPage(1);
  }, [filteredPosts, currentPage, totalPages]);

  // NEW: Clear selections when filters or pages change to prevent ghost deletions
  useEffect(() => {
    setSelectedPostIds([]);
  }, [currentPage, activeTab, filterDate]);

  // Slice the filtered posts
  const currentPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const handlePageChange = (page) => setCurrentPage(page);
  const clearFilter = () => { setFilterDate(""); setCurrentPage(1); };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Unknown";
    return new Date(timestamp).toLocaleString();
  };

  // NEW: Multi-select Logic
  const handleToggleSelect = (id) => {
    setSelectedPostIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentIds = currentPosts.map(p => p.id);
    const allCurrentSelected = currentIds.every(id => selectedPostIds.includes(id));

    if (allCurrentSelected) {
      // Deselect only the ones on the current page
      setSelectedPostIds(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      // Add current page IDs, ensuring no duplicates
      setSelectedPostIds(prev => [...new Set([...prev, ...currentIds])]);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedPostIds.length === 0) return;
    onBulkDelete(selectedPostIds);
    setSelectedPostIds([]);
  };

  const handleBulkApproveClick = () => {
    if (selectedPostIds.length === 0) return;
    // Only approve the ones that are actually reported
    const reportedSelected = selectedPostIds.filter(id => reportedPostIds.includes(id));
    if (reportedSelected.length > 0) {
      onBulkApprove(reportedSelected);
    }
    setSelectedPostIds([]);
  };

  // Theme helpers
  const btnBase = isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  const inputBase = isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-50 border-gray-400 text-gray-900';
  
  // Tab button styling
  const tabActive = "bg-rose-600 text-white shadow-sm";
  const tabInactive = isDark ? 'bg-white/10 text-gray-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200';

  // Checkbox styling helper (makes them look much better)
  const checkboxClass = `w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer ${isDark ? 'bg-white/10 border-white/30' : ''}`;

  return (
    <>
      {/* ========== REVIEW MODAL ========== */}
      {viewingPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border ${isDark ? 'bg-stone-800 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
            
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold shadow-md">
                  {viewingPost.username[0]}
                </div>
                <div>
                  <h3 className="font-bold">{viewingPost.username}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} /> {formatTime(viewingPost.createdAt)}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingPost(null)} className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-md ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>{viewingPost.mood}</span>
                {reportedPostIds.includes(viewingPost.id) && (
                  <span className="text-xs font-bold px-2 py-1 rounded-md bg-orange-500/20 text-orange-500 flex items-center gap-1"><AlertTriangle size={12}/> Reported</span>
                )}
              </div>
              
              <p className="text-lg leading-relaxed whitespace-pre-line">{viewingPost.text}</p>

              {/* Comments Section inside Modal */}
              <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <h4 className={`text-sm font-bold mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Comments ({countAllComments(viewingPost.comments)})
                </h4>
                {viewingPost.comments && viewingPost.comments.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {viewingPost.comments.map(comment => (
                      <AdminCommentItem key={comment.id} comment={comment} isDark={isDark} />
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No comments on this post.</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-5 border-t flex justify-between items-center ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div>
                {reportedPostIds.includes(viewingPost.id) && (
                  <button 
                    onClick={() => { onClearReport(viewingPost.id); setViewingPost(null); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors text-sm shadow-sm"
                  >
                    <CheckCircle size={16} /> Approve Post
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setViewingPost(null)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${btnBase}`}>
                  Close
                </button>
                <button 
                  onClick={() => { onDeletePost(viewingPost.id); setViewingPost(null); }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors text-sm shadow-sm"
                >
                  Delete Post
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========== MAIN TABLE ========== */}
      <div className={`rounded-2xl overflow-hidden h-fit transition-colors duration-300 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300 shadow-sm'}`}>
        
        {/* Header */}
        <div className={`p-6 border-b-2 ${isDark ? 'border-white/10' : 'border-gray-300'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Content Moderation</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Showing {currentPosts.length} of {filteredPosts.length} posts 
                {(filterDate || activeTab === "reported") && <span className="text-rose-500 font-semibold"> (Filtered)</span>}
              </p>
            </div>
            
            <button onClick={onDeleteAll} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-sm shadow-sm">
              <Trash size={16} /> Delete All
            </button>
          </div>

          {/* Filter Tabs (All / Reported) */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => { setActiveTab("all"); setCurrentPage(1); }} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${activeTab === "all" ? tabActive : tabInactive}`}>
              All Posts
            </button>
            <button onClick={() => { setActiveTab("reported"); setCurrentPage(1); }} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === "reported" ? tabActive : tabInactive}`}>
              <AlertTriangle size={14} /> Reported ({reportedPostIds.length})
            </button>
          </div>

            <div className="flex items-center gap-3 flex-wrap mt-4">
              <div className="flex-1 min-w-[200px] relative">
                <input 
                  type="text" 
                  placeholder="Search name or content..." 
                  value={adminSearch}
                  onChange={(e) => { setAdminSearch(e.target.value); setCurrentPage(1); }}
                  className={`w-full pl-10 pr-4 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${inputBase}`}
                />
                <Filter size={16} className={`absolute left-3 top-2.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>After:</span>
                <input 
                  type="datetime-local" 
                  value={filterDate}
                  onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${inputBase}`}
                />
              </div>

              {(filterDate || adminSearch) && (
                <button onClick={() => { setFilterDate(""); setAdminSearch(""); }} className="text-xs font-bold text-rose-500 hover:scale-105 transition-transform">
                  Clear All ✕
                </button>
              )}
            </div>
        </div>
        
        {/* NEW: Bulk Action Toolbar */}
        {selectedPostIds.length > 0 && (
          <div className={`p-4 border-b-2 flex items-center justify-between transition-colors ${isDark ? 'bg-rose-900/30 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}>
            <span className={`text-sm font-bold ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>
              {selectedPostIds.length} post(s) selected
            </span>
            <div className="flex gap-2">
              {selectedPostIds.some(id => reportedPostIds.includes(id)) && (
                <button 
                  onClick={handleBulkApproveClick}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition-colors text-sm shadow-sm"
                >
                  <CheckCircle size={16} /> Approve Selected
                </button>
              )}
              <button 
                onClick={handleBulkDeleteClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-sm shadow-sm"
              >
                <Trash2 size={16} /> Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`border-b-2 text-sm ${isDark ? 'border-white/10' : 'border-gray-300'}`}>
                {/* NEW: Select All Checkbox Header */}
                <th className="p-4 w-12">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={currentPosts.length > 0 && currentPosts.every(p => selectedPostIds.includes(p.id))}
                    className={checkboxClass}
                  />
                </th>
                <th className={`p-4 font-extrabold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>User</th>
                <th className={`p-4 font-extrabold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Mood</th>
                <th className={`p-4 font-extrabold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Time Posted</th>
                <th className={`p-4 font-extrabold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Content</th>
                <th className={`p-4 text-right font-extrabold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentPosts.length > 0 ? (
                currentPosts.map(post => {
                  const isReported = reportedPostIds.includes(post.id);
                  const isSelected = selectedPostIds.includes(post.id); // NEW

                  return (
                    // NEW: Highlight row if it's selected OR reported
                    <tr key={post.id} className={`border-b transition-colors ${
                      isSelected 
                        ? (isDark ? 'bg-rose-900/20 border-white/5' : 'bg-rose-50 border-gray-200') 
                        : isReported 
                          ? (isDark ? 'bg-orange-900/10 border-white/5' : 'bg-orange-50 border-gray-200') 
                          : (isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')
                    }`}>
                      {/* NEW: Individual Checkbox */}
                      <td className="p-4 w-12">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => handleToggleSelect(post.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className={`p-4 font-bold text-sm ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                        {post.username} {isReported && <AlertTriangle size={12} className="inline text-orange-500 ml-1"/>}
                      </td>
                      <td className={`p-4 text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{post.mood}</td>
                      
                      <td className={`p-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(post.createdAt)}
                        </div>
                      </td>

                      <td className="p-4 text-sm max-w-xs">
                        <button 
                          onClick={() => setViewingPost(post)}
                          className={`truncate w-full text-left cursor-pointer hover:underline decoration-rose-500 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                          title="Click to review full post"
                        >
                          {post.text}
                        </button>
                      </td>
                      
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isReported && (
                            <button 
                              onClick={() => onClearReport(post.id)}
                              className="p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-bold text-green-500 hover:text-white hover:bg-green-600"
                              title="Approve / Clear Report"
                            >
                              <CheckCircle size={16} /> 
                            </button>
                          )}
                          
                          <button 
                            onClick={() => onResetUser(post.device_id)}
                            className={`p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-bold ${isDark ? 'text-blue-400 hover:text-white hover:bg-blue-600' : 'text-blue-500 hover:text-white hover:bg-blue-600'}`}
                            title="Reset User (Unlock Name & Posts)"
                          >
                            <span className="text-[10px]">RESET</span>
                          </button>
                          
                          <button 
                            onClick={() => onDeletePost(post.id)}
                            className={`p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-bold ${isDark ? 'text-red-400 hover:text-white hover:bg-red-600' : 'text-red-500 hover:text-white hover:bg-red-600'}`}
                            title="Delete Post"
                          >
                            <Trash2 size={16} /> 
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  {/* Updated colSpan to 6 because we added a column */}
                  <td colSpan="6" className={`p-8 text-center text-sm font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    No posts found {activeTab === "reported" ? "in the reported queue" : (filterDate ? "for this time period" : "")}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredPosts.length}
          pageSize={POSTS_PER_PAGE}
          onPageChange={handlePageChange}
          isDark={isDark}
        />
      </div>
    </>
  );
};

export default ModerationTable;
