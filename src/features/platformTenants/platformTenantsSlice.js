import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/*
 * Shops, as the platform sees them.
 *
 * Not one thunk here used to call rejectWithValue, so `.unwrap()` anywhere
 * threw RTK's SerializedError *object* rather than a message — which is how
 * ResetCustomerPasswordModal ended up rendering an object as a React child and
 * white-screening. There was also no `error` in state and no `.rejected` case
 * for a single mutation, so a failed deactivate, create or password reset had
 * nowhere at all to surface.
 *
 * Every thunk now rejects with a sentence, and every mutation records it.
 */

export const fetchPlatformTenants = createAsyncThunk(
  "platformTenants/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/tenants");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not load shops.");
    }
  }
);

export const createTenant = createAsyncThunk(
  "platformTenants/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post("/tenants", data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not create the shop.");
    }
  }
);

export const createTenantAdmin = createAsyncThunk(
  "platformTenants/createAdmin",
  async ({ tenantId, admin }, { rejectWithValue }) => {
    try {
      await api.post(`/tenants/${tenantId}/admin`, admin);
      return tenantId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not create the admin account.");
    }
  }
);

export const deactivateTenant = createAsyncThunk(
  "platformTenants/deactivate",
  async (tenantId, { rejectWithValue }) => {
    try {
      await api.patch(`/tenants/${tenantId}/deactivate`);
      return tenantId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not deactivate the shop.");
    }
  }
);

export const reactivateTenant = createAsyncThunk(
  "platformTenants/reactivate",
  async (tenantId, { rejectWithValue }) => {
    try {
      await api.patch(`/tenants/${tenantId}/reactivate`);
      return tenantId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not reactivate the shop.");
    }
  }
);

export const fetchTenantAdmin = createAsyncThunk(
  "platformTenants/fetchAdmin",
  async (tenantId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/tenants/${tenantId}/admin`);
      return { tenantId, admin: res.data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not load the shop admin.");
    }
  }
);

export const resetTenantAdminPassword = createAsyncThunk(
  "platformTenants/resetAdminPassword",
  async ({ tenantId, password }, { rejectWithValue }) => {
    try {
      await api.patch(`/tenants/${tenantId}/admin/reset-password`, { password });
      return tenantId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not reset the password.");
    }
  }
);

export const updateTenantPlatform = createAsyncThunk(
  "platformTenants/update",
  async ({ tenantId, data }, { dispatch, rejectWithValue }) => {
    try {
      await api.patch(`/tenants/${tenantId}`, data);
      /*
       * PATCH /tenants/:id answers `{ success: true }` and nothing else, so
       * there is no row to put back. This used to merge the modal's own
       * camelCase form (`name`, `slug`, `phone`) into a list that reads
       * PascalCase (`Name`, `Slug`), which adds keys instead of replacing
       * them — a successful save left the card showing the old value and the
       * operator saved again thinking it had failed. Re-reading cannot drift.
       */
      await dispatch(fetchPlatformTenants());
      return tenantId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not save the shop.");
    }
  }
);

export const fetchSubscriptionPlans = createAsyncThunk(
  "platformTenants/fetchSubscriptionPlans",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/tenants/subscription-plans");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not load the plans.");
    }
  }
);

export const updateTenantSubscription = createAsyncThunk(
  "platformTenants/updateSubscription",
  async ({ tenantId, planId, subscriptionRenewsAt }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/tenants/${tenantId}/subscription`, {
        planId,
        subscriptionRenewsAt
      });
      return { tenantId, data: res.data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not change the plan.");
    }
  }
);

/* Every mutation shares one error slot: only one of them can be in flight from
   a single operator, and each screen clears it when it opens a new dialog. */
const failed = (state, action) => {
  state.loading = false;
  state.error = action.payload || "Something went wrong.";
};

const platformTenantsSlice = createSlice({
  name: "platformTenants",
  initialState: {
    items: [],
    admins: {},
    plans: [],
    loading: false,
    error: null
  },
  reducers: {
    clearPlatformTenantsError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlatformTenants.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchPlatformTenants.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
        s.error = null;
      })
      .addCase(fetchPlatformTenants.rejected, failed)

      .addCase(createTenant.fulfilled, (s, a) => {
        if (a.payload) s.items.unshift(a.payload);
      })
      .addCase(createTenant.rejected, failed)

      .addCase(deactivateTenant.fulfilled, (s, a) => {
        const tenant = s.items.find((x) => x.Id === a.payload);
        if (tenant) tenant.IsActive = false;
      })
      .addCase(deactivateTenant.rejected, failed)

      .addCase(reactivateTenant.fulfilled, (s, a) => {
        const tenant = s.items.find((x) => x.Id === a.payload);
        if (tenant) tenant.IsActive = true;
      })
      .addCase(reactivateTenant.rejected, failed)

      /* The list has already been re-read by the thunk. */
      .addCase(updateTenantPlatform.rejected, failed)

      .addCase(createTenantAdmin.rejected, failed)
      .addCase(resetTenantAdminPassword.rejected, failed)

      .addCase(fetchTenantAdmin.fulfilled, (s, a) => {
        s.admins[a.payload.tenantId] = a.payload.admin;
      })

      .addCase(fetchSubscriptionPlans.fulfilled, (s, a) => {
        s.plans = a.payload;
      })
      .addCase(fetchSubscriptionPlans.rejected, failed)

      .addCase(updateTenantSubscription.fulfilled, (s, a) => {
        const tenant = s.items.find((x) => x.Id === a.payload.tenantId);
        if (!tenant) return;
        const { planId, subscriptionRenewsAt, isActive } = a.payload.data || {};
        const plan = s.plans.find((p) => p.Id === planId);
        tenant.PlanId = planId;
        tenant.SubscriptionRenewsAt = subscriptionRenewsAt;
        tenant.PlanName = plan ? plan.Name : null;
        tenant.PlanMonthlyPrice = plan ? plan.MonthlyPrice : null;
        if (typeof isActive === "boolean") tenant.IsActive = isActive;
      })
      .addCase(updateTenantSubscription.rejected, failed);
  }
});

export const { clearPlatformTenantsError } = platformTenantsSlice.actions;
export default platformTenantsSlice.reducer;
