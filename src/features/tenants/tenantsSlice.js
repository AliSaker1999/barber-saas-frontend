import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/*
 * Shop discovery.
 *
 * `/tenants/active` returns each shop with its live availability (open now,
 * barbers on duty, shortest walk-in wait, price band), so this one call feeds
 * both Home and Explore. The previous version had no rejected case at all,
 * which is how a failed load showed as a permanently empty shop list instead
 * of an error with a retry.
 */
export const fetchTenants = createAsyncThunk(
  "tenants/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/tenants/active");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.friendlyMessage || "Failed to load shops");
    }
  }
);

const tenantsSlice = createSlice({
  name: "tenants",
  initialState: {
    tenants: [],
    loading: false,
    error: null,
    lastFetchedAt: null,
    /* True when the list on screen came from a previous session's cache and
       the availability figures can no longer be trusted as live. */
    isStale: false
  },
  reducers: {
    setCachedTenants(state, action) {
      state.tenants = action.payload.tenants || [];
      state.lastFetchedAt = action.payload.lastFetchedAt || null;
      state.isStale = true;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTenants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.loading = false;
        state.tenants = action.payload || [];
        state.error = null;
        state.lastFetchedAt = new Date().toISOString();
        state.isStale = false;
      })
      .addCase(fetchTenants.rejected, (state, action) => {
        state.loading = false;
        /* Keep whatever is already on screen: a stale list beats a blank page
           when the connection drops mid-scroll. */
        state.error = action.payload || action.error?.message || "Failed to load shops";
        state.isStale = state.tenants.length > 0;
      });
  }
});

export const { setCachedTenants } = tenantsSlice.actions;

export default tenantsSlice.reducer;
