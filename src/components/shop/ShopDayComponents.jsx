import { Avatar, Pill } from "../ui/Primitives";

/*
 * The two shapes a shop's day is made of.
 *
 * Shared by Today, the Queue tab and the Calendar tab so a customer looks the
 * same wherever a shop sees them — same avatar, same status pill, same place
 * for the actions. They were private to `pages/company/Today.jsx` until two
 * more screens needed them.
 *
 * Presentational only: no redux, no router, no sockets. The screens own the
 * data and the actions.
 */

/* ---------------------------------------------------------------------------
   StatStrip — counters, for reading not for tapping.
   Filters belong in `ui/Primitives`' FilterChip, which is a real control with
   pressed state; this renders plain text and must not pretend otherwise.
   ------------------------------------------------------------------------- */
export function StatStrip({ stats }) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex-shrink-0 min-w-[92px] px-3 py-2.5 rounded-card bg-surface-raised border border-line-subtle"
        >
          <p className="text-h2 text-content-primary tnum leading-none">{stat.value}</p>
          <p className="mt-1 text-caption text-content-muted truncate">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   PersonRow — one customer, one row.

   `leading` is for a queue position marker ("NOW", "#2") or a time; it sits
   before the avatar and is tabular so a column of them lines up.
   `highlight` is the in-the-chair treatment.
   ------------------------------------------------------------------------- */
export function PersonRow({
  name,
  photo,
  primary,
  secondary,
  tone,
  toneLabel,
  badges,
  actions,
  leading,
  onOpen,
  highlight = false
}) {
  const body = (
    <>
      {leading ? (
        <span className="w-10 flex-shrink-0 text-center text-caption font-bold text-content-muted tnum">
          {leading}
        </span>
      ) : null}
      <Avatar src={photo} name={name} size={42} />
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="flex-1 text-body font-bold text-content-primary truncate">{name}</span>
          {toneLabel ? <Pill tone={tone}>{toneLabel}</Pill> : null}
        </span>
        {primary ? (
          <span className="block text-body-sm text-content-secondary truncate">{primary}</span>
        ) : null}
        {secondary ? (
          <span className="block text-caption text-content-muted tnum truncate">{secondary}</span>
        ) : null}
        {badges ? <span className="mt-1 flex items-center gap-1.5 flex-wrap">{badges}</span> : null}
      </span>
    </>
  );

  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-card border ${
        highlight ? "bg-brand-gold-soft border-brand-gold" : "bg-surface-raised border-line-subtle"
      }`}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-3 flex-1 min-w-0 text-start"
        >
          {body}
        </button>
      ) : (
        <div className="flex items-center gap-3 flex-1 min-w-0">{body}</div>
      )}
      {actions ? <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div> : null}
    </div>
  );
}
