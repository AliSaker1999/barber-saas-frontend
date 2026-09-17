import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { clearAuthError, login } from "../../features/auth/authSlice";
import {
  initiateForgotPassword,
  verifyForgotPasswordPhone,
  resetForgotPassword
} from "../../services/authService";
import { getFriendlyErrorMessage } from "../../utils/errorMessages";
import AuthShell from "../../components/auth/AuthShell";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import BottomSheet from "../../components/ui/BottomSheet";
import { InlineError } from "../../components/ui/States";

/*
 * Signing in.
 *
 * Five things here were not styling:
 *
 * The screen printed a real personal email address under a "Demo:" heading,
 * on the public login page of a production app.
 *
 * A "Remember me" checkbox was wired to nothing at all — no state, no handler.
 * A control that does nothing is worse than no control, so it is gone rather
 * than faked.
 *
 * Password reset ended in a native alert(), which inside the Capacitor webview
 * is a system dialog captioned with the app's origin.
 *
 * Signup navigates here with a "registration successful" message in router
 * state and nothing ever read it, so a new account landed on a login screen
 * with no acknowledgement that it had been created. It is read now.
 *
 * And every link out was a bare <a href>, which in a SPA is a full reload —
 * on a mid-range phone on Lebanese mobile data, several seconds to go to the
 * signup page.
 */

const FORGOT_IDENTITY = 1;
const FORGOT_PHONE = 2;
const FORGOT_CODE = 3;
const FORGOT_PASSWORD = 4;

