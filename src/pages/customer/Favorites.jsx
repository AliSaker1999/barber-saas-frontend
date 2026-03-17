import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchFavorites, toggleFavorite } from "../../features/favorites/favoritesSlice";
import { useI18n } from "../../i18n";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import MobileHeader from "../../components/MobileHeader";

export default function Favorites() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, isLoading } = useAppSelector((state) => state.favorites);

  useEffect(() => {
    dispatch(fetchFavorites());
  }, [dispatch]);

  const shopFavorites = items.filter((f) => f.Type === "SHOP");
  const barberFavorites = items.filter((f) => f.Type === "BARBER");

  const handleRemoveFavorite = (type, targetId) => {
    dispatch(toggleFavorite({ type, targetId })).then(() => {
      dispatch(fetchFavorites());
    });
  };

  if (isLoading) return <LoadingState label={t("loading")} blocks={3} />;

  return (
    <div className="space-y-6">
      <MobileHeader title={t("favorites")} />

      {items.length === 0 ? (
        <EmptyState
          icon="❤️"
          title={t("no_favorites")}
          description={t("try_different_search")}
        />
      ) : (
        <>
          {/* Favorite Shops */}
          {shopFavorites.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-app-text mb-3 flex items-center gap-2">
                🏪 {t("favorite_shops")}
                <span className="text-xs bg-app-primary/10 text-app-primary px-2 py-0.5 rounded-full font-bold">
                  {shopFavorites.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {shopFavorites.map((fav) => (
                  <div
                    key={fav.Id}
                    className="bg-app-surface rounded-xl border border-app-border p-4 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate("/customer")}
                  >
                    {fav.TenantLogo ? (
                      <img
                        src={fav.TenantLogo}
                        alt={fav.TenantName}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-app-surface-2 flex items-center justify-center text-2xl">
                        🏪
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-app-text truncate">{fav.TenantName}</h3>
                      {(fav.TenantCity || fav.TenantArea) && (
                        <p className="text-xs text-app-muted">
                          {[fav.TenantArea, fav.TenantCity].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite("SHOP", fav.TenantId);
                      }}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                      title={t("remove_from_favorites")}
                    >
                      ❤️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Favorite Barbers */}
          {barberFavorites.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-app-text mb-3 flex items-center gap-2">
                ✂️ {t("favorite_barbers")}
                <span className="text-xs bg-app-primary/10 text-app-primary px-2 py-0.5 rounded-full font-bold">
                  {barberFavorites.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {barberFavorites.map((fav) => (
                  <div
                    key={fav.Id}
                    className="bg-app-surface rounded-xl border border-app-border p-4 flex items-center gap-3"
                  >
                    {fav.BarberImage ? (
                      <img
                        src={fav.BarberImage}
                        alt={fav.BarberName}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-app-surface-2 flex items-center justify-center text-2xl">
                        ✂️
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-app-text truncate">{fav.BarberName}</h3>
                      {fav.BarberRating > 0 && (
                        <p className="text-xs text-app-muted flex items-center gap-1">
                          ⭐ {Number(fav.BarberRating).toFixed(1)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveFavorite("BARBER", fav.BarberId)}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                      title={t("remove_from_favorites")}
                    >
                      ❤️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
