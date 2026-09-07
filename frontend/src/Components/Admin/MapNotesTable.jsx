import React, { useState, useEffect } from 'react';
import { Trash2, MapPin, Search, X } from 'lucide-react';
import useIsDark from '../../lib/useIsDark';
import AdminPagination from './AdminPagination';

const ITEMS_PER_PAGE = 8;

const MapNotesTable = ({ notes, onDeleteNote }) => {
  const isDark = useIsDark();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = notes.filter(n => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      n.name?.toLowerCase().includes(q) ||
      n.message?.toLowerCase().includes(q) ||
      String(n.latitude).includes(q) ||
      String(n.longitude).includes(q)
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

  const allSelected = paged.length > 0 && paged.every(n => selectedIds.has(n.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allSelected) paged.forEach(n => next.delete(n.id));
    else paged.forEach(n => next.add(n.id));
    setSelectedIds(next);
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selectedIds.size} map note(s)? This cannot be undone!`)) return;
    selectedIds.forEach(id => onDeleteNote(id));
    setSelectedIds(new Set());
  };

  const isExpired = (ts) => new Date(ts).getTime() <= Date.now();

  const fmtCoords = (lat, lng) =>
    `${Number(lat).toFixed(3)}°, ${Number(lng).toFixed(3)}°`;

  const themeClass = isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300 shadow-sm text-gray-900';
  const tableHeaderClass = isDark ? 'bg-white/5 border-b border-white/10 text-gray-300' : 'bg-gray-50 border-b border-gray-200 text-gray-700';
  const rowBorderClass = isDark ? 'border-b border-white/5 hover:bg-white/5' : 'border-b border-gray-100 hover:bg-gray-50';

  return (
    <div className={`rounded-3xl border overflow-hidden ${themeClass}`}>
      {/* HEADER & CONTROLS */}
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <h2 className="text-xl font-bold flex items-center gap-2">
          🗺️ Map Notes <span className="text-sm font-normal py-1 px-3 rounded-full bg-fuchsia-500/10 text-fuchsia-500">{notes.length} Total</span>
        </h2>

        <div className="flex items-center gap-3 ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search name, message, coords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`pl-9 pr-8 py-2 rounded-xl border text-sm w-64 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 ${
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
                  className="rounded cursor-pointer accent-fuchsia-500 w-4 h-4"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold w-1/3">Message</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Device</th>
              <th className="px-4 py-3 font-semibold">Posted</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 opacity-60 italic">
                  {query ? 'No notes matched your search.' : 'No map notes yet.'}
                </td>
              </tr>
            ) : (
              paged.map(note => {
                const expired = isExpired(note.expires_at);
                return (
                  <tr key={note.id} className={`transition-colors ${rowBorderClass}`}>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(note.id)}
                        onChange={() => toggleSelect(note.id)}
                        className="rounded cursor-pointer accent-fuchsia-500 w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${isDark ? 'bg-fuchsia-500/10 text-fuchsia-300' : 'bg-fuchsia-50 text-fuchsia-700'}`}>
                        <MapPin size={12} /> {note.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="truncate max-w-xs" title={note.message}>{note.message}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs opacity-80">
                      {fmtCoords(note.latitude, note.longitude)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] opacity-60" title={note.device_id}>
                      {String(note.device_id || '').slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 opacity-80 whitespace-nowrap">
                      {new Date(note.created_at).toLocaleDateString()}
                      <div className="text-xs opacity-70">
                        {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                        expired
                          ? (isDark ? 'bg-gray-500/15 text-gray-400' : 'bg-gray-100 text-gray-500')
                          : (isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600')
                      }`}>
                        {expired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
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

export default MapNotesTable;
