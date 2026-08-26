import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchCompanyProfile = createAsyncThunk(
  "company/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/tenants/profile");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateCompanyProfile = createAsyncThunk(
  "company/updateProfile",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.patch("/tenants/profile", data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchOperatingHours = createAsyncThunk(
  "company/fetchOperatingHours",
  async (tenantId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/tenants/${tenantId}/hours`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const saveOperatingHours = createAsyncThunk(
  "company/saveOperatingHours",
  async (hours, { rejectWithValue }) => {
    try {
      const res = await api.post("/tenants/hours", { hours });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchAvailablePlans = createAsyncThunk(
  "company/fetchAvailablePlans",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/tenants/subscription-plans");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const startCheckout = createAsyncThunk(
  "company/startCheckout",
  async (planId, { rejectWithValue }) => {
    try {
      const res = await api.post("/billing/checkout-session", { planId });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchConnectStatus = createAsyncThunk(
  "company/fetchConnectStatus",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/billing/connect/status");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const startConnectOnboarding = createAsyncThunk(
  "company/startConnectOnboarding",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.post("/billing/connect/onboard");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const companySlice = createSlice({
  name: "company",
  initialState: {
    profile: null,
    loading: false,
    error: null,
    updateSuccess: false,
    operatingHours: [],
    hoursLoading: false,
    hoursError: null,
    hoursSaveSuccess: false,
    availablePlans: [],
    checkoutLoading: false,
    checkoutError: null,
    connectStatus: null,
    connectStatusLoading: false,
    connectOnboardingLoading: false,
    connectOnboardingError: null
  },
  reducers: {
    resetUpdateSuccess: (state) => {
      state.updateSuccess = false;
    },
    resetHoursSaveSuccess: (state) => {
      state.hoursSaveSuccess = false;
    }
  },
  extraReducers: (builder) => {
    builder
      /* Fetch */
      .addCase(fetchCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      /* Update */
      .addCase(updateCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateCompanyProfile.fulfilled, (state) => {
        state.loading = false;
        state.updateSuccess = true;
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      /* Operating hours */
      .addCase(fetchOperatingHours.pending, (state) => {
        state.hoursLoading = true;
        state.hoursError = null;
      })
      .addCase(fetchOperatingHours.fulfilled, (state, action) => {
        state.hoursLoading = false;
        state.operatingHours = action.payload;
      })
      .addCase(fetchOperatingHours.rejected, (state, action) => {
        state.hoursLoading = false;
        state.hoursError = action.payload;
      })
      .addCase(saveOperatingHours.pending, (state) => {
        state.hoursLoading = true;
        state.hoursError = null;
        state.hoursSaveSuccess = false;
      })
      .addCase(saveOperatingHours.fulfilled, (state, action) => {
        state.hoursLoading = false;
        state.operatingHours = action.payload;
        state.hoursSaveSuccess = true;
      })
      .addCase(saveOperatingHours.rejected, (state, action) => {
        state.hoursLoading = false;
        state.hoursError = action.payload;
      })
      /* Billing */
      .addCase(fetchAvailablePlans.fulfilled, (state, action) => {
        state.availablePlans = action.payload;
      })
      .addCase(startCheckout.pending, (state) => {
        state.checkoutLoading = true;
        state.checkoutError = null;
      })
      .addCase(startCheckout.fulfilled, (state) => {
        state.checkoutLoading = false;
      })
      .addCase(startCheckout.rejected, (state, action) => {
        state.checkoutLoading = false;
        state.checkoutError = action.payload;
      })
      .addCase(fetchConnectStatus.pending, (state) => {
        state.connectStatusLoading = true;
      })
      .addCase(fetchConnectStatus.fulfilled, (state, action) => {
        state.connectStatusLoading = false;
        state.connectStatus = action.payload;
      })
      .addCase(fetchConnectStatus.rejected, (state) => {
        state.connectStatusLoading = false;
      })
      .addCase(startConnectOnboarding.pending, (state) => {
        state.connectOnboardingLoading = true;
        state.connectOnboardingError = null;
      })
      .addCase(startConnectOnboarding.fulfilled, (state) => {
        state.connectOnboardingLoading = false;
      })
      .addCase(startConnectOnboarding.rejected, (state, action) => {
        state.connectOnboardingLoading = false;
        state.connectOnboardingError = action.payload;
      });
  }
});

export const { resetUpdateSuccess, resetHoursSaveSuccess } = companySlice.actions;
export default companySlice.reducer;
