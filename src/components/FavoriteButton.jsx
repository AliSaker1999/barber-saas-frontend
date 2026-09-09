import { useState } from "react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { toggleFavorite, fetchFavorites } from "../features/favorites/favoritesSlice";
import Icon from "./ui/Icon";
import { Spinner } from "./ui/Button";
import { useI18n } from "../i18n";

/*
 * Favourite toggle.
 *
 * Was a ❤️/🤍 emoji pair, which rendered in a different typeface per Android
 * OEM and could not take a theme colour. It is a stroked/filled icon now, and
 * the state is carried by fill plus a gold accent rather than by two different
 * pictures.
 *
 * `onPhoto` gives the button its own backdrop when it sits on a hero image,
 * where neither theme's surface colour is behind it.
 */
export default function FavoriteButton({ type, targetId, size = "md", onPhoto = false }) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.favorites.items);
  const [toggling, setToggling] = useState(false);

  const isFav = items.some((f) =>
    type === "SHOP" ? f.TenantId === targetId : f.BarberId === targetId
  );

  const handleToggle = async (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (toggling) return;

    setToggling(true);
    try {
      await dispatch(toggleFavorite({ type, targetId })).unwrap();
      dispatch(fetchFavorites());
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setToggling(false);
    }
  };

  const box = size === "sm" ? "w-9 h-9" : size === "lg" ? "w-12 h-12" : "tap-target";
  const glyph = size === "sm" ? 16 : size === "lg" ? 22 : 19;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={toggling}
      aria-pressed={isFav}
      aria-label={isFav ? t("remove_from_favorites") : t("add_to_favorites")}
      title={isFav ? t("remove_from_favorites") : t("add_to_favorites")}
      className={[
        box,
        "press rounded-pill flex items-center justify-center flex-shrink-0 disabled:pointer-events-none",
        onPhoto
          ? "bg-surface-raised/90 backdrop-blur shadow-sm"
          : "bg-surface-sunken",
        isFav ? "text-brand-gold-text" : "text-content-muted"
      ].join(" ")}
    >
      {toggling ? <Spinner size={glyph} /> : <Icon name="heart" size={glyph} filled={isFav} />}
    </button>
  );
}
