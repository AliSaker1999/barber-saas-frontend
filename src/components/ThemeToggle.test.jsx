import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("reads the initial theme once via a lazy useState initializer, not an effect", () => {
    // This is the exact fix from this session: ThemeToggle used to start at a
    // hardcoded "light" and correct itself via useEffect on first render — a
    // visible flash for anyone who'd actually saved "dark". Reading it via
    // useState(getInitialTheme) means the very first render is already right.
    localStorage.setItem("barber-theme", "dark");

    render(<ThemeToggle />);

    expect(screen.getByRole("button")).toHaveTextContent("☀️");
    expect(screen.getByRole("button")).toHaveAttribute("title", "Switch to light mode");
  });

  it("defaults to light when nothing is saved", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveTextContent("🌙");
  });

  it("toggles the theme and persists it on click", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("🌙");

    await user.click(button);

    expect(button).toHaveTextContent("☀️");
    expect(localStorage.getItem("barber-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await user.click(button);

    expect(button).toHaveTextContent("🌙");
    expect(localStorage.getItem("barber-theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
