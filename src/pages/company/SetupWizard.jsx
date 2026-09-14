import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { fetchSetupStatus } from "../../features/setup/setupSlice";
import { fetchBarbers } from "../../features/barbers/barbersSlice";
import { SETUP_STEPS, stepIndex, firstIncompleteStep } from "../../components/setup/setupSteps";
import SetupChecklist from "../../components/setup/SetupChecklist";
import ShopIdentityForm from "../../components/setup/ShopIdentityForm";
import ServicesEditor from "../../components/setup/ServicesEditor";
import TeamEditor from "../../components/setup/TeamEditor";
import BarberServicesEditor from "../../components/setup/BarberServicesEditor";
import BarberHoursEditor from "../../components/setup/BarberHoursEditor";
import ShopHoursEditor from "../../components/setup/ShopHoursEditor";
import TopBar from "../../components/ui/TopBar";
import Button from "../../components/ui/Button";
import Icon from "../../components/ui/Icon";
import { Card, SectionHeader, Avatar } from "../../components/ui/Primitives";
import { ErrorState, ListSkeleton } from "../../components/ui/States";
import { publicBookingUrl } from "../../utils/shopLinks";

/*
 * Getting a shop from provisioned to bookable.
 *
 * Progress is never stored. Every step's "done" is read from
 * GET /tenants/setup-status, which is computed from the shop's real data — so
 * an owner who added services from /company/services months ago opens this and
 * finds that step already green, and nothing can claim the shop is ready when
 * a customer would fail to book.
 *
 * The current step lives in ?step= rather than in state, so Android's back
 * button walks backwards through the wizard instead of leaving it, and a step
 * can be linked to from the checklist or an empty state.
 */
