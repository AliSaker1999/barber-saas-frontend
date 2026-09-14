import { useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "../../i18n";
import { fetchTenantCustomers, fetchCustomerDetails, clearSelectedCustomer } from "../../features/customers/customersSlice";
import { formatDateOnly } from "../../utils/time";
import usePagination from "../../hooks/usePagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import TopBar from "../../components/ui/TopBar";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { FilterChip, Pill } from "../../components/ui/Primitives";
import { PersonRow } from "../../components/shop/ShopDayComponents";
import { EmptyState, ErrorState, ListSkeleton } from "../../components/ui/States";
import CustomerModal from "../../components/CustomerModal";

const PAGE_SIZE = 12;

/*
 * A shop's own customers.
 *
 * Search, the Blocked filter, and pagination all happen over one fetch —
 * a single shop's customer count is small enough that this is the right
 * scale (the platform-wide equivalent, pages/platform/Customers.jsx, is the
 * same shape for a much bigger list).
 */
export default function Customers() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();

  const { items, loading, error } = useAppSelector((state) => state.customers.list);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [openCustomerId, setOpenCustomerId] = useState(null);

  useEffect(() => {
    dispatch(fetchTenantCustomers());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    return items.filter((c) => {
      const matchesSearch =
        !query ||
        c.FullName?.toLowerCase().includes(query) ||
        c.Email?.toLowerCase().includes(query) ||
        c.PhoneNumber?.includes(query);
      const matchesBlocked = !onlyBlocked || c.IsBlocked;
      return matchesSearch && matchesBlocked;
    });
  }, [items, debouncedSearch, onlyBlocked]);

  /* No effect resetting the page to 1 on a filter change: usePagination
     already clamps currentPage to the new totalPages, which lands on page 1
     whenever a narrower filter no longer has enough items for the page you
     were on. */
  const { currentPage, setCurrentPage, totalPages, paginatedItems } = usePagination(filtered, PAGE_SIZE);

  const blockedCount = items.filter((c) => c.IsBlocked).length;

  function openCustomer(customerId) {
    setOpenCustomerId(customerId);
    dispatch(fetchCustomerDetails({ customerId }));
  }

  function closeCustomer() {
    setOpenCustomerId(null);
    dispatch(clearSelectedCustomer());
  }

  return (
    <div className="pb-8">
      <TopBar title={t("nav_customers")} back />

      <div className="px-4 pt-1">
        <div className="relative">
          <span className="absolute start-3.5 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none">
            <Icon name="search" size={18} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("customers_search_placeholder")}
            aria-label={t("customers_search_placeholder")}
            className="w-full h-12 ps-11 pe-11 rounded-control bg-surface-raised border border-line-subtle
                       text-body text-content-primary placeholder:text-content-muted
                       focus:border-brand-gold focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t("close")}
              className="absolute end-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-content-muted"
            >
              <Icon name="x" size={16} />
            </button>
          ) : null}
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          <FilterChip active={!onlyBlocked} onClick={() => setOnlyBlocked(false)} count={items.length}>
            {t("customers_filter_all")}
          </FilterChip>
          <FilterChip active={onlyBlocked} onClick={() => setOnlyBlocked(true)} icon="lock" count={blockedCount}>
            {t("customers_filter_blocked")}
          </FilterChip>
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading && !items.length ? (
          <ListSkeleton count={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => dispatch(fetchTenantCustomers())} />
        ) : !items.length ? (
          <EmptyState
            icon="users"
            title={t("customers_empty_title")}
            description={t("customers_empty_sub")}
          />
        ) : !filtered.length ? (
          <EmptyState
            icon="search"
            title={t("customers_no_results_title")}
            description={t("customers_no_results_sub")}
          />
        ) : (
          <>
            <ul className="space-y-2">
              {paginatedItems.map((customer) => (
                <li key={customer.CustomerId}>
                  <PersonRow
                    name={customer.FullName}
                    photo={customer.ProfileImage}
                    onOpen={() => openCustomer(customer.CustomerId)}
                    primary={
                      customer.LastVisitAt
                        ? t("customers_last_visit", { date: formatDateOnly(customer.LastVisitAt) })
                        : t("customer_first_time")
                    }
                    secondary={t("customers_visit_count", { n: customer.VisitCount || 0 })}
                    toneLabel={customer.IsBlocked ? t("customer_blocked_pill") : undefined}
                    tone={customer.IsBlocked ? "danger" : undefined}
                    badges={
                      customer.LoyaltyPoints ? (
                        <Pill tone="gold" icon="star">
                          {t("customers_loyalty_points", { n: customer.LoyaltyPoints })}
                        </Pill>
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>

            {totalPages > 1 ? (
              <div className="flex items-center justify-center gap-3 mt-5">
                <Button
                  variant="ghost"
                  size="sm"
                  icon="chevron-left"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  {t("previous")}
                </Button>
                <span className="text-caption text-content-muted tnum">
                  {t("page_of", { page: currentPage, total: totalPages })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  iconEnd="chevron-right"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  {t("next")}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <CustomerModal isOpen={Boolean(openCustomerId)} onClose={closeCustomer} />
    </div>
  );
}
