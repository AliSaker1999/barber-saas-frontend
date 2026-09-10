import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../../i18n";

import Select from "./Select";

/*
 * Select replaced every native <select> in the app, so these cover the
 * contract those call sites depend on: the synthetic change event they read
 * `e.target.name` / `e.target.value` from, keyboard operation, and the search
 * box that only appears once a list is long enough to need one.
 */

const GENDERS = [
  { value: "Male", label: "Male", icon: "gender-male" },
  { value: "Female", label: "Female", icon: "gender-female" },
  { value: "Unisex", label: "Unisex", icon: "gender-unisex" },
  { value: "Other", label: "Other", icon: "gender-other" }
];

const wrap = (ui) => render(<I18nProvider>{ui}</I18nProvider>);

const trigger = () => screen.getByRole("combobox");

describe("Select", () => {
  it("shows the placeholder until something is chosen", () => {
    wrap(<Select options={GENDERS} placeholder="Select..." onChange={() => {}} />);
    expect(trigger()).toHaveTextContent("Select...");
  });

  it("shows the label of the current value, matching loosely on type", () => {
    wrap(<Select options={[{ value: 7, label: "Beard trim" }]} value="7" onChange={() => {}} />);
    expect(trigger()).toHaveTextContent("Beard trim");
  });

  it("stays closed until it is asked to open", () => {
    wrap(<Select options={GENDERS} onChange={() => {}} />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("reports the choice as an event the old select call sites can read", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    wrap(<Select name="gender" options={GENDERS} onChange={onChange} />);

    await user.click(trigger());
    await user.click(screen.getByRole("option", { name: /female/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target).toEqual({ name: "gender", value: "Female" });
    /* Choosing closes the panel. */
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("marks the current value as the selected option", async () => {
    const user = userEvent.setup();
    wrap(<Select options={GENDERS} value="Unisex" onChange={() => {}} />);

    await user.click(trigger());

    expect(screen.getByRole("option", { name: /unisex/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("option", { name: /^male/i })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("filters on the search box, and says so when nothing matches", async () => {
    const user = userEvent.setup();
    wrap(<Select options={GENDERS} onChange={() => {}} />);

    await user.click(trigger());
    const search = screen.getByPlaceholderText("Search...");
    await user.type(search, "fem");

    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option")).toHaveLength(1);
    expect(within(list).getByRole("option")).toHaveTextContent("Female");

    await user.clear(search);
    await user.type(search, "zzz");
    expect(within(list).queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("leaves out the search box for a list short enough to just read", async () => {
    const user = userEvent.setup();
    wrap(
      <Select
        options={[
          { value: "PERCENTAGE", label: "Percentage (%)" },
          { value: "FIXED", label: "Fixed Amount ($)" }
        ]}
        onChange={() => {}}
      />
    );

    await user.click(trigger());
    expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
  });

  it("opens and picks from the keyboard alone", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    wrap(
      <Select
        name="discountType"
        options={[
          { value: "PERCENTAGE", label: "Percentage (%)" },
          { value: "FIXED", label: "Fixed Amount ($)" }
        ]}
        value="PERCENTAGE"
        onChange={onChange}
      />
    );

    await user.tab();
    expect(trigger()).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{ArrowDown}{Enter}");
    expect(onChange.mock.calls[0][0].target.value).toBe("FIXED");
  });

  it("closes on Escape and hands focus back to the trigger", async () => {
    const user = userEvent.setup();
    wrap(<Select options={GENDERS} onChange={() => {}} />);

    await user.click(trigger());
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("never opens when disabled", async () => {
    const user = userEvent.setup();
    wrap(<Select options={GENDERS} disabled onChange={() => {}} />);

    await user.click(trigger());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ignores a disabled option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    wrap(
      <Select
        options={[
          { value: "a", label: "Available" },
          { value: "b", label: "Booked out", disabled: true }
        ]}
        onChange={onChange}
      />
    );

    await user.click(trigger());
    await user.click(screen.getByRole("option", { name: /booked out/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("mirrors a required field into a native control so the form still validates", () => {
    const { container } = wrap(
      <Select name="partnerBarberId" options={GENDERS} required onChange={() => {}} />
    );

    const mirror = container.querySelector("select[required]");
    expect(mirror).toBeInTheDocument();
    expect(mirror).toHaveAttribute("name", "partnerBarberId");
    expect(mirror.value).toBe("");
    expect(mirror.checkValidity()).toBe(false);
  });
});
