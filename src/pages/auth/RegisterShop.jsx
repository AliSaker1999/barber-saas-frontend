import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../i18n";
import api from "../../services/api";
import AuthShell from "../../components/auth/AuthShell";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import { InlineError } from "../../components/ui/States";

/*
 * "Register your shop" — the in-app half of what used to be a single
 * WhatsApp link asking an owner to message support directly. That link
 * still works and stays as a fallback (some owners will always prefer it),
 * but it left every prospective shop as a text message someone had to type
 * into the platform console by hand.
 *
 * This creates the tenant and the owner's own account right away, but the
 * tenant lands inactive with no plan — the same "nothing granted yet" state
 * a SUPER_ADMIN would otherwise create by hand from the platform Tenants
 * screen. A SUPER_ADMIN still reviews it, assigns a plan, and activates it;
 * logging in before that returns the same "this company is currently
 * inactive" refusal an already-deactivated shop's staff would see. This page
 * only replaces the intake form, not the approval.
 */
const emptyForm = { shopName: "", ownerName: "", email: "", phone: "", password: "" };

export default function RegisterShop() {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setError("");
  };

  function validate() {
    if (!form.shopName.trim()) return t("register_shop_needs_name");
    if (!form.ownerName.trim()) return t("signup_needs_name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return t("invalid_email");
    if (form.password.length < 6) return t("register_shop_password_too_short");
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
      await api.post("/shop-signup", {
        shopName: form.shopName.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || t("error_generic"));
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <AuthShell title={t("register_shop_title")}>
        <div className="text-center py-4">
          <h2 className="text-h3 text-content-primary">{t("register_shop_submitted_title")}</h2>
          <p className="mt-2 text-body-sm text-content-secondary">
            {t("register_shop_submitted_body")}
          </p>
          <Button to="/login" block className="mt-5">
            {t("sign_in_action")}
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("register_shop_title")} subtitle={t("register_shop_sub")}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field
          label={t("shop_name")}
          value={form.shopName}
          onChange={(event) => set({ shopName: event.target.value })}
        />
        <Field
          label={t("register_shop_owner_name")}
          value={form.ownerName}
          onChange={(event) => set({ ownerName: event.target.value })}
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
          optional
          optionalLabel={t("optional")}
          value={form.phone}
          onChange={(event) => set({ phone: event.target.value })}
          type="tel"
          inputMode="tel"
          dir="ltr"
          autoComplete="tel"
          inputClassName="tnum"
          placeholder="03 123 456"
        />
        <Field
          label={t("password")}
          value={form.password}
          onChange={(event) => set({ password: event.target.value })}
          type="password"
          dir="ltr"
          autoComplete="new-password"
          hint={t("register_shop_password_hint")}
        />

        {error ? <InlineError message={error} /> : null}

        <Button type="submit" block loading={saving}>
          {t("register_shop_submit")}
        </Button>

        <p className="text-center text-body-sm text-content-secondary">
          {t("have_account")}{" "}
          <Link to="/login" className="font-semibold text-brand-gold-text underline">
            {t("sign_in_action")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
