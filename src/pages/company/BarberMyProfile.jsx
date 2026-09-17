import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchBarberProfile,
  updateBarberProfile,
  toggleAvailability
} from "../../features/barbers/barbersSlice";
import { uploadImage } from "../../services/media";
import TopBar from "../../components/ui/TopBar";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import ImagePicker from "../../components/ui/ImagePicker";
import { Rating, Toggle } from "../../components/ui/Primitives";
import { ErrorState, InlineError, ListSkeleton } from "../../components/ui/States";
import GalleryEditor from "../../components/setup/GalleryEditor";
import MyScheduleRequests from "../../components/setup/MyScheduleRequests";

/*
 * A barber's own profile.
 *
 * Three things this screen used to get wrong, none of them cosmetic:
 *
 * A "No-Shows" stat tile in red. Barbers.NoShowCount exists as a column and
 * nothing in the codebase has ever written to it — the increment on a no-show
 * hits Users.NoShowCount, the customer's. Every barber in the app has been
 * looking at a permanent, structural zero. The tile is gone rather than
 * relabelled; a number nobody computes is not a statistic.
 *
 * An emoji as the empty avatar, in an app whose spec bans emoji from shipping
 * UI, sitting in the one place a barber looks at their own face.
 *
 * And the three availability switches — walk-ins, online booking, auto-accept
 * — fired straight at the server with nothing rendering a failure. Flipping
 * "accepting appointments" off and having it silently not take is the kind of
 * miss a barber discovers from the customer standing in front of them.
 */

const GENDER_OPTIONS = [
  { value: "Male", labelKey: "specialty_male", icon: "gender-male" },
  { value: "Female", labelKey: "specialty_female", icon: "gender-female" },
  { value: "Unisex", labelKey: "specialty_unisex", icon: "gender-unisex" },
  { value: "Other", labelKey: "specialty_other", icon: "gender-other" }
];

