import { useAppDispatch, useAppSelector } from "../app/hooks";
import { toggleFavorite, fetchFavorites } from "../features/favorites/favoritesSlice";
import { useI18n } from "../i18n";

export default function FavoriteButton({ type, targetId, size = "md" }) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.favorites);

  const isFav = items.some((f) => {
    if (type === "SHOP") return f.TenantId === targetId;
    return f.BarberId === targetId;
  });

  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch(toggleFavorite({ type, targetId })).then(() => {
      dispatch(fetchFavorites());
    });
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-10 h-10 text-xl",
    lg: "w-12 h-12 text-2xl",
  };

  return (
    <button
      onClick={handleToggle}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
        isFav
          ? "bg-red-50 dark:bg-red-900/20 text-red-500"
          : "bg-app-surface-2 text-app-muted hover:text-red-400"
      }`}
      title={isFav ? t("remove_from_favorites") : t("add_to_favorites")}
    >
      {isFav ? "❤️" : "🤍"}
    </button>
  );
}
