import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import {
  fetchAdminPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion
} from "../../features/promotions/promotionsSlice";
import { fetchServices } from "../../features/services/servicesSlice";
import { formatMoney } from "../../utils/format";
import { formatDateOnly } from "../../utils/time";
import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button, { IconButton } from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import { SectionHeader, Pill, Toggle } from "../../components/ui/Primitives";
import BottomSheet, { ConfirmSheet } from "../../components/ui/BottomSheet";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";

/*
 * Offers.
 *
 * The rebuild's real point is not the styling: the admin form never sent a
 * serviceId, so every promotion an owner created was shop-wide even though
 * core/promotions/promotion-pricing.ts has always scoped discounts per service.
 * Per-service offers were built, load-bearing, and unreachable from the
 * product. Same for the Arabic title and description — in the schema, in the
 * service, and absent from the only screen that could write them.
 */

const ALL_SERVICES = "__all__";

const emptyForm = {
  title: "",
  titleAr: "",
  description: "",
  descriptionAr: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  serviceId: ALL_SERVICES,
  startDate: "",
  endDate: "",
  isActive: true
};

export default function Promotions() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const { adminItems, isLoading, error } = useAppSelector((state) => state.promotions);
  const services = useAppSelector((state) => state.services.items);
  const currency = useAppSelector((state) => state.company.profile?.Currency) || "USD";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminPromotions());
    /* For the service picker — an offer can be scoped to one service. */
    dispatch(fetchServices());
  }, [dispatch]);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const discountOptions = [
    { value: "PERCENTAGE", label: t("promo_discount_percent"), icon: "tag" },
    { value: "FIXED", label: t("promo_discount_fixed"), icon: "wallet" }
  ];

  const serviceOptions = [
    { value: ALL_SERVICES, label: t("promo_all_services"), icon: "scissors" },
    ...services.map((service) => ({ value: service.Id, label: service.Name }))
  ];

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setFormError("");
    setSheetOpen(true);
  }

  function openEdit(promo) {
    const isFixed = promo.DiscountAmount !== null && promo.DiscountAmount !== undefined;
    setForm({
      title: promo.Title || "",
      titleAr: promo.TitleAr || "",
      description: promo.Description || "",
      descriptionAr: promo.DescriptionAr || "",
      discountType: isFixed ? "FIXED" : "PERCENTAGE",
      discountValue: String(isFixed ? promo.DiscountAmount : promo.DiscountPercent ?? ""),
      serviceId: promo.ServiceId || ALL_SERVICES,
      startDate: promo.StartDate ? promo.StartDate.slice(0, 10) : "",
      endDate: promo.EndDate ? promo.EndDate.slice(0, 10) : "",
      isActive: Boolean(promo.IsActive)
    });
    setEditId(promo.Id);
    setFormError("");
    setSheetOpen(true);
  }

  async function save(event) {
    event?.preventDefault();
    setFormError("");

    if (!form.title.trim() || !form.discountValue || !form.startDate || !form.endDate) {
      setFormError(t("fill_all_fields"));
      return;
    }
    if (form.endDate < form.startDate) {
      setFormError(t("promo_dates_backwards"));
      return;
    }

    const value = Number(form.discountValue);
    const payload = {
      title: form.title.trim(),
      titleAr: form.titleAr.trim() || undefined,
      description: form.description.trim() || undefined,
      descriptionAr: form.descriptionAr.trim() || undefined,
      discountPercent: form.discountType === "PERCENTAGE" ? value : null,
      discountAmount: form.discountType === "FIXED" ? value : null,
      /* null means "every service" — what the pricing engine already expects. */
      serviceId: form.serviceId === ALL_SERVICES ? null : form.serviceId,
      startDate: form.startDate,
      endDate: form.endDate
    };

    setSaving(true);
    try {
      if (editId) {
        await dispatch(updatePromotion({ id: editId, ...payload, isActive: form.isActive })).unwrap();
      } else {
        await dispatch(createPromotion(payload)).unwrap();
      }
      setSheetOpen(false);
      await dispatch(fetchAdminPromotions());
    } catch (err) {
      setFormError(typeof err === "string" ? err : t("error_generic"));
    } finally {
      setSaving(false);
    }
  }

  async function reallyDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await dispatch(deletePromotion(confirmDelete.Id)).unwrap();
      setConfirmDelete(null);
    } catch (err) {
      /* The server refuses to delete an offer that has already been redeemed,
         and says how many times — that sentence is the useful part. */
      toast.error(typeof err === "string" ? err : t("error_generic"));
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const discountLabel = (promo) =>
    promo.DiscountAmount != null
      ? t("promo_amount_off", { amount: formatMoney(promo.DiscountAmount, currency) })
      : t("promo_percent_off", { n: promo.DiscountPercent });

  return (
    <div className="pb-8">
      <TopBar
        back
        title={t("promotions")}
        subtitle={t("promotions_subtitle")}
        actions={<IconButton icon="plus" label={t("promo_new")} onClick={openCreate} />}
      />

      <div className="px-4 pt-3">
        {isLoading && !adminItems.length ? (
          <ListSkeleton count={3} />
        ) : error && !adminItems.length ? (
          <ErrorState message={error} onRetry={() => dispatch(fetchAdminPromotions())} />
        ) : !adminItems.length ? (
          <EmptyState
            icon="tag"
            title={t("promo_empty_title")}
            description={t("promo_empty_sub")}
            actionLabel={t("promo_new")}
            onAction={openCreate}
          />
        ) : (
          <ul className="space-y-2">
            {adminItems.map((promo) => (
              <li
                key={promo.Id}
                className={`p-3.5 rounded-card bg-surface-raised border border-line-subtle ${
                  promo.IsActive ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-body font-bold text-content-primary truncate">
                    {promo.Title}
                  </p>
                  <Pill tone={promo.IsActive ? "success" : "neutral"}>
                    {promo.IsActive ? t("active") : t("inactive")}
                  </Pill>
                </div>

                {promo.Description ? (
                  <p className="mt-0.5 text-body-sm text-content-secondary">{promo.Description}</p>
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Pill tone="gold" icon="tag">
                    {discountLabel(promo)}
                  </Pill>
                  {/* The distinction that was invisible before: a shop-wide
                      offer and one scoped to a single service. */}
                  <Pill tone="neutral" icon="scissors">
                    {promo.ServiceId
                      ? promo.ServiceName || t("promo_one_service")
                      : t("promo_all_services")}
                  </Pill>
                  {promo.TitleAr ? <Pill tone="neutral">{t("promo_has_arabic")}</Pill> : null}
                </div>

                <p className="mt-1.5 text-caption text-content-muted tnum">
                  {formatDateOnly(promo.StartDate)} – {formatDateOnly(promo.EndDate)}
                </p>

                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(promo)}>
                    {t("edit")}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon="trash"
                    onClick={() => setConfirmDelete(promo)}
                  >
                    {t("delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editId ? t("promo_edit") : t("promo_new")}
        footer={
          <div className="flex gap-2.5">
            <Button variant="secondary" block onClick={() => setSheetOpen(false)} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button block onClick={save} loading={saving}>
              {t("save")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Field
            label={t("promo_title")}
            value={form.title}
            onChange={(event) => set({ title: event.target.value })}
            placeholder={t("promo_title_placeholder")}
          />
          <Field
            label={t("promo_title_ar")}
            optional
            optionalLabel={t("optional")}
            value={form.titleAr}
            onChange={(event) => set({ titleAr: event.target.value })}
            dir="rtl"
            hint={t("promo_arabic_hint")}
          />

          <Field
            label={t("promo_description")}
            optional
            optionalLabel={t("optional")}
            value={form.description}
            onChange={(event) => set({ description: event.target.value })}
            as="textarea"
            rows={2}
          />
          <Field
            label={t("promo_description_ar")}
            optional
            optionalLabel={t("optional")}
            value={form.descriptionAr}
            onChange={(event) => set({ descriptionAr: event.target.value })}
            as="textarea"
            rows={2}
            dir="rtl"
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-label uppercase text-content-muted mb-1.5">
                {t("promo_discount_type")}
              </p>
              <Select
                value={form.discountType}
                onChange={(event) => set({ discountType: event.target.value })}
                options={discountOptions}
                aria-label={t("promo_discount_type")}
              />
            </div>
            <Field
              className="flex-1"
              label={t("promo_discount_value")}
              value={form.discountValue}
              onChange={(event) => set({ discountValue: event.target.value })}
              type="number"
              inputMode="decimal"
              dir="ltr"
              suffix={form.discountType === "PERCENTAGE" ? "%" : currency}
              inputClassName="tnum"
            />
          </div>

          <div>
            <p className="text-label uppercase text-content-muted mb-1.5">
              {t("promo_applies_to")}
            </p>
            <Select
              value={form.serviceId}
              onChange={(event) => set({ serviceId: event.target.value })}
              options={serviceOptions}
              aria-label={t("promo_applies_to")}
            />
            <p className="mt-1.5 text-caption text-content-muted">{t("promo_applies_to_hint")}</p>
          </div>

          <div className="flex gap-3">
            <Field
              className="flex-1"
              label={t("promo_valid_from")}
              value={form.startDate}
              onChange={(event) => set({ startDate: event.target.value })}
              type="date"
              dir="ltr"
            />
            <Field
              className="flex-1"
              label={t("promo_valid_until")}
              value={form.endDate}
              onChange={(event) => set({ endDate: event.target.value })}
              type="date"
              dir="ltr"
            />
          </div>

          {editId ? (
            <Toggle
              checked={form.isActive}
              onChange={(next) => set({ isActive: next })}
              label={t("promo_active")}
              hint={t("promo_active_hint")}
            />
          ) : null}

          {formError ? (
            <p role="alert" className="text-body-sm text-state-danger">
              {formError}
            </p>
          ) : null}
        </div>
      </BottomSheet>

      <ConfirmSheet
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={reallyDelete}
        loading={deleting}
        destructive
        title={t("promo_delete_title", { name: confirmDelete?.Title || "" })}
        message={t("promo_delete_message")}
        detail={t("promo_delete_detail")}
        confirmLabel={t("delete")}
      />
    </div>
  );
}
