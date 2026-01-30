import React, { useMemo } from 'react';
import { useAppSelector } from '../app/hooks';

export default function ConnectionBadge({ className = "" }) {
  const { isOnline, lastSyncAt } = useAppSelector(state => state.ui);

  const formattedTime = useMemo(() => {
    if (!lastSyncAt) return '';
    const date = new Date(lastSyncAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lastSyncAt]);

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
      isOnline 
        ? "bg-green-50 text-green-600 border border-green-100" 
        : "bg-red-50 text-red-600 border border-red-100 animate-pulse"
    } ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`} />
      <span>
        {isOnline ? "Online" : "Offline"}
      </span>
      {isOnline && formattedTime && (
        <>
          <span className="w-1 h-1 rounded-full bg-green-200" />
          <span className="text-green-400 normal-case font-medium">Sync: {formattedTime}</span>
        </>
      )}
    </div>
  );
}
