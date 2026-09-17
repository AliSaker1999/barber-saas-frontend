import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchPlatformTenants,
  createTenant,
  deactivateTenant,
  reactivateTenant,
  fetchTenantAdmin,
  fetchSubscriptionPlans,
  clearPlatformTenantsError
} from "../../features/platformTenants/platformTenantsSlice";
import { formatMoney } from "../../utils/format";

import CreateTenantAdminModal from "./CreateTenantAdminModal";
import ResetTenantAdminModal from "./ResetTenantAdminModal";
import EditTenantModal from "./EditTenantModal";
import ManageSubscriptionModal from "./ManageSubscriptionModal";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import { Pill } from "../../components/ui/Primitives";
import { ConfirmSheet } from "../../components/ui/BottomSheet";
import { EmptyState, InlineError, ListSkeleton } from "../../components/ui/States";

/*
 * Every shop on the platform.
 *
 * This directory is Ajmal's own staff tooling and is deliberately English-only
 * — see REDESIGN.md. Its vocabulary is tenant / slug / MRR, which is not
 * shop-owner language, and coverage.test.js would otherwise require Arabic for
 * all of it. The absence of useI18n here is a decision, not an oversight.
 *
 * The button that matters most on this screen takes an entire shop offline:
 * every one of its staff stops being able to log in. It used to be an ordinary
 * inline button with no confirmation at all, sitting between "Reset Password"
 * and "Advanced Settings". Nothing on the screen could report a failure
 * either — the slice had no error state and no rejected cases.
 */

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses", icon: "list" },
  { value: "ACTIVE", label: "Active only", icon: "check" },
  { value: "INACTIVE", label: "Inactive only", icon: "x" }
];

const emptyDraft = { name: "", slug: "", phoneNumber: "" };