export default function Login() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { t } = useI18n();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /* Signup hands a message through router state; show it once and clear it so
     it does not come back when the user navigates within the app. */
  const [greeted, setGreeted] = useState(false);
  if (!greeted && location.state?.message) {
    setGreeted(true);
    toast.success(location.state.message);
    window.history.replaceState({}, "");
  }

  const [forgotOpen, setForgotOpen] = useState(false);
  const [step, setStep] = useState(FORGOT_IDENTITY);
  const [identity, setIdentity] = useState("");
  const [phoneHint, setPhoneHint] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("whatsapp");
  const [fullPhone, setFullPhone] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotError, setForgotError] = useState("");

  function openForgot() {
    setStep(FORGOT_IDENTITY);
    setForgotError("");
    setIdentity("");
    setResetCode("");
    setNewPassword("");
    setForgotOpen(true);
  }

  async function startReset() {
    if (!identity.trim()) {
      setForgotError(t("reset_needs_identity"));
      return;
    }
    setForgotBusy(true);
    setForgotError("");
    try {
      const result = await initiateForgotPassword(identity.trim());
      if (result.status === "CODE_SENT") {
        setDeliveryMethod(result.method === "email" ? "email" : "whatsapp");
        setStep(FORGOT_CODE);
      } else if (result.status === "NEED_PHONE") {
        setPhoneHint(result.hint);
        setStep(FORGOT_PHONE);
      }
    } catch (err) {
      setForgotError(getFriendlyErrorMessage(err, t("reset_start_failed")));
    } finally {
      setForgotBusy(false);
    }
  }

  async function verifyPhone() {
    if (!fullPhone.trim()) {
      setForgotError(t("reset_needs_phone"));
      return;
    }
    setForgotBusy(true);
    setForgotError("");
    try {
      await verifyForgotPasswordPhone({ identity, phoneNumber: fullPhone.trim() });
      setDeliveryMethod("whatsapp");
      setStep(FORGOT_CODE);
    } catch (err) {
      setForgotError(getFriendlyErrorMessage(err, t("reset_phone_failed")));
    } finally {
      setForgotBusy(false);
    }
  }

  async function finishReset() {
    if (newPassword.length < 8) {
      setForgotError(t("password_too_short"));
      return;
    }
    setForgotBusy(true);
    setForgotError("");
    try {
      await resetForgotPassword({ identity, code: resetCode, newPassword });
      setForgotOpen(false);
      toast.success(t("reset_done"));
    } catch (err) {
      /* The code is only checked here, so a wrong one surfaces at this step.
         Send the user back to it rather than leaving them on a password field
         they have already filled in correctly. */
      setForgotError(getFriendlyErrorMessage(err, t("reset_failed")));
      setStep(FORGOT_CODE);
    } finally {
      setForgotBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    if (email && password) {
      dispatch(login({ email, password }));
    }
  }

  const forgotFooter = {
    [FORGOT_IDENTITY]: { label: t("continue"), onClick: startReset },
    [FORGOT_PHONE]: { label: t("reset_send_code"), onClick: verifyPhone },
    [FORGOT_CODE]: {
      label: t("continue"),
      onClick: () => {
        if (resetCode.trim().length < 6) {
          setForgotError(t("reset_code_incomplete"));
          return;
        }
        setForgotError("");
        setStep(FORGOT_PASSWORD);
      }
    },
    [FORGOT_PASSWORD]: { label: t("reset_action"), onClick: finishReset }
  }[step];

  return (
    <AuthShell title={t("sign_in_title")} subtitle={t("sign_in_sub")}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        {error ? (
          <InlineError
            message={getFriendlyErrorMessage(error, t("sign_in_failed"))}
            onRetry={() => dispatch(clearAuthError())}
          />
        ) : null}

        <Field
          label={t("email_address")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          inputMode="email"
          dir="ltr"
          autoComplete="email"
          placeholder="you@example.com"
        />

        <Field
          label={t("password")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type={showPassword ? "text" : "password"}
          dir="ltr"
          autoComplete="current-password"
          action={
            /* Words rather than an eye glyph: "Show"/"Hide" says which state
               the tap produces, and it translates. */
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? t("hide") : t("show")}
            </Button>
          }
        />

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={openForgot}>
            {t("forgot_password")}
          </Button>
        </div>

        <Button type="submit" block loading={isLoading} disabled={!email || !password}>
          {t("sign_in_action")}
        </Button>
      </form>

      <div className="mt-4 pt-4 border-t border-line-subtle space-y-2">
        {/* The guest path is the whole point of the product for most people:
            booking a haircut should never require an account. */}
        <Button variant="secondary" block to="/book" icon="calendar">
          {t("continue_as_guest")}
        </Button>

        <p className="text-center text-body-sm text-content-secondary">
          {t("no_account_yet")}{" "}
          <Link to="/signup" className="font-semibold text-brand-gold-text underline">
            {t("sign_up_action")}
          </Link>
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-line-subtle">
        <p className="text-center text-label uppercase text-content-muted mb-2">
          {t("are_you_a_barber")}
        </p>
        <a
          href="https://wa.me/96171368470?text=I%20am%20interested%20in%20listing%20my%20barbershop%20on%20Ajmal"
          target="_blank"
          rel="noopener noreferrer"
          className="press flex items-center justify-center gap-2 min-h-[44px] w-full rounded-control bg-surface-sunken border border-line-subtle text-body font-semibold text-content-primary"
        >
          <Icon name="whatsapp" size={18} />
          {t("partner_with_us")}
        </a>
      </div>

      <BottomSheet
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        dismissible={!forgotBusy}
        title={t("reset_password_title")}
        footer={
          <Button block onClick={forgotFooter.onClick} loading={forgotBusy}>
            {forgotFooter.label}
          </Button>
        }
      >
        <div className="space-y-3">
          {step === FORGOT_IDENTITY ? (
            <>
              <p className="text-body-sm text-content-secondary">{t("reset_identity_sub")}</p>
              <Field
                label={t("reset_identity_label")}
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
                dir="ltr"
                autoComplete="username"
              />
            </>
          ) : null}

          {step === FORGOT_PHONE ? (
            <>
              <p className="text-body-sm text-content-secondary">
                {t("reset_phone_sub", { hint: phoneHint })}
              </p>
              <Field
                label={t("phone_number")}
                value={fullPhone}
                onChange={(event) => setFullPhone(event.target.value)}
                type="tel"
                inputMode="tel"
                dir="ltr"
                inputClassName="tnum"
                placeholder="961 3 123 456"
              />
            </>
          ) : null}

          {step === FORGOT_CODE ? (
            <>
              <p className="text-body-sm text-content-secondary">
                {deliveryMethod === "email" ? t("reset_code_email") : t("reset_code_whatsapp")}
              </p>
              <Field
                label={t("reset_code_label")}
                value={resetCode}
                onChange={(event) => setResetCode(event.target.value)}
                inputMode="numeric"
                dir="ltr"
                maxLength={6}
                autoComplete="one-time-code"
                inputClassName="tnum text-center text-h2 tracking-[0.4em]"
              />
            </>
          ) : null}

          {step === FORGOT_PASSWORD ? (
            <Field
              label={t("new_password")}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              dir="ltr"
              autoComplete="new-password"
              hint={t("password_rule")}
            />
          ) : null}

          {forgotError ? <InlineError message={forgotError} /> : null}
        </div>
      </BottomSheet>
    </AuthShell>
  );
}
