/*
 * Page numbers.
 *
 * Used only by the platform-admin screens. It hardcoded `bg-white`,
 * `border-gray-200`, `text-gray-700` and `bg-blue-600` with no dark variant,
 * so on every one of those screens in dark mode it rendered white buttons with
 * grey text on a dark page — the one control that never got a theme.
 */
export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  const base =
    "press min-h-[40px] min-w-[40px] px-3 rounded-control text-body-sm font-semibold border transition-colors disabled:opacity-50";

  return (
    <nav className="flex items-center justify-center gap-2 mt-6" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={`${base} bg-surface-raised border-line-subtle text-content-primary`}
      >
        Prev
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`${base} tnum ${
            page === currentPage
              ? "bg-brand-gold border-brand-gold text-content-on-gold"
              : "bg-surface-raised border-line-subtle text-content-primary"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={`${base} bg-surface-raised border-line-subtle text-content-primary`}
      >
        Next
      </button>
    </nav>
  );
}
