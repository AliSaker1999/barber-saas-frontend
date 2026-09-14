import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/*
 * "Is my shop ready for customers?"
 *
 * Kept in the store rather than component state because three places need the
 * same answer — the banner on Today, the wizard itself, and the More sheet —
 * and they must never disagree about how many steps are left.
 *
 * Nothing about progress is persisted here or on the server: the answer is
 * recomputed from the shop's actual data every time, so an owner who adds
 * services from the standalone screen finds that step already done when they
 * return to the wizard.
 */

export const fetchSetupStatus = createAsyncThunk(
  "setup/fetchStatus",
  async (_arg, { rejectWithValue }) => {
    try {
      const response = await api.get("/tenants/setup-status");
      return response.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Unable to check your shop's setup right now."
      );
    }
  }
);

const setupSlice = createSlice({
  name: "setup",
  initialState: {
    status: null,
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSetupStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSetupStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(fetchSetupStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        /* Keep the last known status: a failed refresh should not make a
           half-configured shop suddenly look finished, or vice versa. */
      });
  }
});

export default setupSlice.reducer;
