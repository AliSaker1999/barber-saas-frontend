import { useState } from "react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { toggleFavorite, fetchFavorites } from "../features/favorites/favoritesSlice";
import { useI18n } from "../i18n";

export default function FavoriteButton({ type, targetId, size = "md" }) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.favorites);
  const [toggling, setToggling] = useState(false);

  const isFav = items.some((f) => {
    if (type === "SHOP") return f.TenantId === targetId;
    return f.BarberId === targetId;
  });

  const handleToggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
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

  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-10 h-10 text-xl",
    lg: "w-12 h-12 text-2xl",
  };

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:pointer-events-none ${
        isFav
          ? "bg-red-50 dark:bg-red-900/20 text-red-500 shadow-sm"
          : "bg-white/80 backdrop-blur-sm text-gray-400 hover:text-red-400 shadow-sm"
      }`}
      title={isFav ? t("remove_from_favorites") : t("add_to_favorites")}
    >
      {toggling ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : isFav ? "❤️" : "🤍"}
    </button>
  );
}