export default function PlatformTenants() {
  const dispatch = useAppDispatch();
  const { items, admins, loading, error } = useAppSelector((s) => s.platformTenants);

  const [draft, setDraft] = useState(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [createAdminTenantId, setCreateAdminTenantId] = useState(null);
  const [resetAdminTenantId, setResetAdminTenantId] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [subscriptionTenant, setSubscriptionTenant] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    dispatch(fetchPlatformTenants());
    dispatch(fetchSubscriptionPlans());
  }, [dispatch]);

  const filteredTenants = useMemo(() => {
    const needle = debouncedSearch.toLowerCase();
    return items.filter((tenant) => {
      /* Name and Slug are NOT NULL in the schema, but a half-created row would
         take the whole list down with it, and this screen is where you would
         go to fix that. */
      const matchesSearch =
        (tenant.Name || "").toLowerCase().includes(needle) ||
        (tenant.Slug || "").toLowerCase().includes(needle);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && tenant.IsActive) ||
        (statusFilter === "INACTIVE" && !tenant.IsActive);
      return matchesSearch && matchesStatus;
    });
  }, [items, debouncedSearch, statusFilter]);

  const { currentPage, setCurrentPage, totalPages, paginatedItems } = usePagination(
    filteredTenants,
    8
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, setCurrentPage]);

  /*
   * One admin lookup per shop, once.
   *
   * This used to run `items.forEach(t => dispatch(fetchTenantAdmin(t.Id)))` in
   * an effect keyed on `[items]` — every shop on the platform, not just the
   * eight on screen, and every deactivate or edit mutates `items` and re-fires
   * the whole fan-out. At two hundred shops that is two hundred requests per
   * toggle.
   */
  const requestedAdmins = useRef(new Set());
  useEffect(() => {
    paginatedItems.forEach((tenant) => {
      if (requestedAdmins.current.has(tenant.Id)) return;
      requestedAdmins.current.add(tenant.Id);
      dispatch(fetchTenantAdmin(tenant.Id));
    });
  }, [paginatedItems, dispatch]);

  async function submitTenant(event) {
    event.preventDefault();
    setCreateError("");

    if (!draft.name.trim() || !draft.slug.trim() || !draft.phoneNumber.trim()) {
      setCreateError("Name, slug and phone number are all required.");
      return;
    }

    setCreating(true);
    try {
      await dispatch(
        createTenant({
          name: draft.name.trim(),
          slug: draft.slug.trim(),
          phoneNumber: draft.phoneNumber.trim()
        })
      ).unwrap();
      /* Cleared only on success. It used to clear unconditionally, outside the
         promise, so a duplicate slug looked exactly like a successful create:
         the fields emptied and no card appeared. */
      setDraft(emptyDraft);
    } catch (err) {
      setCreateError(typeof err === "string" ? err : "Could not create the shop.");
    } finally {
      setCreating(false);
    }
  }

  async function confirmAction() {
    if (!confirming) return;
    setActing(true);
    try {
      const action = confirming.kind === "deactivate" ? deactivateTenant : reactivateTenant;
      await dispatch(action(confirming.tenant.Id)).unwrap();
      setConfirming(null);
    } catch {
      /* The slice records it; the banner at the top of the list shows it. */
      setConfirming(null);
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-base p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-h1 text-content-primary">Shops</h1>
          <p className="text-body-sm text-content-secondary">
            Every shop on the platform, and who runs it
          </p>
        </div>

        {error ? (
          <div className="mb-4">
            <InlineError
              message={error}
              onRetry={() => dispatch(clearPlatformTenantsError())}
            />
          </div>
        ) : null}

        <section className="rounded-card bg-surface-raised border border-line-subtle p-4 mb-6">
          <h2 className="text-h3 text-content-primary mb-3">Add a shop</h2>
          <form onSubmit={submitTenant} className="grid grid-cols-1 md:grid-cols-4 gap-3" noValidate>
            <Field
              label="Shop name"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Downtown Barbershop"
            />
            <Field
              label="Slug"
              value={draft.slug}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              placeholder="downtown-barber"
              dir="ltr"
              hint="Used in the booking link"
            />
            <Field
              label="Phone number"
              value={draft.phoneNumber}
              onChange={(e) => setDraft((d) => ({ ...d, phoneNumber: e.target.value }))}
              placeholder="+961 3 123 456"
              dir="ltr"
              inputClassName="tnum"
            />
            <div className="flex items-start md:pt-[26px]">
              <Button type="submit" block icon="plus" loading={creating}>
                Add shop
              </Button>
            </div>
          </form>

          {createError ? (
            <div className="mt-3">
              <InlineError message={createError} />
            </div>
          ) : null}
        </section>

        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <Field
            className="flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or slug"
            aria-label="Search shops"
          />
          <div className="w-full md:w-52">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
              aria-label="Filter by status"
            />
          </div>
        </div>

        {loading && !items.length ? (
          <ListSkeleton count={4} height="h-[200px]" />
        ) : !filteredTenants.length ? (
          <EmptyState
            icon={search || statusFilter !== "ALL" ? "search" : "home"}
            title={
              search || statusFilter !== "ALL"
                ? "No shops match your filters"
                : "No shops yet"
            }
            description={
              search || statusFilter !== "ALL"
                ? "Try a different name, slug or status."
                : "Add the first shop with the form above."
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedItems.map((tenant) => {
              const admin = admins[tenant.Id];

              return (
                <div
                  key={tenant.Id}
                  className={`rounded-card bg-surface-raised border border-line-subtle overflow-hidden ${
                    tenant.IsActive ? "" : "opacity-75"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="min-w-0">
                        <h2 className="text-h3 text-content-primary truncate">{tenant.Name}</h2>
                        <p className="text-caption text-content-muted truncate">
                          /{tenant.Slug}
                        </p>
                      </div>
                      <Pill tone={tenant.IsActive ? "success" : "danger"}>
                        {tenant.IsActive ? "Active" : "Inactive"}
                      </Pill>
                    </div>

                    <div className="rounded-control bg-surface-sunken p-3 mb-2">
                      <p className="text-label uppercase text-content-muted mb-1">Admin</p>
                      {admin ? (
                        <>
                          <p className="text-body font-semibold text-content-primary truncate">
                            {admin.FullName}
                          </p>
                          <p className="text-caption text-content-muted truncate">{admin.Email}</p>
                        </>
                      ) : (
                        <p className="text-body-sm text-content-muted">Nobody assigned</p>
                      )}
                    </div>

                    <div className="rounded-control bg-surface-sunken p-3 mb-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-label uppercase text-content-muted mb-1">Plan</p>
                        {tenant.PlanName ? (
                          <>
                            <p className="text-body font-semibold text-content-primary tnum">
                              {/* Always the platform's own billing currency, never
                                  the shop's — see Settings for the same rule. */}
                              {tenant.PlanName} · {formatMoney(tenant.PlanMonthlyPrice, "USD")}/mo
                            </p>
                            {tenant.SubscriptionRenewsAt ? (
                              <p className="text-caption text-content-muted tnum">
                                {/* A pure calendar date — read YYYY-MM-DD directly
                                    rather than through Date, which shifts it a day
                                    depending on the browser's timezone. */}
                                Renews {tenant.SubscriptionRenewsAt.slice(0, 10)}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-body-sm text-content-muted">No plan</p>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSubscriptionTenant(tenant)}
                      >
                        Change
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Button
                        variant="secondary"
                        block
                        icon="settings"
                        onClick={() => setEditingTenant(tenant)}
                      >
                        Shop settings
                      </Button>

                      <div className="flex gap-2">
                        {tenant.IsActive ? (
                          <>
                            {admin ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                block
                                onClick={() => setResetAdminTenantId(tenant.Id)}
                              >
                                Reset password
                              </Button>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                block
                                icon="plus"
                                onClick={() => setCreateAdminTenantId(tenant.Id)}
                              >
                                Add admin
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              block
                              onClick={() => setConfirming({ kind: "deactivate", tenant })}
                            >
                              Deactivate
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            block
                            icon="check"
                            onClick={() => setConfirming({ kind: "reactivate", tenant })}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <CreateTenantAdminModal
          tenantId={createAdminTenantId}
          open={Boolean(createAdminTenantId)}
          onClose={() => setCreateAdminTenantId(null)}
          onCreated={(tenantId) => dispatch(fetchTenantAdmin(tenantId))}
        />

        <ResetTenantAdminModal
          tenantId={resetAdminTenantId}
          open={Boolean(resetAdminTenantId)}
          onClose={() => setResetAdminTenantId(null)}
        />

        <EditTenantModal
          tenant={editingTenant}
          isOpen={Boolean(editingTenant)}
          onClose={() => setEditingTenant(null)}
        />

        <ManageSubscriptionModal
          tenant={subscriptionTenant}
          open={Boolean(subscriptionTenant)}
          onClose={() => setSubscriptionTenant(null)}
        />

        <ConfirmSheet
          open={Boolean(confirming)}
          onClose={() => setConfirming(null)}
          onConfirm={confirmAction}
          loading={acting}
          destructive={confirming?.kind === "deactivate"}
          title={
            confirming?.kind === "deactivate"
              ? `Take ${confirming?.tenant?.Name} offline?`
              : `Bring ${confirming?.tenant?.Name} back online?`
          }
          message={
            confirming?.kind === "deactivate"
              ? "Everyone who works at this shop stops being able to log in, and the shop disappears from Explore and from its booking link."
              : "Its staff can log in again and the shop returns to Explore."
          }
          detail={
            confirming?.kind === "deactivate"
              ? "Existing bookings are not cancelled. You can reactivate the shop at any time."
              : undefined
          }
          confirmLabel={confirming?.kind === "deactivate" ? "Take it offline" : "Reactivate"}
          cancelLabel="Cancel"
        />
      </div>
    </div>
  );
}
