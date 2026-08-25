import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { useMemo } from "react";

export default function MobileHeader({ title, onBack, primaryAction, subtitle }) {
  const navigate = useNavigate();
  const { isOnline, lastSyncAt } = useAppSelector(state => state.ui);
  
  const handleBack = () => {
    if (onBack) return onBack();
    navigate(-1);
  };

  const formattedSyncTime = useMemo(() => {
    if (!lastSyncAt) return null;
    const date = new Date(lastSyncAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lastSyncAt]);

  return (
    <div className="sm:hidden sticky top-0 z-40 bg-app-surface/90 backdrop-blur-md border-b border-app-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
            <button
            onClick={handleBack}
            className="tap-target -ml-2 w-10 h-10 rounded-xl text-gray-600 hover:bg-gray-100 flex items-center justify-center"
            aria-label="Back"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            </button>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
        </div>
        
        <div className="flex-1 min-w-0 px-2 text-center">
          <h1 className="text-sm font-black text-gray-900 truncate tracking-tight uppercase leading-tight">{title}</h1>
          {subtitle ? (
            <p className="text-[10px] text-gray-400 font-bold truncate uppercase">{subtitle}</p>
          ) : (
            isOnline && formattedSyncTime && (
              <p className="text-[9px] text-green-500 font-bold tracking-widest uppercase">Sync: {formattedSyncTime}</p>
            )
          )}
        </div>

        {primaryAction ? (
          <button
            onClick={primaryAction.onClick}
            className="tap-target -mr-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider"
          >
            {primaryAction.label}
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>
    </div>
  );
}