export default function BarberMyProfile() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const { selectedProfile, loading } = useAppSelector((state) => state.barbers);

  const [draft, setDraft] = useState(null);
  const [hydratedFor, setHydratedFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(null);
  const [togglePending, setTogglePending] = useState(null);

  useEffect(() => {
    dispatch(fetchBarberProfile("me"));
  }, [dispatch]);

  if (selectedProfile && hydratedFor !== selectedProfile.Id) {
    setDraft({
      displayName: selectedProfile.DisplayName || selectedProfile.FullName || "",
      gender: selectedProfile.Gender || "",
      bio: selectedProfile.Bio || "",
      yearsOfExperience: selectedProfile.YearsOfExperience ?? "",
      profileImage: selectedProfile.ProfileImage || "",
      coverImage: selectedProfile.CoverImage || ""
    });
    setHydratedFor(selectedProfile.Id);
  }

  if (loading && !selectedProfile) {
    return (
      <div className="pb-8">
        <TopBar title={t("my_barber_profile")} subtitle={t("my_barber_profile_sub")} />
        <div className="px-4 pt-3">
          <ListSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (!selectedProfile || !draft) {
    return (
      <div className="pb-8">
        <TopBar title={t("my_barber_profile")} subtitle={t("my_barber_profile_sub")} />
        <div className="px-4 pt-3">
          <ErrorState
            message={t("error_generic")}
            onRetry={() => dispatch(fetchBarberProfile("me"))}
          />
        </div>
      </div>
    );
  }

  const set = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  async function pick(event, field) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(field);
    setError("");
    try {
      const result = await uploadImage(file, "barber");
      const url = result?.url || result;
      set({ [field]: url });
      /* Saved on pick: a barber who chooses a photo and then leaves should not
         quietly lose it. */
      await dispatch(updateBarberProfile({ barberId: "me", data: { [field]: url } })).unwrap();
    } catch (err) {
      setError(typeof err === "string" ? err : t("upload_failed"));
    } finally {
      setUploading(null);
      event.target.value = "";
    }
  }

  async function flip(field, next) {
    setTogglePending(field);
    try {
      await dispatch(
        toggleAvailability({ barberId: selectedProfile.Id, [field]: next })
      ).unwrap();
    } catch (err) {
      /* Previously this went nowhere at all, so the switch simply stayed where
         it was and the barber had no way to know why. */
      toast.error(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setTogglePending(null);
    }
  }

  async function save() {
    setError("");

    if (!draft.displayName.trim()) {
      setError(t("display_name_required"));
      return;
    }

    const years = String(draft.yearsOfExperience).trim();
    if (years && !(Number(years) >= 0)) {
      setError(t("years_invalid"));
      return;
    }

    setSaving(true);
    try {
      await dispatch(
        updateBarberProfile({
          barberId: "me",
          data: {
            displayName: draft.displayName.trim(),
            gender: draft.gender,
            bio: draft.bio.trim(),
            yearsOfExperience: years === "" ? null : parseInt(years, 10),
            profileImage: draft.profileImage,
            coverImage: draft.coverImage
          }
        })
      ).unwrap();
      setSaved(true);
    } catch (err) {
      setError(typeof err === "string" ? err : t("profile_save_failed"));
    } finally {
      setSaving(false);
    }
  }

  const genderOptions = GENDER_OPTIONS.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
    icon: option.icon
  }));

  return (
    <div className="pb-8">
      <TopBar title={t("my_barber_profile")} subtitle={t("my_barber_profile_sub")} />

      <div className="px-4 pt-3 space-y-4">
        {/* ---- how you look to a customer ---- */}
        <section className="space-y-3 rounded-card bg-surface-raised border border-line-subtle p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-body font-bold text-content-primary truncate">
              {draft.displayName || selectedProfile.FullName}
            </p>
            <Rating
              compact
              value={selectedProfile.AverageRating}
              count={selectedProfile.ReviewsCount || 0}
            />
          </div>

          <ImagePicker
            label={t("profile_photo")}
            hint={t("profile_photo_hint")}
            value={draft.profileImage}
            busy={uploading === "profileImage"}
            onPick={(event) => pick(event, "profileImage")}
            onClear={() => set({ profileImage: "" })}
            aspect="w-20 h-20 rounded-pill"
          />
          <ImagePicker
            label={t("cover_photo")}
            hint={t("cover_photo_hint")}
            value={draft.coverImage}
            busy={uploading === "coverImage"}
            onPick={(event) => pick(event, "coverImage")}
            onClear={() => set({ coverImage: "" })}
            aspect="w-full h-28 rounded-card"
          />
        </section>

        {/* ---- taking work right now ---- */}
        <section className="space-y-2">
          <p className="text-label uppercase text-content-muted">{t("availability")}</p>

          <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5">
            <Toggle
              label={t("barber_takes_walkins")}
              hint={t("takes_walkins_hint")}
              checked={Boolean(selectedProfile.IsAvailable)}
              disabled={togglePending === "isAvailable"}
              onChange={(next) => flip("isAvailable", next)}
            />
          </div>

          <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5">
            <Toggle
              label={t("barber_takes_appointments")}
              hint={t("takes_appointments_hint")}
              checked={Boolean(selectedProfile.IsAcceptingAppointments)}
              disabled={togglePending === "isAcceptingAppointments"}
              onChange={(next) => flip("isAcceptingAppointments", next)}
            />
          </div>

          <div className="rounded-card bg-surface-raised border border-line-subtle px-3.5 py-2.5">
            <Toggle
              label={t("barber_auto_accept")}
              hint={t("barber_auto_accept_hint")}
              checked={Boolean(selectedProfile.AutoAcceptAppointments)}
              disabled={
                togglePending === "autoAcceptAppointments" ||
                !selectedProfile.IsAcceptingAppointments
              }
              onChange={(next) => flip("autoAcceptAppointments", next)}
            />
          </div>
        </section>

        {/* ---- what customers read ---- */}
        <section className="space-y-3">
          <p className="text-label uppercase text-content-muted">{t("about_you")}</p>

          <Field
            label={t("display_name")}
            value={draft.displayName}
            onChange={(event) => set({ displayName: event.target.value })}
            hint={t("display_name_hint")}
          />

          <div>
            <p className="text-label uppercase text-content-muted mb-1.5">{t("specialty")}</p>
            <Select
              value={draft.gender}
              onChange={(event) => set({ gender: event.target.value })}
              options={genderOptions}
              placeholder={t("select_placeholder")}
              aria-label={t("specialty")}
            />
            <p className="text-caption text-content-muted mt-1.5">{t("specialty_hint")}</p>
          </div>

          <Field
            label={t("years_experience")}
            optional
            optionalLabel={t("optional")}
            value={draft.yearsOfExperience}
            onChange={(event) => set({ yearsOfExperience: event.target.value })}
            type="number"
            inputMode="numeric"
            min="0"
            dir="ltr"
            inputClassName="tnum"
          />

          <Field
            as="textarea"
            rows={4}
            label={t("bio")}
            optional
            optionalLabel={t("optional")}
            value={draft.bio}
            onChange={(event) => set({ bio: event.target.value })}
            placeholder={t("bio_placeholder")}
          />

          {error ? <InlineError message={error} /> : null}

          <Button block onClick={save} loading={saving}>
            {saved ? t("saved") : t("save")}
          </Button>
        </section>

        <section>
          <GalleryEditor
            barberId={selectedProfile.Id}
            barberName={draft.displayName || selectedProfile.FullName}
          />
        </section>

        <MyScheduleRequests barberId={selectedProfile.Id} />
      </div>
    </div>
  );
}
