import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchPlatformTenants = createAsyncThunk(
  "platformTenants/fetch",
  async () => {
    const res = await api.get("/tenants");
    return res.data.data;
  }
);

export const createTenant = createAsyncThunk(
  "platformTenants/create",
  async (data) => {
    const res = await api.post("/tenants", data);
    return res.data.data;
  }
);

export const createTenantAdmin = createAsyncThunk(
  "platformTenants/createAdmin",
  async ({ tenantId, admin }) => {
    await api.post(`/tenants/${tenantId}/admin`, admin);
    return tenantId;
  }
);

export const deactivateTenant = createAsyncThunk(
  "platformTenants/deactivate",
  async (tenantId) => {
    await api.patch(`/tenants/${tenantId}/deactivate`);
    return tenantId;
  }
);
export const reactivateTenant = createAsyncThunk(
  "platformTenants/reactivate",
  async (tenantId) => {
    await api.patch(`/tenants/${tenantId}/reactivate`);
    return tenantId;
  }
);
export const fetchTenantAdmin = createAsyncThunk(
  "platformTenants/fetchAdmin",
  async (tenantId) => {
    const res = await api.get(`/tenants/${tenantId}/admin`);
    return { tenantId, admin: res.data.data };
  }
);

export const resetTenantAdminPassword = createAsyncThunk(
  "platformTenants/resetAdminPassword",
  async ({ tenantId, password }) => {
    await api.patch(
      `/tenants/${tenantId}/admin/reset-password`,
      { password }
    );
    return tenantId;
  }
);

export const updateTenantPlatform = createAsyncThunk(
  "platformTenants/update",
  async ({ tenantId, data }) => {
    await api.patch(`/tenants/${tenantId}`, data);
    return { tenantId, data };
  }
);

export const fetchSubscriptionPlans = createAsyncThunk(
  "platformTenants/fetchSubscriptionPlans",
  async () => {
    const res = await api.get("/tenants/subscription-plans");
    return res.data.data;
  }
);

export const updateTenantSubscription = createAsyncThunk(
  "platformTenants/updateSubscription",
  async ({ tenantId, planId, subscriptionRenewsAt }) => {
    const res = await api.patch(`/tenants/${tenantId}/subscription`, { planId, subscriptionRenewsAt });
    return { tenantId, data: res.data.data };
  }
);


const platformTenantsSlice = createSlice({
  name: "platformTenants",
  initialState: {
  items: [],
  admins: {}, // tenantId -> admin
  plans: [],
  loading: false
},
  extraReducers: builder => {
    builder
      .addCase(fetchPlatformTenants.pending, s => {
        s.loading = true;
      })
      .addCase(fetchPlatformTenants.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
      })
      .addCase(fetchPlatformTenants.rejected, s => {
        s.loading = false;
      })
      .addCase(createTenant.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
  })
      .addCase(deactivateTenant.fulfilled, (s, a) => {
        const t = s.items.find(x => x.Id === a.payload);
        if (t) t.IsActive = false;
      })
      .addCase(reactivateTenant.fulfilled, (s, a) => {
        const t = s.items.find(x => x.Id === a.payload);
        if (t) t.IsActive = true;
      })
      .addCase(updateTenantPlatform.fulfilled, (s, a) => {
        const index = s.items.findIndex(x => x.Id === a.payload.tenantId);
        if (index !== -1) {
          s.items[index] = { ...s.items[index], ...a.payload.data };
        }
      })
      .addCase(fetchTenantAdmin.fulfilled, (s, a) => {
        s.admins[a.payload.tenantId] = a.payload.admin;
      })
      .addCase(fetchSubscriptionPlans.fulfilled, (s, a) => {
        s.plans = a.payload;
      })
      .addCase(updateTenantSubscription.fulfilled, (s, a) => {
        const t = s.items.find(x => x.Id === a.payload.tenantId);
        if (!t) return;
        const { planId, subscriptionRenewsAt, isActive } = a.payload.data;
        const plan = s.plans.find(p => p.Id === planId);
        t.PlanId = planId;
        t.SubscriptionRenewsAt = subscriptionRenewsAt;
        t.PlanName = plan ? plan.Name : null;
        t.PlanMonthlyPrice = plan ? plan.MonthlyPrice : null;
        if (typeof isActive === "boolean") t.IsActive = isActive;
      });


  }
});

export default platformTenantsSlice.reducer;
