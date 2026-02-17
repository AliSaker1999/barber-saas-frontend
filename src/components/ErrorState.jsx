export default function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
  retryLabel = "Try again"
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 dark:bg-red-950/30 dark:border-red-900/60">
      <p className="text-sm font-medium text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start sm:self-auto px-3 py-2 rounded-lg text-xs font-bold bg-white border border-red-200 text-red-700 hover:bg-red-100 dark:bg-slate-800 dark:border-red-900 dark:text-red-300 dark:hover:bg-slate-700"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
