import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { registerCustomer } from "../../features/auth/authSlice";
import AuthShell from "../../components/auth/AuthShell";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Icon from "../../components/ui/Icon";
import Select from "../../components/ui/Select";
import { InlineError } from "../../components/ui/States";

/*
 * Creating an account.
 *
 * The old version ended like this:
 *
 *   setTimeout(() => navigate("/login", { state: { message: ... } }), 1500);
 *   ... finally { setLoading(false); }
 *
 * The `finally` ran immediately, so for a second and a half the form sat there
 * fully interactive, showing nothing at all — no spinner, no confirmation —
 * while a second tap on Create Account would fire a second registration. Then
 * it navigated with a success message in router state that the login screen
 * never read, so the account was created and nobody was ever told.
 *
 * Now the success is a toast that login actually shows, and the navigation is
 * immediate.
 *
 * Gender and birthdate stay required: gender drives the specialty filter a
 * customer uses to find a barber, and both are asked once here rather than
 * interrupting a booking later.
 *
 * The form is noValidate and the fields carry no native `required`. The
 * browser's own validation fires before any of this runs, is untranslated, and
 * says "Please fill out this field" where validate() can say which field and
 * why — and for a malformed address it blocks submission outright, so the
 * custom message could never have appeared at all.
 */

const GENDER_OPTIONS = [
  { value: "Male", labelKey: "gender_man", icon: "gender-male" },
  { value: "Female", labelKey: "gender_woman", icon: "gender-female" },
  { value: "Unspecified", labelKey: "prefer_not_to_say", icon: "gender-other" }
];

const emptyForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  gender: "",
  birthdate: "",
  password: "",
  confirmPassword: ""
};

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}

