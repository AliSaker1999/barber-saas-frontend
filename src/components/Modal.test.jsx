import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./Modal";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders its content and title when open", () => {
    render(
      <Modal isOpen onClose={() => {}} title="Manage Subscription">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText("Manage Subscription")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("also opens via the `open` prop alias, not just `isOpen`", () => {
    render(
      <Modal open onClose={() => {}}>
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("calls onClose when the overlay is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );

    await user.click(screen.getByText("Content").closest(".app-modal-overlay"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking inside the modal content (stopPropagation)", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );

    await user.click(screen.getByText("Content"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose via the explicit close button", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>
    );

    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // The regression this session's fix guards against: useCallback was
  // previously called AFTER an early `if (!isModalOpen) return null`, which
  // varies the number of hooks called between a closed render and an open
  // one — a Rules-of-Hooks violation. Toggling closed -> open on the *same*
  // mounted component (not remounting) is what actually exercises that path.
  it("toggling from closed to open on the same mounted instance doesn't violate the Rules of Hooks", () => {
    const { rerender } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>Content</p>
      </Modal>
    );

    expect(() =>
      rerender(
        <Modal isOpen onClose={() => {}} title="Now Open">
          <p>Content</p>
        </Modal>
      )
    ).not.toThrow();

    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
