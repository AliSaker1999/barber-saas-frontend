import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { useI18n } from "../i18n";
import api from "../services/api";
import { updateUserVerification } from "../features/auth/authSlice";
import BottomSheet from "./ui/BottomSheet";
import Button from "./ui/Button";
import Field from "./ui/Field";
import Icon from "./ui/Icon";
import { InlineError } from "./ui/States";

/*
 * Confirming a phone number over WhatsApp.
 *
 * Opened from the booking flow and from the customer profile — both long since
 * migrated — while this stayed on the legacy Modal with a raw blue-and-green
 * palette, an emoji for a phone icon, and every string hardcoded in English.
 * It was reachable from a migrated screen, which is how it survived the
 * per-directory sweeps.
 *
 * The number now seeds from the signed-in user during render rather than from
 * an effect, so opening the sheet a second time does not fight whatever the
 * person typed the first time.
 */
export default function PhoneVerificationModal({ isOpen, onClose, onVerified }) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const user = useAppSelector((state) => state.auth.user);

  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [seededFor, setSeededFor] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (user?.id && seededFor !== user.id) {
    setPhoneNumber(user.phoneNumber || "");
    setSeededFor(user.id);
  }

  async function sendCode() {
    if (!phoneNumber.trim()) {
      setError(t("reset_needs_phone"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/verify-phone/request", { phoneNumber: phoneNumber.trim() });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || t("code_send_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (code.trim().length < 6) {
      setError(t("reset_code_incomplete"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/verify-phone/confirm", {
        phoneNumber: phoneNumber.trim(),
        code: code.trim()
      });
      dispatch(updateUserVerification());
      onVerified?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || t("code_invalid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet
      open={Boolean(isOpen)}
      onClose={onClose}
      dismissible={!busy}
      title={t("verify_phone_title")}
      footer={
        step === 1 ? (
          <Button block onClick={sendCode} loading={busy} icon="whatsapp">
            {t("send_code_whatsapp")}
          </Button>
        ) : (
          <Button block onClick={verify} loading={busy}>
            {t("verify_action")}
          </Button>
        )
      }
    >
      <div className="space-y-3">
        <p className="text-body-sm text-content-secondary">{t("verify_phone_body")}</p>

        {step === 1 ? (
          <Field
            label={t("phone_number")}
            value={phoneNumber}
            onChange={(event) => {
              setPhoneNumber(event.target.value);
              setError("");
            }}
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            inputClassName="tnum"
            placeholder="+961 3 123 456"
            hint={t("phone_country_code_hint")}
          />
        ) : (
          <>
            <div className="rounded-card bg-surface-sunken px-3.5 py-3 flex items-center gap-2.5">
              <Icon name="whatsapp" size={18} className="text-content-muted flex-shrink-0" />
              <p className="flex-1 text-body-sm text-content-secondary">
                {t("otp_sent_to", { phone: phoneNumber })}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                {t("change_number")}
              </Button>
            </div>

            <Field
              label={t("otp_code_label")}
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setError("");
              }}
              inputMode="numeric"
              dir="ltr"
              maxLength={6}
              autoComplete="one-time-code"
              inputClassName="tnum text-center text-h2 tracking-[0.4em]"
            />
          </>
        )}

        {error ? <InlineError message={error} /> : null}
      </div>
    </BottomSheet>
  );
}
