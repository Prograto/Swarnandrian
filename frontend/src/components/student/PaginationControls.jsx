import React from 'react';
import { motion } from 'framer-motion';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import FirstPageRoundedIcon from '@mui/icons-material/FirstPageRounded';
import LastPageRoundedIcon from '@mui/icons-material/LastPageRounded';

export default function PaginationControls({ page, total, limit, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1,2,3,4,5,'…',totalPages];
    if (page >= totalPages - 3) return [1,'…',totalPages-4,totalPages-3,totalPages-2,totalPages-1,totalPages];
    return [1,'…',page-1,page,page+1,'…',totalPages];
  };
  return (
    <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-theme bg-surface-card px-4 py-3 mt-2">
      <p className="text-xs text-secondary hidden sm:block">
        Showing <span className="font-semibold text-primary">{from}–{to}</span> of{' '}
        <span className="font-semibold text-primary">{total}</span> items
      </p>
      <p className="text-xs text-secondary sm:hidden">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-1">
        <NavBtn onClick={() => onPageChange(1)} disabled={page<=1}><FirstPageRoundedIcon sx={{fontSize:16}}/></NavBtn>
        <NavBtn onClick={() => onPageChange(page-1)} disabled={page<=1}><ChevronLeftRoundedIcon sx={{fontSize:16}}/></NavBtn>
        {getPages().map((p,i) => p === '…'
          ? <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-secondary">…</span>
          : <button key={p} type="button" onClick={() => onPageChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${p===page ? 'text-white shadow-sm' : 'text-secondary hover:text-primary hover:bg-surface-lighter'}`}
              style={p===page ? {background:'linear-gradient(135deg,#4F7CF3,#7C8CFF)'} : {}}>{p}</button>
        )}
        <NavBtn onClick={() => onPageChange(page+1)} disabled={page>=totalPages}><ChevronRightRoundedIcon sx={{fontSize:16}}/></NavBtn>
        <NavBtn onClick={() => onPageChange(totalPages)} disabled={page>=totalPages}><LastPageRoundedIcon sx={{fontSize:16}}/></NavBtn>
      </div>
    </motion.div>
  );
}
function NavBtn({ onClick, disabled, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-8 h-8 rounded-lg flex items-center justify-center border border-theme bg-surface-card text-secondary hover:text-primary hover:border-[#4F7CF3] disabled:opacity-35 disabled:cursor-not-allowed transition-all">
      {children}
    </button>
  );
}
