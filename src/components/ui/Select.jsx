import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { useI18n } from "../../i18n";

/*
 * Select — the one dropdown in the app.
 *
 * Replaces every native <select>, which the browser renders with its own
 * chrome: on Android that is a full-screen grey list that ignores the palette
 * entirely, and on desktop a control whose options can't be styled at all.
 * This one is ours end to end — token colours, the app's radii, a search box
 * once the list is long enough to need one, an optional glyph per option and a
 * gold check on the chosen row.
 *
 * The panel renders in a portal at fixed coordinates, so it is never clipped
 * by an `overflow-hidden` card and never trapped under a sheet's stacking
 * context. Its z-index has to clear every layer it can be opened from — the
 * legacy `.app-modal-overlay` is 9999 and BottomSheet is 300 — because as a
 * body-level sibling of those it would otherwise paint behind them.
 *
 * `onChange` is handed a synthetic `{ target: { name, value } }` so the call
 * sites that already read `e.target.value` — or pass a shared `handleChange`
 * that reads `e.target.name` — keep working untouched.
 */

/* Below this many options a search box is noise, not help. */
const SEARCH_THRESHOLD = 4;

const SIZES = {
  sm: "min-h-[40px] px-3 text-body-sm",
  md: "min-h-[44px] px-4 text-body",
  lg: "min-h-[48px] px-4 text-body"
};

/* Accepts ["Male", …] as well as [{ value, label, icon, hint, disabled }, …]. */
function normalize(options) {
  return (options || []).map((option) =>
    option != null && typeof option === "object"
      ? { ...option, label: option.label ?? String(option.value ?? "") }
      : { value: option, label: String(option ?? "") }
  );
}

const sameValue = (a, b) => a === b || (a != null && b != null && String(a) === String(b));

const firstEnabled = (list) => list.findIndex((o) => !o.disabled);

