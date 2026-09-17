import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { fetchFavorites, toggleFavorite } from "../../features/favorites/favoritesSlice";
import { localized } from "../../utils/localized";
import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import { IconButton } from "../../components/ui/Button";
import { Avatar, Rating, SectionHeader } from "../../components/ui/Primitives";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";

/*
 * Shops and barbers a customer saved.
 *
 * Two things were wrong beyond the palette. Tapping a saved shop ran
 * `navigate("/customer")` — the home screen, not the shop — so the entire
 * point of saving one led nowhere, and saved barbers were not tappable at all.
 * And every control on the screen was an emoji: the remove button was a bare
 * heart whose only accessible name was a `title` attribute, which is the same
 * defect the Calendar emoji controls were rebuilt to fix.
 *
 * Removing is not confirmed, deliberately — it is one tap to undo, and a
 * confirmation on something this reversible trains people to dismiss them.
 */
export default function Favorites() {
  const { t, locale } = useI18n();
  const dispatch = useAppDispatch();

  const { items, isLoading, error } = useAppSelector((state) => state.favorites);

  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    dispatch(fetchFavorites());
  }, [dispatch]);

  const shops = items.filter((favorite) => favorite.Type === "SHOP");
  const barbers = items.filter((favorite) => favorite.Type === "BARBER");

  async function remove(type, targetId) {
    setRemoving(targetId);
    try {
      await dispatch(toggleFavorite({ type, targetId })).unwrap();
      await dispatch(fetchFavorites());
    } catch (err) {
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="pb-8">
      <TopBar title={t("favorites")} subtitle={t("favorites_sub")} />

      <div className="px-4 pt-3 space-y-5">
        {isLoading && !items.length ? (
          <ListSkeleton count={3} />
        ) : error && !items.length ? (
          <ErrorState message={error} onRetry={() => dispatch(fetchFavorites())} />
        ) : !items.length ? (
          <EmptyState
            icon="heart"
            title={t("no_favorites")}
            description={t("no_favorites_sub")}
            actionLabel={t("find_a_barber")}
            actionTo="/customer/explore"
          />
        ) : (
          <>
            {shops.length ? (
              <section>
                <SectionHeader title={t("favorite_shops")} />
                <ul className="space-y-2">
                  {shops.map((favorite) => (
                    <li key={favorite.Id} className="flex items-center gap-2">
                      <Link
                        to={`/customer/shop/${favorite.TenantId}`}
                        className="press flex-1 min-w-0 flex items-center gap-3 p-3 rounded-card bg-surface-raised border border-line-subtle"
                      >
                        <Avatar
                          src={favorite.TenantLogo}
                          name={localized(favorite, "TenantName", locale)}
                          size={48}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-semibold text-content-primary truncate">
                            {localized(favorite, "TenantName", locale)}
                          </p>
                          {favorite.TenantCity || favorite.TenantArea ? (
                            <p className="text-caption text-content-muted truncate">
                              {[favorite.TenantArea, favorite.TenantCity]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <Icon name="chevron-right" size={18} className="text-content-muted" />
                      </Link>

                      <IconButton
                        icon="heart"
                        label={t("remove_favorite_named", { name: favorite.TenantName })}
                        variant="secondary"
                        loading={removing === favorite.TenantId}
                        onClick={() => remove("SHOP", favorite.TenantId)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {barbers.length ? (
              <section>
                <SectionHeader title={t("favorite_barbers")} />
                <ul className="space-y-2">
                  {barbers.map((favorite) => (
                    <li key={favorite.Id} className="flex items-center gap-2">
                      <Link
                        to={`/customer/shop/${favorite.TenantId}`}
                        className="press flex-1 min-w-0 flex items-center gap-3 p-3 rounded-card bg-surface-raised border border-line-subtle"
                      >
                        <Avatar
                          src={favorite.BarberImage}
                          name={favorite.BarberName}
                          size={48}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-body font-semibold text-content-primary truncate">
                            {favorite.BarberName}
                          </p>
                          {favorite.TenantName ? (
                            <p className="text-caption text-content-muted truncate">
                              {localized(favorite, "TenantName", locale)}
                            </p>
                          ) : null}
                          {Number(favorite.BarberRating) > 0 ? (
                            <Rating compact value={favorite.BarberRating} />
                          ) : null}
                        </div>
                        <Icon name="chevron-right" size={18} className="text-content-muted" />
                      </Link>

                      <IconButton
                        icon="heart"
                        label={t("remove_favorite_named", { name: favorite.BarberName })}
                        variant="secondary"
                        loading={removing === favorite.BarberId}
                        onClick={() => remove("BARBER", favorite.BarberId)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
