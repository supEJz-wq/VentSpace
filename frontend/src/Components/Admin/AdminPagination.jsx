import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useIsDark from '../../lib/useIsDark';

const AdminPagination = ({ currentPage, totalItems, pageSize, onPageChange }) => {
  const isDark = useIsDark();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages && totalItems > 0;

  return (
    <div className={`flex items-center justify-between px-5 py-4 border-t ${isDark ? 'border-white/8' : 'border-gray-200'}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrev}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${!canGoPrev ? 'opacity-30 cursor-not-allowed' : ''} ${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/8' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
      >
        <ChevronLeft size={16} /> Previous
      </button>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let page;
          if (totalPages <= 5) page = i + 1;
          else if (currentPage <= 3) page = i + 1;
          else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
          else page = currentPage - 2 + i;

          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`relative w-9 h-9 rounded-xl text-xs font-bold transition-all duration-300 ${isActive ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}`}
            >
              {isActive && (
                <div className={`absolute inset-0 rounded-xl ${isDark ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-md'}`} />
              )}
              <span className="relative z-10">{page}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${!canGoNext ? 'opacity-30 cursor-not-allowed' : ''} ${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/8' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
      >
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default AdminPagination;
