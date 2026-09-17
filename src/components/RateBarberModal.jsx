import { useState } from "react";
import { useAppDispatch } from "../app/hooks";
import { useI18n } from "../i18n";
import { rateBarber } from "../features/barbers/barbersSlice";
import Button from "./ui/Button";
import Field from "./ui/Field";
import Icon from "./ui/Icon";
import BottomSheet from "./ui/BottomSheet";
import { InlineError } from "./ui/States";

/*
 * Rating the barber who cut your hair.
 *
 * The whole body of this used to be `catch (err) { console.error(err); }` — a
 * customer whose review was rejected watched the sheet sit there and then
 * close, with no idea whether it had counted. That mattered more after the
 * ratings endpoint was tightened: it now refuses a review of a visit that is
 * not yours, not finished, or not with that barber, and each of those comes
 * back as a sentence worth showing.
 *
 * Re-rating the same visit is allowed and replaces the previous score, which
 * is why nothing here treats a second submission as an error.
 *
 * The prop contract is unchanged — Bookings, QueueTracker and CustomerReports
 * all mount it the same way they did.
 */

const SCORES = [1, 2, 3, 4, 5];

export default function RateBarberModal({
  barberId,
  appointmentId,
  queueId,
  isOpen,
  onClose,
  onSuccess
}) {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setSubmitting(true);
    try {
      await dispatch(
        rateBarber({ barberId, appointmentId, queueId, rating, comment: comment.trim() })
      ).unwrap();
      setComment("");
      setRating(5);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setError("");
    onClose();
  }

  return (
    <BottomSheet
      open={Boolean(isOpen)}
      onClose={close}
      dismissible={!submitting}
      title={t("rate_visit_title")}
      footer={
        <Button block onClick={submit} loading={submitting}>
          {t("submit_review")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-body text-content-secondary mb-2">{t("rate_how_was_it")}</p>

          <div className="flex items-center justify-center gap-1.5">
            {SCORES.map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setRating(score)}
                aria-pressed={score === rating}
                aria-label={t("rate_n_stars", { n: score })}
                className="press min-w-[44px] min-h-[44px] flex items-center justify-center rounded-control"
              >
                <Icon
                  name="star"
                  size={30}
                  filled={score <= rating}
                  className={score <= rating ? "text-brand-gold" : "text-line-strong"}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-body-sm font-semibold text-content-primary mt-1">
            {t(`rate_score_${rating}`)}
          </p>
        </div>

        <Field
          as="textarea"
          rows={3}
          label={t("rate_comment")}
          optional
          optionalLabel={t("optional")}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder={t("rate_comment_placeholder")}
        />

        {error ? <InlineError message={error} /> : null}
      </div>
    </BottomSheet>
  );
}
