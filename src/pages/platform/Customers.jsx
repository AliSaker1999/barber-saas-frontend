import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  fetchCustomers,
  deactivateCustomer,
  reactivateCustomer,
  clearPlatformCustomersError
} from "../../features/platformCustomers/platformCustomersSlice";

import ResetCustomerPasswordModal from "./ResetCustomerPasswordModal";
import EditCustomerModal from "./EditCustomerModal";
import Pagination from "../../components/Pagination";
import usePagination from "../../hooks/usePagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Button from "../../components/ui/Button";
import Field from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import { Avatar, Pill } from "../../components/ui/Primitives";
import { ConfirmSheet } from "../../components/ui/BottomSheet";
import { EmptyState, InlineError, ListSkeleton } from "../../components/ui/States";

/* Platform staff tooling — deliberately English-only, see REDESIGN.md. */

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses", icon: "users" },
  { value: "ACTIVE", label: "Active only", icon: "check" },
  { value: "INACTIVE", label: "Inactive only", icon: "x" }
];

export default function PlatformCustomers() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((s) => s.platformCustomers);

  const [resetId, setResetId] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [acting, setActing] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    dispatch(fetchCustomers());
  }, [dispatch]);

  const filteredCustomers = useMemo(() => {
    const needle = debouncedSearch.toLowerCase();
    return items.filter((customer) => {
      /*
       * `c.FullName.toLowerCase()` with no guard: a single customer with a null
       * name threw here and took the entire list down. Guest accounts are
       * created from a phone number alone, so a null name is reachable — and
       * this page, the one you would open to fix such a record, was the one
       * that would not load.
       */
      const matchesSearch =
        (customer.FullName || "").toLowerCase().includes(needle) ||
        (customer.Email || "").toLowerCase().includes(needle) ||
        (customer.PhoneNumber || "").includes(debouncedSearch);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && customer.IsActive) ||
        (statusFilter === "INACTIVE" && !customer.IsActive);
      return matchesSearch && matchesStatus;
    });
  }, [items, debouncedSearch, statusFilter]);

  const { currentPage, setCurrentPage, totalPages, paginatedItems } = usePagination(
    filteredCustomers,
    9
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, setCurrentPage]);

  async function confirmAction() {
    if (!confirming) return;
    setActing(true);
    try {
      const action =
        confirming.kind === "deactivate" ? deactivateCustomer : reactivateCustomer;
      await dispatch(action(confirming.customer.Id)).unwrap();
    } catch {
      /* Recorded by the slice and shown in the banner above the list. */
    } finally {
      setConfirming(null);
      setActing(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-base p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-h1 text-content-primary">Customers</h1>
          <p className="text-body-sm text-content-secondary">
            Everyone with an account, across every shop
          </p>
        </div>

        {error ? (
          <div className="mb-4">
            <InlineError
              message={error}
              onRetry={() => dispatch(clearPlatformCustomersError())}
            />
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row gap-3 mb-5">
          <Field
            className="flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone"
            aria-label="Search customers"
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
          <ListSkeleton count={6} height="h-[160px]" />
        ) : !filteredCustomers.length ? (
          <EmptyState
            icon={search || statusFilter !== "ALL" ? "search" : "users"}
            title={
              search || statusFilter !== "ALL"
                ? "No customers match your filters"
                : "No customers yet"
            }
            description={
              search || statusFilter !== "ALL"
                ? "Try a different name, email, phone or status."
                : "Accounts appear here as people register."
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedItems.map((customer) => (
              <div
                key={customer.Id}
                className={`rounded-card bg-surface-raised border border-line-subtle p-4 ${
                  customer.IsActive ? "" : "opacity-75"
                }`}
              >
                <div className="flex justify-between items-start gap-3 mb-3">
                  <Avatar name={customer.FullName || "?"} size={44} />
                  <Pill tone={customer.IsActive ? "success" : "neutral"}>
                    {customer.IsActive ? "Active" : "Inactive"}
                  </Pill>
                </div>

                <p className="text-body font-bold text-content-primary truncate">
                  {customer.FullName || "No name on file"}
                </p>
                <p className="text-caption text-content-muted truncate mb-3">
                  {customer.Email || customer.PhoneNumber || "No contact details"}
                </p>

                <Button
                  variant="secondary"
                  block
                  icon="edit"
                  className="mb-2"
                  onClick={() => setEditingCustomer(customer)}
                >
                  Edit profile
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    block
                    onClick={() => setResetId(customer.Id)}
                  >
                    Reset password
                  </Button>
                  {customer.IsActive ? (
                    <Button
                      variant="danger"
                      size="sm"
                      block
                      onClick={() => setConfirming({ kind: "deactivate", customer })}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      block
                      icon="check"
                      onClick={() => setConfirming({ kind: "reactivate", customer })}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <ResetCustomerPasswordModal
          customerId={resetId}
          open={Boolean(resetId)}
          onClose={() => setResetId(null)}
        />

        <EditCustomerModal
          customer={editingCustomer}
          isOpen={Boolean(editingCustomer)}
          onClose={() => setEditingCustomer(null)}
        />

        <ConfirmSheet
          open={Boolean(confirming)}
          onClose={() => setConfirming(null)}
          onConfirm={confirmAction}
          loading={acting}
          destructive={confirming?.kind === "deactivate"}
          title={
            confirming?.kind === "deactivate"
              ? `Deactivate ${confirming?.customer?.FullName || "this customer"}?`
              : `Reactivate ${confirming?.customer?.FullName || "this customer"}?`
          }
          message={
            confirming?.kind === "deactivate"
              ? "They can no longer log in or book anywhere on Ajmal."
              : "They can log in and book again."
          }
          detail={
            confirming?.kind === "deactivate"
              ? "Bookings they have already made are not cancelled."
              : undefined
          }
          confirmLabel={confirming?.kind === "deactivate" ? "Deactivate" : "Reactivate"}
          cancelLabel="Cancel"
        />
      </div>
    </div>
  );
}
