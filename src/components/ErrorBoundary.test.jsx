import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

const captureException = vi.fn();
vi.mock("../core/monitoring/sentry", () => ({ captureException: (...args) => captureException(...args) }));

function Bomb() {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders children when nothing has thrown", () => {
    render(
      <ErrorBoundary>
        <p>All fine</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("All fine")).toBeInTheDocument();
  });

  it("falls back to a reload screen and reports the error when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));

    spy.mockRestore();
  });
});
