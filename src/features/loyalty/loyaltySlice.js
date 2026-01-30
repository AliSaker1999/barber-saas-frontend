import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchCustomerLoyalty = createAsyncThunk(
  "loyalty/fetchCustomer",
  async (tenantId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/loyalty/me/${tenantId}`);
      return { tenantId, data: res.data?.data || null };
    } catch (err) {
      return rejectWithValue({
        tenantId,
        message: err.response?.data?.message || "Failed to load loyalty info"
      });
    }
  }
);

export const fetchLoyaltyRewards = createAsyncThunk(
  "loyalty/fetchRewards",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/loyalty/rewards");
      return res.data?.data || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load rewards");
    }
  }
);

export const createLoyaltyReward = createAsyncThunk(
  "loyalty/createReward",
  async ({ serviceId, pointsRequired }, { rejectWithValue }) => {
    try {
      const res = await api.post("/loyalty/rewards", { serviceId, pointsRequired });
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to add reward");
    }
  }
);

export const updateLoyaltyReward = createAsyncThunk(
  "loyalty/updateReward",
  async ({ rewardId, serviceId, pointsRequired, isActive }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/loyalty/rewards/${rewardId}`, {
        serviceId,
        pointsRequired,
        isActive
      });
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update reward");
    }
  }
);

export const deleteLoyaltyReward = createAsyncThunk(
  "loyalty/deleteReward",
  async (rewardId, { rejectWithValue }) => {
    try {
      await api.delete(`/loyalty/rewards/${rewardId}`);
      return rewardId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete reward");
    }
  }
);

const loyaltySlice = createSlice({
  name: "loyalty",
  initialState: {
    customer: {
      tenantId: null,
      data: null,
      loading: false,
      error: null
    },
    rewards: {
      items: [],
      loading: false,
      error: null
    }
  },
  reducers: {
    clearCustomerLoyalty(state) {
      state.customer = { tenantId: null, data: null, loading: false, error: null };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerLoyalty.pending, (state, action) => {
        state.customer.loading = true;
        state.customer.error = null;
        state.customer.tenantId = action.meta.arg;
      })
      .addCase(fetchCustomerLoyalty.fulfilled, (state, action) => {
        state.customer.loading = false;
        state.customer.data = action.payload.data;
        state.customer.tenantId = action.payload.tenantId;
        state.customer.error = null;
      })
      .addCase(fetchCustomerLoyalty.rejected, (state, action) => {
        state.customer.loading = false;
        state.customer.data = null;
        state.customer.tenantId = action.payload?.tenantId || null;
        state.customer.error = action.payload?.message || "Failed to load loyalty info";
      })
      .addCase(fetchLoyaltyRewards.pending, (state) => {
        state.rewards.loading = true;
        state.rewards.error = null;
      })
      .addCase(fetchLoyaltyRewards.fulfilled, (state, action) => {
        state.rewards.loading = false;
        state.rewards.items = action.payload || [];
        state.rewards.error = null;
      })
      .addCase(fetchLoyaltyRewards.rejected, (state, action) => {
        state.rewards.loading = false;
        state.rewards.error = action.payload || "Failed to load rewards";
      })
      .addCase(createLoyaltyReward.pending, (state) => {
        state.rewards.loading = true;
        state.rewards.error = null;
      })
      .addCase(createLoyaltyReward.fulfilled, (state, action) => {
        state.rewards.loading = false;
        if (action.payload) state.rewards.items.unshift(action.payload);
      })
      .addCase(createLoyaltyReward.rejected, (state, action) => {
        state.rewards.loading = false;
        state.rewards.error = action.payload || "Failed to add reward";
      })
      .addCase(updateLoyaltyReward.pending, (state) => {
        state.rewards.loading = true;
        state.rewards.error = null;
      })
      .addCase(updateLoyaltyReward.fulfilled, (state, action) => {
        state.rewards.loading = false;
        const updated = action.payload;
        if (!updated) return;
        const idx = state.rewards.items.findIndex(r => r.Id === updated.Id);
        if (idx >= 0) state.rewards.items[idx] = updated;
      })
      .addCase(updateLoyaltyReward.rejected, (state, action) => {
        state.rewards.loading = false;
        state.rewards.error = action.payload || "Failed to update reward";
      })
      .addCase(deleteLoyaltyReward.pending, (state) => {
        state.rewards.loading = true;
        state.rewards.error = null;
      })
      .addCase(deleteLoyaltyReward.fulfilled, (state, action) => {
        state.rewards.loading = false;
        state.rewards.items = state.rewards.items.filter(r => r.Id !== action.payload);
      })
      .addCase(deleteLoyaltyReward.rejected, (state, action) => {
        state.rewards.loading = false;
        state.rewards.error = action.payload || "Failed to delete reward";
      });
  }
});

export const { clearCustomerLoyalty } = loyaltySlice.actions;
export default loyaltySlice.reducer;
