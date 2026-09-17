import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useI18n } from "../../i18n";
import api from "../../services/api";
import { uploadImage } from "../../services/media";
import Button, { IconButton } from "../ui/Button";
import Field from "../ui/Field";
import Icon from "../ui/Icon";
import { ConfirmSheet } from "../ui/BottomSheet";
import { EmptyState, InlineError } from "../ui/States";

/*
 * A barber's portfolio.
 *
 * This is the client that never existed. `POST/PATCH/DELETE
 * /barbers/:barberId/gallery` has been complete and role-guarded since the
 * feature was built, `getTenantGallery` aggregates those rows per shop, and
 * `ShopGallery` already renders them on the in-app shop profile *and* on the
 * public /book/:slug page that every QR card, poster and Instagram link points
 * at. Nothing anywhere could add a photo: the only component that touched the
 * gallery was read-only, and it had no importers either.
 *
 * So every shop on the platform has had an empty portfolio, on the page most
 * likely to decide whether a stranger books — which for a barbershop is the
 * most persuasive thing there is to show.
 *
 * No reordering: SortOrder exists and the API takes it, but `ORDER BY
 * SortOrder, CreatedAt DESC` already puts newest first, and drag-and-drop is
 * not what a shop with four photos needs.
 *
 * The caption step is inline rather than a sheet because this editor is also
 * rendered inside the owner's per-barber sheet, and stacking two sheets at the
 * same z-index is a fight not worth having over one optional text field.
 */
export default function GalleryEditor({ barberId, barberName }) {
  const { t } = useI18n();

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(null);
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!barberId) return undefined;

    setLoading(true);
    api
      .get(`/barbers/${barberId}/gallery`)
      .then((response) => {
        if (!cancelled) {
          setImages(response.data?.data || []);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || t("gallery_load_failed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [barberId, t]);

  async function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const result = await uploadImage(file, "barber");
      /* Uploaded, but not attached until a caption has been offered, so the
         photo and the words that go with it arrive together. */
      setPending(result?.url || result);
      setCaption("");
    } catch (err) {
      setError(err.response?.data?.message || t("upload_failed"));
    } finally {
      setUploading(false);
    }
  }

  async function attach() {
    if (!pending) return;
    setSaving(true);
    setError("");
    try {
      const response = await api.post(`/barbers/${barberId}/gallery`, {
        imageUrl: pending,
        caption: caption.trim() || undefined
      });
      const created = response.data?.data;
      if (created) setImages((current) => [created, ...current]);
      setPending(null);
      setCaption("");
      toast.success(t("gallery_added"));
    } catch (err) {
      setError(err.response?.data?.message || t("gallery_add_failed"));
    } finally {
      setSaving(false);
    }
  }

  async function reallyDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/barbers/${barberId}/gallery/${confirmDelete.Id}`);
      setImages((current) => current.filter((image) => image.Id !== confirmDelete.Id));
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || t("gallery_delete_failed"));
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-bold text-content-primary">{t("gallery_title")}</p>
          <p className="text-caption text-content-muted">{t("gallery_sub")}</p>
        </div>

        <label className="press inline-flex items-center justify-center min-h-[44px] px-4 gap-2 rounded-control bg-surface-raised border border-line-strong text-body font-semibold text-content-primary cursor-pointer flex-shrink-0">
          <Icon name="camera" size={17} />
          {uploading ? t("uploading") : t("gallery_add")}
          <input type="file" accept="image/*" onChange={pick} className="sr-only" />
        </label>
      </div>

      {error ? <InlineError message={error} /> : null}

      {pending ? (
        <div className="rounded-card bg-surface-raised border border-line-subtle p-3 space-y-3">
          <img
            src={pending}
            alt=""
            className="w-full max-h-56 object-cover rounded-control border border-line-subtle"
          />
          <Field
            label={t("gallery_caption")}
            optional
            optionalLabel={t("optional")}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={500}
            hint={t("gallery_caption_hint")}
          />
          <div className="flex gap-2.5">
            <Button variant="secondary" block onClick={() => setPending(null)} disabled={saving}>
              {t("discard")}
            </Button>
            <Button block onClick={attach} loading={saving}>
              {t("gallery_publish")}
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((slot) => (
            <div key={slot} className="aspect-square rounded-control bg-surface-sunken animate-pulse" />
          ))}
        </div>
      ) : !images.length ? (
        <EmptyState
          icon="image"
          title={t("gallery_empty_title")}
          description={t("gallery_empty_sub")}
        />
      ) : (
        <ul className="grid grid-cols-3 gap-1.5">
          {images.map((image) => (
            <li key={image.Id} className="relative aspect-square">
              <img
                src={image.ImageUrl}
                alt={image.Caption || ""}
                loading="lazy"
                className="w-full h-full object-cover rounded-control border border-line-subtle"
              />
              <span className="absolute top-1 end-1">
                <IconButton
                  icon="trash"
                  label={t("gallery_remove_one", { name: image.Caption || barberName || "" })}
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmDelete(image)}
                />
              </span>
              {image.Caption ? (
                <span className="absolute inset-x-0 bottom-0 px-1.5 py-1 rounded-b-control bg-surface-base/85 text-caption text-content-secondary truncate">
                  {image.Caption}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}


      <ConfirmSheet
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={reallyDelete}
        loading={deleting}
        title={t("gallery_delete_title")}
        message={t("gallery_delete_message")}
        confirmLabel={t("delete")}
      />
    </div>
  );
}
