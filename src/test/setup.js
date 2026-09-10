import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom doesn't implement matchMedia — several components (theme detection,
// responsive checks) call it, so this needs to exist globally rather than
// being mocked per-test.
window.matchMedia = window.matchMedia || vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}));

// jsdom has no layout, so it implements neither of these. Select keeps the
// highlighted option in view with scrollIntoView, and positions its panel from
// the trigger's box — both are real browser APIs, not component fallbacks.
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || vi.fn();
