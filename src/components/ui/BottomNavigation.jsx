import { NavLink } from "react-router-dom";
import Icon from "./Icon";

/*
 * BottomNavigation — exactly five destinations, no more (spec §6).
 *
 * Messages, notifications, favourites, stats, services and barbers were all
 * previously tabs. They are reachable in context now; a tab bar with eight
 * items is a menu, not navigation.
 *
 * Icons carry text labels because an icon alone is ambiguous, and each tab
 * fills a 44px-tall target across the full width of its column.
 */
export default function BottomNavigation({ items }) {
  return (
    <nav
      aria-label="Main"
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-surface-raised/95 backdrop-blur-lg
                 border-t border-line-subtle pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            {/* A tab may open a sheet instead of navigating (the shop app's
                "More"); it still has to look and size like every other tab. */}
            {item.onClick ? (
              <button
                type="button"
                onClick={item.onClick}
                className="relative w-full flex flex-col items-center justify-center gap-1 h-[60px] px-1 text-content-muted"
              >
                <span className="relative">
                  <Icon name={item.icon} size={22} />
                </span>
                <span className="text-[10.5px] leading-none tracking-tight font-semibold">
                  {item.label}
                </span>
              </button>
            ) : (
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "relative flex flex-col items-center justify-center gap-1 h-[60px] px-1",
                  "transition-colors duration-[var(--dur-fast)]",
                  isActive ? "text-brand-gold-text" : "text-content-muted"
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  {/* The active marker is a short bar at the top edge — it
                      survives both themes without needing a filled pill. */}
                  <span
                    aria-hidden="true"
                    className={`absolute top-0 h-[2.5px] w-8 rounded-pill transition-opacity ${
                      isActive ? "bg-brand-gold opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="relative">
                    <Icon name={item.icon} size={22} strokeWidth={isActive ? 2.1 : 1.75} />
                    {item.badge ? (
                      <span
                        className="absolute -top-1 -end-1.5 min-w-[15px] h-[15px] px-1 rounded-pill
                                   bg-state-danger text-white text-[9px] font-bold leading-[15px] text-center tnum"
                      >
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`text-[10.5px] leading-none tracking-tight ${
                      isActive ? "font-bold" : "font-semibold"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
