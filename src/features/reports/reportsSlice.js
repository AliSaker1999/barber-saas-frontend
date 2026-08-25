import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "../../services/api";

export const fetchTenantsReport = createAsyncThunk(
  "reports/fetchTenants",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reports/tenants");
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const fetchSubscriptionSummary = createAsyncThunk(
  "reports/fetchSubscriptionSummary",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reports/subscription-summary");
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const fetchCustomersReport = createAsyncThunk(
  "reports/fetchCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reports/customers");
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const fetchTenantDashboard = createAsyncThunk(
  "reports/fetchTenantDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reports/tenant-dashboard");
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const fetchCustomerDashboard = createAsyncThunk(
  "reports/fetchCustomerDashboard",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get("/reports/customer-dashboard");
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const reportsSlice = createSlice({
  name: "reports",
  initialState: {
    tenants: [],
    customers: [],
    tenantDashboard: null,
    customerDashboard: null,
    subscriptionSummary: null,
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscriptionSummary.fulfilled, (state, action) => {
        state.subscriptionSummary = action.payload;
      })
      .addCase(fetchTenantsReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTenantsReport.fulfilled, (state, action) => {
        state.loading = false;
        state.tenants = action.payload;
      })
      .addCase(fetchTenantsReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCustomersReport.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCustomersReport.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload;
      })
      .addCase(fetchCustomersReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTenantDashboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTenantDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.tenantDashboard = action.payload;
      })
      .addCase(fetchTenantDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchCustomerDashboard.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCustomerDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.customerDashboard = action.payload;
      })
      .addCase(fetchCustomerDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export default reportsSlice.reducer;
