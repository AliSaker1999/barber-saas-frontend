import { useId } from "react";

/*
 * Field — the one text input.
 *
 * The label/input/hint/error stack was being pasted inline wherever a form was
 * needed, which is why some inputs are 48px and some are 44, some show their
 * error in red text and some silently do nothing. Everything here is the shape
 * the migrated screens already use; it is just in one place now.
 *
 * `dir` matters more than it looks. Phone numbers, times and prices read
 * left-to-right even in Arabic, so those call sites pass dir="ltr" — without
 * it a Lebanese number renders with its digits in a surprising order.
 */
export default function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
  error,
  optional = false,
  optionalLabel,
  suffix,
  action,
  as = "input",
  rows = 3,
  className = "",
  inputClassName = "",
  id,
  ...rest
}) {
  const reactId = useId();
  const fieldId = id || `field-${reactId}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  const control = [
    "w-full px-3.5 rounded-control bg-surface-raised border",
    as === "textarea" ? "py-2.5" : "h-12",
    "text-body text-content-primary placeholder:text-content-muted",
    "outline-none transition-colors",
    error ? "border-state-danger" : "border-line-subtle focus:border-brand-gold",
    /* Keeps the value clear of the trailing control instead of running under it. */
    action ? "pe-12" : "",
    inputClassName
  ]
    .filter(Boolean)
    .join(" ");

  const shared = {
    id: fieldId,
    value: value ?? "",
    onChange,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [errorId, hintId].filter(Boolean).join(" ") || undefined,
    className: control,
    ...rest
  };

  return (
    <div className={`block ${className}`}>
      {label ? (
        <label htmlFor={fieldId} className="block text-label uppercase text-content-muted mb-1.5">
          {label}
          {optional ? (
            <span className="normal-case font-normal"> ({optionalLabel})</span>
          ) : null}
        </label>
      ) : null}

      {suffix || action ? (
        <div className="relative flex items-center">
          {as === "textarea" ? (
            <textarea rows={rows} {...shared} />
          ) : (
            <input type={type} {...shared} />
          )}
          {/* Sits inside the control rather than after it, so a currency or a
              unit reads as part of the value instead of as another field. */}
          {suffix ? (
            <span className="pointer-events-none absolute end-3.5 text-body-sm text-content-muted">
              {suffix}
            </span>
          ) : null}
          {/* `action` is the interactive twin of `suffix` — a password reveal,
              a clear button. It must stay clickable, so unlike `suffix` it is
              not pointer-events-none, and it carries its own label. */}
          {action ? <span className="absolute end-1.5 flex items-center">{action}</span> : null}
        </div>
      ) : as === "textarea" ? (
        <textarea rows={rows} {...shared} />
      ) : (
        <input type={type} {...shared} />
      )}

      {error ? (
        <span id={errorId} role="alert" className="block mt-1.5 text-caption text-state-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="block mt-1.5 text-caption text-content-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