export default function Select({
  options = [],
  value,
  onChange,
  name,
  id,
  placeholder,
  searchable,
  searchPlaceholder,
  emptyLabel,
  icon,
  disabled = false,
  required = false,
  invalid = false,
  size = "md",
  className = "",
  buttonClassName = "",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...rest
}) {
  const { t } = useI18n();
  const reactId = useId();
  const listId = `${id || name || "select"}-${reactId}-list`;

  const items = useMemo(() => normalize(options), [options]);
  const selected = useMemo(() => items.find((o) => sameValue(o.value, value)), [items, value]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState(null);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const typeaheadRef = useRef({ buffer: "", timer: 0 });

  const withSearch = searchable ?? items.length >= SEARCH_THRESHOLD;

  const matching = useCallback(
    (needle) => {
      const q = needle.trim().toLowerCase();
      if (!q) return items;
      return items.filter((o) => `${o.label} ${o.hint || ""}`.toLowerCase().includes(q));
    },
    [items]
  );

  const visible = useMemo(() => matching(query), [matching, query]);

  /* ---- positioning ------------------------------------------------------
     Measured from the trigger every time it could have moved. Flips above the
     trigger when the space below can't hold a usable list — a picker at the
     bottom of a form must not open off-screen. */
  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    const viewport = window.innerHeight;
    const roomBelow = viewport - rect.bottom - gap - margin;
    const roomAbove = rect.top - gap - margin;
    const flip = roomBelow < 220 && roomAbove > roomBelow;

    setPosition({
      left: rect.left,
      width: rect.width,
      top: flip ? undefined : rect.bottom + gap,
      bottom: flip ? viewport - rect.top + gap : undefined,
      maxHeight: Math.max(160, Math.min(340, flip ? roomAbove : roomBelow))
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();

    /* Capture phase so a scroll in any ancestor — not just the window —
       repositions the panel instead of leaving it floating behind. */
    const reposition = () => measure();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, measure]);

  const close = useCallback(
    ({ restoreFocus = true } = {}) => {
      setOpen(false);
      setQuery("");
      setActiveIndex(-1);
      if (restoreFocus) triggerRef.current?.focus();
    },
    []
  );

  /* Dismiss on a tap anywhere outside the trigger or the panel. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      if (
        panelRef.current?.contains(event.target) ||
        triggerRef.current?.contains(event.target)
      ) {
        return;
      }
      close({ restoreFocus: false });
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, close]);

  /* Opens onto the current choice, so Enter twice is a no-op rather than a
     silent change of answer. */
  const openMenu = useCallback(() => {
    const selectedIndex = items.findIndex((o) => sameValue(o.value, value));
    setQuery("");
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled(items));
    setOpen(true);
  }, [items, value]);

  /* A long list is faster to type than to scroll, so the search box takes
     focus as soon as the panel is up. */
  useEffect(() => {
    if (!open || !withSearch) return;
    const timer = setTimeout(() => searchRef.current?.focus(), 20);
    return () => clearTimeout(timer);
  }, [open, withSearch]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const commit = useCallback(
    (option) => {
      if (!option || option.disabled) return;
      close();
      onChange?.({
        type: "change",
        target: { name, value: option.value },
        currentTarget: { name, value: option.value }
      });
    },
    [close, name, onChange]
  );

  const step = useCallback(
    (from, delta) => {
      if (!visible.length) return -1;
      let next = from;
      for (let i = 0; i < visible.length; i += 1) {
        next = (next + delta + visible.length) % visible.length;
        if (!visible[next].disabled) return next;
      }
      return -1;
    },
    [visible]
  );

  /* Jump to the option starting with what was typed — the one native-select
     behaviour worth keeping when there is no search box. */
  const typeahead = useCallback(
    (char) => {
      const state = typeaheadRef.current;
      window.clearTimeout(state.timer);
      state.buffer += char.toLowerCase();
      state.timer = window.setTimeout(() => {
        state.buffer = "";
      }, 600);

      const hit = visible.findIndex(
        (o) => !o.disabled && o.label.toLowerCase().startsWith(state.buffer)
      );
      if (hit >= 0) setActiveIndex(hit);
    },
    [visible]
  );

  const onKeyDown = (event) => {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => step(i, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => step(i < 0 ? 0 : i, -1));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(step(-1, 1));
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(step(0, -1));
        break;
      case "Enter":
        event.preventDefault();
        commit(visible[activeIndex]);
        break;
      case " ":
        /* In the search box a space is a space, not a selection. */
        if (withSearch) break;
        event.preventDefault();
        commit(visible[activeIndex]);
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        close({ restoreFocus: false });
        break;
      default:
        if (!withSearch && event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          typeahead(event.key);
        }
    }
  };

  /* Only one element may be the combobox, and it has to be whichever one
     holds focus — otherwise arrowing through a filtered list announces
     nothing. The trigger keeps the role; the search field is a plain textbox
     that drives the same listbox through aria-activedescendant. */
  const activeId = activeIndex >= 0 && visible[activeIndex] ? `${listId}-${activeIndex}` : undefined;

  const triggerAria = {
    role: "combobox",
    "aria-haspopup": "listbox",
    "aria-expanded": open,
    "aria-controls": open ? listId : undefined,
    "aria-activedescendant": open && !withSearch ? activeId : undefined
  };

  const searchAria = {
    "aria-controls": listId,
    "aria-activedescendant": activeId
  };

  const panel =
    open && position ? (
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          left: position.left,
          top: position.top,
          bottom: position.bottom,
          width: position.width
        }}
        className="z-[10000] animate-rise rounded-control border border-line-subtle bg-surface-elevated shadow-lg overflow-hidden"
      >
        {withSearch ? (
          <div className="p-2 border-b border-line-subtle">
            <div className="relative flex items-center">
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute start-2.5 text-content-muted"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  const next = e.target.value;
                  setQuery(next);
                  /* A filtered list can't keep the old highlight — the row it
                     pointed at may not be on screen any more. */
                  setActiveIndex(firstEnabled(matching(next)));
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder || t("select_search")}
                aria-label={searchPlaceholder || t("select_search")}
                className="w-full min-h-[36px] ps-8 pe-3 rounded-control bg-surface-sunken
                           text-body-sm text-content-primary placeholder:text-content-muted
                           border border-transparent outline-none
                           focus:border-brand-gold focus:bg-surface-raised"
                {...searchAria}
              />
            </div>
          </div>
        ) : null}

        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel || placeholder || t("select_placeholder")}
          tabIndex={-1}
          style={{ maxHeight: position.maxHeight }}
          className="overflow-y-auto overscroll-contain p-1.5"
        >
          {visible.length === 0 ? (
            <li role="presentation" className="px-3 py-4 text-center text-body-sm text-content-muted">
              {emptyLabel || t("select_no_results")}
            </li>
          ) : (
            visible.map((option, index) => {
              const isSelected = sameValue(option.value, value);
              const isActive = index === activeIndex;

              return (
                <li key={`${option.value}-${index}`} role="none">
                  <div
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    onClick={() => commit(option)}
                    onMouseMove={() => {
                      if (!option.disabled && index !== activeIndex) setActiveIndex(index);
                    }}
                    className={[
                      "flex items-center gap-2.5 min-h-[40px] px-2.5 py-1.5 rounded-[10px]",
                      "text-body cursor-pointer select-none transition-colors",
                      option.disabled
                        ? "opacity-45 cursor-not-allowed"
                        : isSelected
                          ? "bg-brand-gold-soft text-content-primary font-semibold"
                          : isActive
                            ? "bg-surface-sunken text-content-primary"
                            : "text-content-secondary"
                    ].join(" ")}
                  >
                    {option.icon ? (
                      <Icon
                        name={option.icon}
                        size={18}
                        className={`flex-shrink-0 ${
                          isSelected ? "text-brand-gold-text" : "text-content-muted"
                        }`}
                      />
                    ) : null}

                    <span className="flex-1 min-w-0">
                      <span className="block">{option.label}</span>
                      {option.hint ? (
                        <span className="block text-caption text-content-muted font-normal">
                          {option.hint}
                        </span>
                      ) : null}
                    </span>

                    {isSelected ? (
                      <Icon
                        name="check"
                        size={17}
                        className="flex-shrink-0 text-brand-gold-text animate-check"
                      />
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        className={[
          "w-full flex items-center gap-2.5 text-start rounded-control border",
          "bg-surface-raised transition-colors outline-none",
          SIZES[size] || SIZES.md,
          invalid ? "border-state-danger" : "border-line-strong",
          disabled
            ? "opacity-55 cursor-not-allowed"
            : "cursor-pointer hover:bg-surface-sunken focus-visible:border-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold/30",
          open ? "border-brand-gold ring-2 ring-brand-gold/30" : "",
          buttonClassName
        ]
          .filter(Boolean)
          .join(" ")}
        {...triggerAria}
        {...rest}
      >
        {icon ? (
          <Icon name={icon} size={18} className="flex-shrink-0 text-content-muted" />
        ) : null}

        <span
          className={`flex-1 min-w-0 truncate ${
            selected ? "text-content-primary" : "text-content-muted"
          }`}
        >
          {selected ? selected.label : placeholder || t("select_placeholder")}
        </span>

        <Icon
          name="chevron-down"
          size={18}
          className={`flex-shrink-0 text-content-muted transition-transform duration-[var(--dur-fast)] ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Native mirror, only when the form relies on browser validation. It is
          transparent but laid over the trigger at full size — a control the
          browser considers unfocusable can't report a validation message, and
          an anchored bubble needs somewhere real to point. */}
      {required ? (
        <select
          tabIndex={-1}
          aria-hidden="true"
          required
          name={name}
          value={selected ? String(selected.value) : ""}
          onChange={() => {}}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        >
          <option value="" />
          {items.map((option, index) => (
            <option key={`mirror-${option.value}-${index}`} value={String(option.value)} />
          ))}
        </select>
      ) : null}

      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
