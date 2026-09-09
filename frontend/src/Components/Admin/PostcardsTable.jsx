import React, { useState, useEffect } from 'react';
import { Trash2, Image, Search, X } from 'lucide-react';
import useIsDark from '../../lib/useIsDark';
import AdminPagination from './AdminPagination';

const ITEMS_PER_PAGE = 8;

const PostcardsTable = ({
  postcards,
  onDeletePostcard,
  onBulkDelete,
}) => {
  const isDark = useIsDark();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = postcards.filter(p => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.to?.toLowerCase().includes(q) ||
      p.from?.toLowerCase().includes(q) ||
      p.message?.toLowerCase().includes(q)
    );
  });

  useEffect(() => { setCurrentPage(1); }, [query]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
    if (totalPages === 0 && currentPage !== 1) setCurrentPage(1);
  }, [filtered.length, currentPage, totalPages]);

  const paged = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    onBulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const themeClass = isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300 shadow-sm text-gray-900';
  const tableHeaderClass = isDark ? 'bg-white/5 border-b border-white/10 text-gray-300' : 'bg-gray-50 border-b border-gray-200 text-gray-700';
  const rowBorderClass = isDark ? 'border-b border-white/5 hover:bg-white/5' : 'border-b border-gray-100 hover:bg-gray-50';

  if (!postcards || postcards.length === 0) {
    return (
      <div className={`p-8 rounded-3xl border text-center ${themeClass}`}>
        <Image className="mx-auto mb-4 opacity-50" size={48} />
        <p className="font-semibold text-lg">No postcards yet.</p>
        <p className="text-sm opacity-70">The community hasn't shared any postcards to the wall.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border overflow-hidden ${themeClass}`}>
      {/* HEADER & CONTROLS */}
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <h2 className="text-xl font-bold flex items-center gap-2">
          💌 Postcard Wall <span className="text-sm font-normal py-1 px-3 rounded-full bg-rose-500/10 text-rose-500">{postcards.length} Total</span>
        </h2>

        <div className="flex items-center gap-3 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search To, From, Message..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`pl-9 pr-8 py-2 rounded-xl border text-sm w-64 focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                isDark ? 'bg-black/20 border-white/20 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Trash2 size={16} /> Delete Selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className={tableHeaderClass}>
            <tr>
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded cursor-pointer accent-rose-500 w-4 h-4"
                />
              </th>
              <th className="px-4 py-3 font-semibold">To & From</th>
              <th className="px-4 py-3 font-semibold w-1/2">Message Preview</th>
              <th className="px-4 py-3 font-semibold">Stickers</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 opacity-60 italic">
                  No postcards matched your search.
                </td>
              </tr>
            ) : (
              paged.map(card => (
                <tr key={card.id} className={`transition-colors ${rowBorderClass}`}>
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(card.id)}
                      onChange={() => toggleSelect(card.id)}
                      className="rounded cursor-pointer accent-rose-500 w-4 h-4"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold flex items-center gap-2">
                       <span className="opacity-60 text-xs">TO:</span> {card.to}
                    </div>
                    <div className="text-xs opacity-70 flex items-center gap-2 mt-0.5">
                       <span className="opacity-60">FROM:</span> {card.from}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="truncate max-w-sm" style={{ fontFamily: card.font }}>
                      {card.message || <span className="italic opacity-40">No message</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {card.stickers?.length > 0 ? (
                      <div className="flex gap-1 text-base">{card.stickers.slice(0, 3).map((s, i) => {
                        // Stickers are { emoji } objects since the jsonb migration
                        // (legacy rows could still be plain strings) — never render raw.
                        const emoji = typeof s === 'string' ? s : s?.emoji;
                        return <span key={`${emoji ?? '?'}${i}`}>{emoji ?? ''}</span>;
                      })}</div>
                    ) : (
                      <span className="opacity-30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 opacity-80 whitespace-nowrap">
                    {new Date(card.createdAt).toLocaleDateString()}
                    <div className="text-xs opacity-70">
                      {new Date(card.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDeletePostcard(card.id)}
                      className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                      title="Delete Postcard"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="p-4 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <AdminPagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default PostcardsTable;
