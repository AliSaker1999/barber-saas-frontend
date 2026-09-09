import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchCustomerAppointments } from "../../features/appointments/appointmentsSlice";
import { fetchTenants } from "../../features/tenants/tenantsSlice";
import api from "../../services/api";

import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import { Photo, SectionHeader } from "../../components/ui/Primitives";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";
import { useI18n } from "../../i18n";

/*
 * Loyalty.
 *
 * Points live per shop in this product — `CustomerTenants.LoyaltyPoints` — and
 * that is the honest model to show: a customer's balance at Hamra Barber has
 * nothing to do with their balance in Jounieh. The page therefore lists one
 * card per shop the customer has actually visited, and says so at the top so
 * nobody expects a single platform-wide total.
 *
 * The shops are drawn from the customer's own appointment history, which keeps
 * this to a handful of requests rather than one per shop on the platform.
 */
export default function Loyalty() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();

  const appointments = useAppSelector((state) => state.appointments.items);
  const shops = useAppSelector((state) => state.tenants.tenants);

  /* Keyed on the shop list it was fetched for, so "loading" is derived rather
     than set from inside an effect. */
  const [result, setResult] = useState({ key: null, balances: {}, error: null });

  useEffect(() => {
    dispatch(fetchCustomerAppointments());
    if (!shops.length) dispatch(fetchTenants());
  }, [dispatch, shops.length]);

  /* Shops the customer has a history with, newest visit first. */
  const visitedShopIds = useMemo(() => {
    const seen = new Map();
    appointments.forEach((appointment) => {
      if (!appointment.TenantId) return;
      const previous = seen.get(appointment.TenantId);
      const when = appointment.StartTime;
      if (!previous || when > previous) seen.set(appointment.TenantId, when);
    });
    return Array.from(seen.entries())
      .sort((a, b) => String(b[1]).localeCompare(String(a[1])))
      .map(([id]) => id);
  }, [appointments]);

  const shopsKey = useMemo(() => visitedShopIds.join(","), [visitedShopIds]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    /* One request per shop the customer has actually visited — a handful, not
       one per shop on the platform — and a single failure only loses that
       shop's balance rather than the whole page. */
    Promise.allSettled(
      visitedShopIds.map((tenantId) =>
        api.get(`/loyalty/me/${tenantId}`).then((res) => ({ tenantId, data: res.data?.data }))
      )
    ).then((settled) => {
      if (cancelled) return;

      const balances = {};
      let anySucceeded = visitedShopIds.length === 0;

      settled.forEach((entry) => {
        if (entry.status !== "fulfilled") return;
        anySucceeded = true;
        balances[entry.value.tenantId] = entry.value.data;
      });

      setResult({ key: shopsKey, balances, error: anySucceeded ? null : "load-failed" });
    });

    return () => {
      cancelled = true;
    };
  }, [visitedShopIds, shopsKey, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const loading = result.key !== shopsKey;
  const error = result.error;
  const balances = useMemo(
    () => (result.key === shopsKey ? result.balances : {}),
    [result, shopsKey]
  );

  const cards = useMemo(() => {
    return visitedShopIds
      .map((tenantId) => {
        const shop = shops.find((s) => s.Id === tenantId);
        const balance = balances[tenantId];
        return {
          tenantId,
          shop,
          points: balance?.points ?? balance?.LoyaltyPoints ?? 0,
          enabled: shop ? shop.LoyaltyEnabled : Boolean(balance),
          rewards: balance?.rewards || []
        };
      })
      /* A shop with no programme and no points is just noise here. */
      .filter((card) => card.enabled || card.points > 0);
  }, [visitedShopIds, shops, balances]);

  return (
    <div className="pb-6">
      <TopBar back title={t("loyalty_title")} />

      <div className="px-4">
        <p className="text-body-sm text-content-secondary">{t("loyalty_intro")}</p>
      </div>

      <div className="px-4 mt-5">
        {loading ? (
          <ListSkeleton count={2} height="h-[112px]" />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : !cards.length ? (
          <EmptyState
            icon="gift"
            title={t("loyalty_no_shops_title")}
            description={t("loyalty_no_shops_body")}
            actionLabel={t("find_a_barber")}
            actionTo="/customer/explore"
          />
        ) : (
          <div className="space-y-3">
            {cards.map((card) => {
              const nextReward = card.rewards
                .filter((reward) => (reward.pointsRequired ?? 0) > card.points)
                .sort((a, b) => a.pointsRequired - b.pointsRequired)[0];

              const target = nextReward?.pointsRequired || null;
              const pct = target ? Math.min(100, Math.round((card.points / target) * 100)) : 100;

              return (
                <div
                  key={card.tenantId}
                  className="bg-surface-raised border border-line-subtle rounded-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <Photo
                      src={card.shop?.LogoUrl || card.shop?.CoverImageUrl}
                      alt=""
                      ratio="1/1"
                      rounded="rounded-control"
                      className="w-11 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-bold text-content-primary truncate">
                        {card.shop?.Name || t("shop")}
                      </p>
                      <p className="text-caption text-content-muted truncate">
                        {card.shop?.Area || card.shop?.City || ""}
                      </p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <p className="text-h1 text-brand-gold-text tnum leading-none">{card.points}</p>
                      <p className="text-caption text-content-muted">{t("points")}</p>
                    </div>
                  </div>

                  {!card.enabled ? (
                    <p className="mt-3 text-caption text-content-muted">{t("loyalty_not_enabled")}</p>
                  ) : target ? (
                    <div className="mt-3.5">
                      <div className="h-1.5 rounded-pill bg-surface-sunken overflow-hidden">
                        <span
                          className="block h-full rounded-pill bg-brand-gold"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-caption text-content-secondary tnum">
                        {t("points_to_next", { n: target - card.points })}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-caption text-content-secondary">
                      {t("loyalty_redeem_hint")}
                    </p>
                  )}

                  {card.rewards.length ? (
                    <ul className="mt-3.5 pt-3.5 border-t border-line-subtle space-y-2">
                      {card.rewards.slice(0, 4).map((reward) => {
                        const unlocked = card.points >= (reward.pointsRequired ?? 0);
                        return (
                          <li
                            key={reward.id || reward.rewardId || reward.serviceId}
                            className="flex items-center gap-2.5"
                          >
                            <Icon
                              name={unlocked ? "check" : "lock"}
                              size={15}
                              className={unlocked ? "text-state-success" : "text-content-muted"}
                            />
                            <span className="flex-1 text-body-sm text-content-primary truncate">
                              {reward.serviceName || reward.name || t("available_rewards")}
                            </span>
                            <span className="text-caption text-content-muted tnum flex-shrink-0">
                              {reward.pointsRequired} {t("points")}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  <div className="mt-3.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      block
                      to={`/customer/shop/${card.tenantId}`}
                    >
                      {t("view_details")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {cards.length ? (
        <div className="px-4 mt-6">
          <SectionHeader title={t("available_rewards")} />
          <p className="text-caption text-content-muted">{t("loyalty_redeem_hint")}</p>
        </div>
      ) : null}
    </div>
  );
}