export default function Signup() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [readTerms, setReadTerms] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);

  const set = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setError("");
  };

  const strength = passwordStrength(form.password);
  const canConsent = readTerms && readPrivacy;

  function validate() {
    if (!form.fullName.trim()) return t("signup_needs_name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return t("invalid_email");
    if (!form.phoneNumber.trim()) return t("signup_needs_phone");
    if (form.password.length < 8) return t("password_too_short");
    if (form.password !== form.confirmPassword) return t("signup_passwords_differ");
    if (!form.gender) return t("signup_needs_gender");
    if (!form.birthdate) return t("signup_needs_birthdate");
    if (!agreed) return t("signup_needs_consent");
    return "";
  }

  async function submit(event) {
    event.preventDefault();

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await dispatch(
        registerCustomer({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phoneNumber: form.phoneNumber.trim(),
          gender: form.gender,
          birthdate: form.birthdate,
          password: form.password
        })
      ).unwrap();

      /* Straight there, with the message login now knows how to show. The
         form stays disabled until the route changes, so there is no window in
         which a second tap registers a second account. */
      navigate("/login", { state: { message: t("signup_success") } });
    } catch (err) {
      setError(typeof err === "string" ? err : t("signup_failed"));
      setSaving(false);
    }
  }

  const strengthLabel = ["", t("password_weak"), t("password_fair"), t("password_good"), t("password_strong")][
    strength
  ];

  return (
    <AuthShell
      title={t("sign_up_title")}
      subtitle={t("sign_up_sub")}
      onReadPolicy={(which) => (which === "terms" ? setReadTerms(true) : setReadPrivacy(true))}
    >
      {({ openTerms, openPrivacy }) => (
        <form onSubmit={submit} className="space-y-3" noValidate>
          <Field
            label={t("full_name")}
            value={form.fullName}
            onChange={(event) => set({ fullName: event.target.value })}
            autoComplete="name"
          />

          <Field
            label={t("email_address")}
            value={form.email}
            onChange={(event) => set({ email: event.target.value })}
            type="email"
            inputMode="email"
            dir="ltr"
            autoComplete="email"
            placeholder="you@example.com"
          />

          <Field
            label={t("phone_number")}
            value={form.phoneNumber}
            onChange={(event) => set({ phoneNumber: event.target.value })}
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            inputClassName="tnum"
            placeholder="03 123 456"
          />

          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-label uppercase text-content-muted mb-1.5">{t("your_gender")}</p>
              <Select
                value={form.gender}
                onChange={(event) => set({ gender: event.target.value })}
                options={GENDER_OPTIONS.map((option) => ({
                  value: option.value,
                  label: t(option.labelKey),
                  icon: option.icon
                }))}
                placeholder={t("select_placeholder")}
                aria-label={t("your_gender")}
              />
              <p className="text-caption text-content-muted mt-1.5">{t("your_gender_hint")}</p>
            </div>
            <Field
              className="flex-1"
              label={t("birth_date")}
              value={form.birthdate}
              onChange={(event) => set({ birthdate: event.target.value })}
              type="date"
              dir="ltr"
              autoComplete="bday"
            />
          </div>

          <Field
            label={t("password")}
            value={form.password}
            onChange={(event) => set({ password: event.target.value })}
            type={showPassword ? "text" : "password"}
            dir="ltr"
            autoComplete="new-password"
            hint={t("password_rule")}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? t("hide") : t("show")}
              </Button>
            }
          />

          {form.password ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-caption text-content-muted">{t("password_strength")}</span>
                <span className="text-caption font-semibold text-content-primary">
                  {strengthLabel}
                </span>
              </div>
              <div className="h-1.5 rounded-pill bg-surface-sunken overflow-hidden">
                <div
                  className="h-full rounded-pill bg-brand-gold transition-[width]"
                  style={{ width: `${(strength / 4) * 100}%` }}
                />
              </div>
            </div>
          ) : null}

          <Field
            label={t("confirm_password")}
            value={form.confirmPassword}
            onChange={(event) => set({ confirmPassword: event.target.value })}
            type={showPassword ? "text" : "password"}
            dir="ltr"
            autoComplete="new-password"
          />

          {/* Consent stays gated on having opened both documents — agreeing to
              something you were never shown is not agreement. */}
          <div className="rounded-card bg-surface-sunken px-3.5 py-3">
            <label className="flex items-start gap-3 min-h-[44px]">
              <input
                type="checkbox"
                checked={agreed}
                disabled={!canConsent}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-1 h-5 w-5 flex-shrink-0 rounded accent-brand-gold disabled:opacity-50"
              />
              <span className="text-body-sm text-content-secondary">
                {t("consent_lead")}{" "}
                <button
                  type="button"
                  onClick={openTerms}
                  className="font-semibold text-brand-gold-text underline"
                >
                  {t("terms_of_service")}
                </button>{" "}
                {t("consent_and")}{" "}
                <button
                  type="button"
                  onClick={openPrivacy}
                  className="font-semibold text-brand-gold-text underline"
                >
                  {t("privacy_policy")}
                </button>
                {!canConsent ? (
                  <span className="block mt-1 text-caption text-content-muted">
                    {t("consent_read_first")}
                  </span>
                ) : null}
              </span>
            </label>
          </div>

          {error ? <InlineError message={error} /> : null}

          <Button type="submit" block loading={saving}>
            {t("create_account")}
          </Button>

          <p className="text-center text-body-sm text-content-secondary">
            {t("have_account")}{" "}
            <Link to="/login" className="font-semibold text-brand-gold-text underline">
              {t("sign_in_action")}
            </Link>
          </p>

          <div className="pt-3 border-t border-line-subtle space-y-2">
            <Link
              to="/register-shop"
              className="press flex items-center justify-center gap-2 min-h-[44px] w-full rounded-control bg-surface-sunken border border-line-subtle text-body font-semibold text-content-primary"
            >
              <Icon name="scissors" size={18} />
              {t("partner_with_us")}
            </Link>
            <a
              href="https://wa.me/96171368470?text=I%20am%20interested%20in%20listing%20my%20barbershop%20on%20Ajmal"
              target="_blank"
              rel="noopener noreferrer"
              className="press flex items-center justify-center gap-2 min-h-[44px] w-full text-body-sm font-semibold text-content-secondary"
            >
              <Icon name="whatsapp" size={16} />
              {t("partner_with_us_whatsapp")}
            </a>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
