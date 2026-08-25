import { useMemo, useState } from "react";

export default function usePagination(items = [], pageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Derived directly from state instead of corrected a render later via an
  // effect — e.g. after filtering shrinks the list out from under the current
  // page, this is valid immediately instead of briefly showing an empty page.
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    pageSize,
    totalItems: items.length,
    paginatedItems
  };
}
