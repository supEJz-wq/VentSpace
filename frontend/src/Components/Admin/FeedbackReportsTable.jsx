import React, { useState, useEffect } from 'react';
import { Bug, Lightbulb, Trash2, Trash, X, Clock, Filter } from 'lucide-react';
import AdminPagination from './AdminPagination';
import useIsDark from '../../lib/useIsDark';

const ITEMS_PER_PAGE = 10;

const FeedbackReportsTable = ({ reports, onDeleteReport, onBulkDeleteReports, onDeleteAllReports }) => {
  const isDark = useIsDark();
  const [activeTab, setActiveTab] = useState('bug');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [viewingReport, setViewingReport] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const bugReports = reports.filter(r => r.type === 'bug');
  const ideaReports = reports.filter(r => r.type === 'suggestion');
  const activeList = activeTab === 'bug' ? bugReports : ideaReports;

  let filteredReports = filterDate
    ? activeList.filter(r => r.createdAt >= new Date(filterDate).getTime())
    : activeList;

  if (search) {
    const q = search.toLowerCase();
    filteredReports = filteredReports.filter(r =>
      r.reporterName.toLowerCase().includes(q) ||
      r.text.toLowerCase().includes(q)
    );
  }

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE));
  const isFiltered = filterDate || search;

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    if (totalPages === 0 && currentPage !== 1) setCurrentPage(1);
  }, [filteredReports, currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, filterDate]);

  useEffect(() => {
    setSelectedIds([]);
  }, [currentPage, activeTab, filterDate, search]);

  const currentReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleString();
  };

  const btnBase = isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  const inputBase = isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-50 border-gray-400 text-gray-900';
  const tabActive = 'bg-rose-600 text-white shadow-sm';
  const tabInactive = isDark ? 'bg-white/10 text-gray-400 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200';
  const checkboxClass = `w-4 h-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer ${isDark ? 'bg-white/10 border-white/30' : ''}`;
  const isBugTab = activeTab === 'bug';

  const handleDelete = (id) => {
    if (!window.confirm('Delete this report permanently?')) return;
    onDeleteReport(id);
    if (viewingReport?.id === id) setViewingReport(null);
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const currentIds = currentReports.map(r => r.id);
    const allCurrentSelected = currentIds.every(id => selectedIds.includes(id));

    if (allCurrentSelected) {
      setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...currentIds])]);
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.length === 0) return;
    onBulkDeleteReports(selectedIds);
    setSelectedIds([]);
  };

  const handleDeleteAllClick = () => {
    if (filteredReports.length === 0) return;
    onDeleteAllReports(filteredReports.map(r => r.id));
    setSelectedIds([]);
  };

  const clearFilters = () => {
    setFilterDate('');
    setSearch('');
    setCurrentPage(1);
  };

  return (
    <>
      {viewingReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border ${isDark ? 'bg-stone-800 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
            <div className={`flex items-center justify-between p-5 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${viewingReport.type === 'bug' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {viewingReport.type === 'bug' ? <Bug size={20} /> : <Lightbulb size={20} />}
                </div>
                <div>
                  <h3 className="font-bold">{viewingReport.reporterName}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={12} /> {formatTime(viewingReport.createdAt)}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingReport(null)} className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              <span className={`text-xs font-bold px-2 py-1 rounded-md mb-4 inline-block ${viewingReport.type === 'bug' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-500'}`}>
                {viewingReport.type === 'bug' ? 'Bug Report' : 'Idea / Suggestion'}
              </span>
              <p className="text-lg leading-relaxed whitespace-pre-line">{viewingReport.text}</p>
              {viewingReport.imageUrl && (
                <div className="mt-4 border border-white/20 rounded-xl overflow-hidden bg-black/10 flex items-center justify-center relative group">
                  <img src={viewingReport.imageUrl} alt="Attached screenshot" className="max-h-80 object-contain" />
                  <a href={viewingReport.imageUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md">
                    Open Full Size
                  </a>
                </div>
              )}
            </div>

            <div className={`p-5 border-t flex justify-end gap-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <button onClick={() => setViewingReport(null)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${btnBase}`}>
                Close
              </button>
              <button
                onClick={() => handleDelete(viewingReport.id)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors text-sm shadow-sm flex items-center gap-2"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`rounded-2xl overflow-hidden h-fit transition-colors duration-300 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300 shadow-sm'}`}>
        <div className={`p-6 border-b-2 ${isDark ? 'border-white/10' : 'border-gray-300'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>User Feedback</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Showing {currentReports.length} of {filteredReports.length} {isBugTab ? 'bug reports' : 'ideas'}
                {isFiltered && <span className="text-rose-500 font-semibold"> (Filtered)</span>}
              </p>
            </div>

            <button
              onClick={handleDeleteAllClick}
              disabled={filteredReports.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition-colors text-sm shadow-sm"
            >
              <Trash size={16} /> Delete All
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab('bug')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'bug' ? tabActive : tabInactive}`}
            >
              <Bug size={14} /> Bug Reports ({bugReports.length})
            </button>
            <button
              onClick={() => setActiveTab('suggestion')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'suggestion' ? tabActive : tabInactive}`}
            >
              <Lightbulb size={14} /> Ideas ({ideaReports.length})
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <input
                type="text"
                placeholder="Search by name or content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-10 pr-4 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${inputBase}`}
              />
              <Filter size={16} className={`absolute left-3 top-2.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>After:</span>
              <input
                type="datetime-local"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className={`px-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${inputBase}`}
              />
            </div>

            {isFiltered && (
              <button onClick={clearFilters} className="text-xs font-bold text-rose-500 hover:scale-105 transition-transform">
                Clear All ✕
              </button>
            )}
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className={`p-4 border-b-2 flex items-center justify-between transition-colors ${isDark ? 'bg-rose-900/30 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}>
            <span className={`text-sm font-bold ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>
              {selectedIds.length} report(s) selected
            </span>
            <button
              onClick={handleBulkDeleteClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-sm shadow-sm"
            >
              <Trash2 size={16} /> Delete Selected
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`border-b-2 text-sm ${isDark ? 'border-white/10' : 'border-gray-300'}`}>
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={currentReports.length > 0 && currentReports.every(r => selectedIds.includes(r.id))}
                    className={checkboxClass}
                  />
                </th>
                <th className={`p-4 font-extrabold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>User</th>
                <th className={`p-4 font-extrabold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Submitted</th>
                <th className={`p-4 font-extrabold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Content</th>
                <th className={`p-4 text-right font-extrabold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentReports.length > 0 ? (
                currentReports.map(report => {
                  const isSelected = selectedIds.includes(report.id);

                  return (
                    <tr
                      key={report.id}
                      className={`border-b transition-colors ${
                        isSelected
                          ? (isDark ? 'bg-rose-900/20 border-white/5' : 'bg-rose-50 border-gray-200')
                          : (isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')
                      }`}
                    >
                      <td className="p-4 w-12">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(report.id)}
                          className={checkboxClass}
                        />
                      </td>
                      <td className={`p-4 font-bold text-sm ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                        {report.reporterName}
                      </td>
                      <td className={`p-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatTime(report.createdAt)}
                        </div>
                      </td>
                      <td className="p-4 text-sm max-w-md">
                        <button
                          onClick={() => setViewingReport(report)}
                          className={`truncate w-full text-left cursor-pointer hover:underline decoration-rose-500 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                          title="Click to view full report"
                        >
                          {report.text}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(report.id)}
                          className={`p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-bold ${isDark ? 'text-red-400 hover:text-white hover:bg-red-600' : 'text-red-500 hover:text-white hover:bg-red-600'}`}
                          title="Delete report"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className={`p-8 text-center text-sm font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    No {isBugTab ? 'bug reports' : 'ideas'} found{isFiltered ? ' for this filter' : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={currentPage}
          totalItems={filteredReports.length}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
          isDarkMode={isDark}
        />
      </div>
    </>
  );
};

export default FeedbackReportsTable;