export default function SetupWizard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  const { status, loading, error } = useAppSelector((state) => state.setup);
  const barbers = useAppSelector((state) => state.barbers.items);

  /* Which barber the per-barber steps are configuring. Defaults to the first
     one, which is the whole team for most shops here. */
  const [barberId, setBarberId] = useState(null);
  const activeBarberId = barberId || barbers[0]?.Id || null;

  useEffect(() => {
    dispatch(fetchSetupStatus());
    /* The per-barber steps are reachable by deep link, so the team cannot be
       assumed to have been loaded by an earlier step. */
    dispatch(fetchBarbers());
  }, [dispatch]);

  const refresh = useCallback(() => dispatch(fetchSetupStatus()), [dispatch]);

  const requested = searchParams.get("step");
  const stepKey =
    requested && stepIndex(requested) >= 0 ? requested : firstIncompleteStep(status);

  const index = Math.max(0, stepIndex(stepKey));
  const step = SETUP_STEPS[index];

  const goTo = (key) => {
    setSearchParams({ step: key }, { replace: false });
    window.scrollTo({ top: 0 });
  };

  /* A blocking step is done when the server says its check passes. Optional
     steps are always passable — that is what optional means. */
  const done = !step.checkKey || Boolean(status?.checks?.find((c) => c.key === step.checkKey)?.ok);
  const canContinue = step.optional || !step.checkKey || done;

  if (loading && !status) {
    return (
      <div className="pb-8">
        <TopBar title={t("setup_title")} />
        <div className="px-4 space-y-3">
          <ListSkeleton count={4} height="h-16" />
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="pb-8">
        <TopBar title={t("setup_title")} />
        <div className="px-4">
          <ErrorState message={error} onRetry={refresh} />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <TopBar
        title={t("setup_title")}
        subtitle={t("setup_step_of", { n: index + 1, total: SETUP_STEPS.length })}
        back
        onBack={() => (index > 0 ? goTo(SETUP_STEPS[index - 1].key) : navigate("/company"))}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate("/company")}>
            {t("setup_exit")}
          </Button>
        }
      />

      {/* Progress, as a row of segments rather than a bar — an owner can see
          how many steps are left and which one they are on at a glance. */}
      <div className="flex gap-1 px-4 pt-3" aria-hidden="true">
        {SETUP_STEPS.map((entry, i) => (
          <span
            key={entry.key}
            className={`h-1 flex-1 rounded-pill ${
              i <= index ? "bg-brand-gold" : "bg-line-subtle"
            }`}
          />
        ))}
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div>
          <h2 className="text-h1 text-content-primary">{t(`setup_${stepKey}_title`)}</h2>
          <p className="mt-1 text-body text-content-secondary">{t(`setup_${stepKey}_sub`)}</p>
        </div>

        <StepBody
          stepKey={stepKey}
          status={status}
          barbers={barbers}
          activeBarberId={activeBarberId}
          onPickBarber={setBarberId}
          onProgress={refresh}
          onStep={goTo}
          t={t}
        />
      </div>

      {stepKey === "ready" ? null : (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-line-subtle bg-surface-base/95 backdrop-blur-lg px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {/* The reason a step is blocked is written out, never conveyed by the
              disabled state alone. */}
          {!canContinue ? (
            <p className="mb-2 text-caption text-content-secondary text-center">
              {t(`setup_${stepKey}_blocked`)}
            </p>
          ) : null}

          <div className="flex gap-2.5">
            {step.optional && !done ? (
              <Button
                variant="secondary"
                block
                onClick={() => goTo(SETUP_STEPS[index + 1].key)}
              >
                {t(`setup_${stepKey}_skip`)}
              </Button>
            ) : null}

            <Button
              block
              disabled={!canContinue}
              onClick={() => goTo(SETUP_STEPS[index + 1]?.key || "ready")}
              iconEnd="chevron-right"
            >
              {t("continue")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepBody({ stepKey, status, barbers, activeBarberId, onPickBarber, onProgress, onStep, t }) {
  switch (stepKey) {
    case "welcome":
      return <SetupChecklist status={status} onStep={onStep} />;

    case "identity":
      return <ShopIdentityForm section="identity" onProgress={onProgress} />;

    case "look":
      return <ShopIdentityForm section="look" onProgress={onProgress} />;

    case "services":
      return <ServicesEditor mode="setup" onProgress={onProgress} />;

    case "team":
      return <TeamEditor mode="setup" onProgress={onProgress} />;

    case "assign":
      return (
        <BarberPicker
          barbers={barbers}
          activeBarberId={activeBarberId}
          onPick={onPickBarber}
          t={t}
          emptyKey="assign_needs_team"
        >
          <BarberServicesEditor barberId={activeBarberId} onProgress={onProgress} />
        </BarberPicker>
      );

    case "rota":
      return (
        <BarberPicker
          barbers={barbers}
          activeBarberId={activeBarberId}
          onPick={onPickBarber}
          t={t}
          emptyKey="rota_needs_team"
        >
          <BarberHoursEditor barberId={activeBarberId} onProgress={onProgress} />
        </BarberPicker>
      );

    case "shop_hours":
      return (
        <>
          <Card>
            <p className="text-body-sm text-content-secondary">{t("shop_hours_optional_note")}</p>
          </Card>
          <ShopHoursEditor onProgress={onProgress} />
        </>
      );

    case "ready":
      return <ReadyStep status={status} onStep={onStep} t={t} />;

    default:
      return null;
  }
}

/* The per-barber steps need to say *whose* services or rota is being edited,
   and let the owner switch without leaving the step. */
function BarberPicker({ barbers, activeBarberId, onPick, children, t, emptyKey }) {
  if (!barbers.length) {
    return (
      <Card>
        <p className="text-body text-content-secondary">{t(emptyKey)}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {barbers.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {barbers.map((barber) => {
            const active = barber.Id === activeBarberId;
            return (
              <button
                key={barber.Id}
                type="button"
                onClick={() => onPick(barber.Id)}
                aria-pressed={active}
                className={`press flex-shrink-0 flex items-center gap-2 min-h-[44px] px-3 rounded-pill border ${
                  active
                    ? "bg-brand-gold border-brand-gold text-content-on-gold"
                    : "bg-surface-raised border-line-subtle text-content-secondary"
                }`}
              >
                <Avatar src={barber.ProfileImage} name={barber.FullName} size={26} />
                <span className="text-body-sm font-semibold">
                  {barber.DisplayName || barber.FullName}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {children}
    </div>
  );
}

function ReadyStep({ status, onStep, t }) {
  const link = status?.slug ? publicBookingUrl(status.slug) : null;

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <span
          className={`inline-flex w-14 h-14 rounded-pill items-center justify-center mb-3 ${
            status?.ready
              ? "bg-state-success-soft text-state-success"
              : "bg-state-warning-soft text-state-warning"
          }`}
        >
          <Icon name={status?.ready ? "check" : "alert"} size={26} strokeWidth={2.25} />
        </span>
        <p className="text-h2 text-content-primary">
          {status?.ready ? t("setup_ready_title") : t("setup_not_ready_title")}
        </p>
        <p className="mt-1 text-body text-content-secondary">
          {status?.ready ? t("setup_ready_sub") : t("setup_not_ready_sub")}
        </p>

        {status?.ready && link ? (
          <>
            {/* The slug is shown, not editable: every QR card and poster
                already printed points at it. */}
            <p className="mt-4 text-caption text-content-muted">{t("your_booking_link")}</p>
            <p className="text-body-sm text-content-primary break-all" dir="ltr">
              {link}
            </p>
            <Button className="mt-3" to="/company/share" icon="share">
              {t("share_booking_title")}
            </Button>
          </>
        ) : null}
      </Card>

      <section>
        <SectionHeader title={t("setup_checklist")} />
        <SetupChecklist status={status} onStep={status?.ready ? undefined : onStep} />
      </section>

      <Button variant="secondary" block to="/company">
        {t("setup_done")}
      </Button>
    </div>
  );
}
