export default function EmptyState({
  title = "No data found",
  description = "Try adjusting your filters and try again."
}) {
  return (
    <div className="bg-app-surface rounded-2xl border border-app-border p-8 text-center dark:bg-slate-800 dark:border-slate-700">
      <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 mx-auto mb-3 flex items-center justify-center text-xl dark:bg-slate-700 dark:text-blue-300">
        📭
      </div>
      <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{description}</p>
    </div>
  );
}
