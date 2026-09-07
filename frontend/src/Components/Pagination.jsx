import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, handlePageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) { start = Math.max(1, end - maxVisible + 1); }
    if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
    for (let i = start; i <= end; i++) { pages.push(i); }
    if (end < totalPages) { if (end < totalPages - 1) pages.push('...'); pages.push(totalPages); }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-10 mb-6">
      <button 
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="glass-card p-2.5 text-purple-500 hover:bg-purple-50 hover:border-purple-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
      >
        <ChevronLeft size={18} />
      </button>

      {getPageNumbers().map((page, index) => (
        <button 
          key={index}
          onClick={() => typeof page === 'number' && handlePageChange(page)}
          disabled={page === '...'}
          className={`w-10 h-10 rounded-2xl font-semibold text-sm transition-all duration-300 ${
            currentPage === page 
              ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-glow-sm scale-110 rotate-1' 
              : 'glass-card text-purple-600 hover:bg-purple-50 hover:border-purple-200 hover:scale-105'
          }`}
        >
          {page}
        </button>
      ))}

      <button 
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="glass-card p-2.5 text-purple-500 hover:bg-purple-50 hover:border-purple-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default Pagination;
