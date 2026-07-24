// StatusBadge — small pill for LeaveRequest/SwapRequest/Roster status + conflict severity
import React from 'react';

type StatusType =
  | 'PENDING' | 'PENDING_PEER' | 'PENDING_MANAGER'
  | 'APPROVED' | 'PUBLISHED'
  | 'REJECTED' | 'CANCELLED' | 'DRAFT'
  | 'BLOCKING' | 'WARNING';

const CONFIG: Record<StatusType, { label: string; color: string; bg: string; icon?: string }> = {
  PENDING:         { label: 'Pending',          color: '#E3A73B', bg: 'rgba(227,167,59,0.12)',   icon: '◷' },
  PENDING_PEER:    { label: 'Awaiting Peer',    color: '#E3A73B', bg: 'rgba(227,167,59,0.12)',   icon: '◷' },
  PENDING_MANAGER: { label: 'Awaiting Manager', color: '#E3A73B', bg: 'rgba(227,167,59,0.12)',   icon: '◷' },
  APPROVED:        { label: 'Approved',         color: '#3FB876', bg: 'rgba(63,184,118,0.12)',   icon: '✓' },
  PUBLISHED:       { label: 'Published',        color: '#3FB876', bg: 'rgba(63,184,118,0.12)',   icon: '✓' },
  REJECTED:        { label: 'Rejected',         color: '#E1584F', bg: 'rgba(225,88,79,0.12)',    icon: '✕' },
  CANCELLED:       { label: 'Cancelled',        color: '#6B687A', bg: 'rgba(107,104,122,0.12)',  icon: '○' },
  DRAFT:           { label: 'Draft',            color: '#A6A3B5', bg: 'rgba(166,163,181,0.12)',  icon: '…' },
  BLOCKING:        { label: 'Blocking',         color: '#E1584F', bg: 'rgba(225,88,79,0.12)',    icon: '⚠' },
  WARNING:         { label: 'Warning',          color: '#E3A73B', bg: 'rgba(227,167,59,0.12)',   icon: '⚠' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const cfg = CONFIG[status] ?? CONFIG['PENDING'];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}
      style={{
        color: cfg.color,
        background: cfg.bg,
        borderColor: `${cfg.color}30`,
      }}
    >
      {cfg.icon && <span aria-hidden="true">{cfg.icon}</span>}
      {cfg.label}
    </span>
  );
}

export default StatusBadge;
