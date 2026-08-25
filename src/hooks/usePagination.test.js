import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import usePagination from "./usePagination";

const items = Array.from({ length: 25 }, (_, i) => i + 1);

describe("usePagination", () => {
  it("paginates the first page by default", () => {
    const { result } = renderHook(() => usePagination(items, 10));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.totalItems).toBe(25);
    expect(result.current.paginatedItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("moves to the requested page", () => {
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => result.current.setCurrentPage(2));

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("returns a partial last page", () => {
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => result.current.setCurrentPage(3));

    expect(result.current.paginatedItems).toEqual([21, 22, 23, 24, 25]);
  });

  // This is the exact bug fixed this session: currentPage used to be clamped
  // via a useEffect that ran a render late, briefly showing an empty page
  // before correcting itself. Deriving it during render instead means the
  // very first render after the list shrinks is already correct.
  it("clamps to the last valid page immediately when the list shrinks out from under the current page — no effect, no extra render", () => {
    const { result, rerender } = renderHook(
      ({ list }) => usePagination(list, 10),
      { initialProps: { list: items } }
    );

    act(() => result.current.setCurrentPage(3));
    expect(result.current.currentPage).toBe(3);

    // Simulate the list shrinking (e.g. a filter removing most items) while
    // still on page 3, which no longer exists.
    const shrunkList = items.slice(0, 5);
    rerender({ list: shrunkList });

    expect(result.current.totalPages).toBe(1);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.paginatedItems).toEqual([1, 2, 3, 4, 5]);
  });

  it("never reports fewer than 1 total page, even for an empty list", () => {
    const { result } = renderHook(() => usePagination([], 10));

    expect(result.current.totalPages).toBe(1);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.paginatedItems).toEqual([]);
  });

  it("defaults to a page size of 10 when not specified", () => {
    const { result } = renderHook(() => usePagination(items));

    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalPages).toBe(3);
  });
});
