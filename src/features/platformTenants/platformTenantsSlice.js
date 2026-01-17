import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchPlatformTenants = createAsyncThunk(
  "platformTenants/fetch",
  async () => {
    const res = await api.get("/platform/tenants");
    return res.data.data;
  }
);

export const createTenant = createAsyncThunk(
  "platformTenants/create",
  async (data) => {
    const res = await api.post("/platform/tenants", data);
    return res.data.data;
  }
);

export const createTenantAdmin = createAsyncThunk(
  "platformTenants/createAdmin",
  async ({ tenantId, admin }) => {
    await api.post(
      `/platform/tenants/${tenantId}/admin`,
      admin
    );
    return tenantId;
  }
);

export const deactivateTenant = createAsyncThunk(
  "platformTenants/deactivate",
  async (tenantId) => {
    await api.patch(
      `/platform/tenants/${tenantId}/deactivate`
    );
    return tenantId;
  }
);

const platformTenantsSlice = createSlice({
  name: "platformTenants",
  initialState: {
    items: [],
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
      .addCase(createTenant.fulfilled, (s, a) => {
        s.items.unshift({
          Id: a.payload.tenantId,
          Name: "",
          Slug: "",
          IsActive: true
        });
      })
      .addCase(deactivateTenant.fulfilled, (s, a) => {
        const t = s.items.find(x => x.Id === a.payload);
        if (t) t.IsActive = false;
      });
  }
});

export default platformTenantsSlice.reducer;
