export default function LoadingState({ label = "Loading...", blocks = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: blocks }).map((_, index) => (
        <div
          key={index}
          className="h-24 rounded-2xl border border-gray-100 bg-white animate-pulse dark:bg-slate-800 dark:border-slate-700"
        />
      ))}
      <p className="text-xs text-center font-semibold text-gray-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
