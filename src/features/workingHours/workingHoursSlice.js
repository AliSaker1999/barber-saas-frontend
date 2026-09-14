import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/*
 * Barber rotas.
 *
 * Keyed by barber rather than one shared `items` array. The old shape meant
 * switching from one barber to another showed the previous barber's hours
 * until the refetch landed — on a slow connection, long enough to edit and
 * save the wrong person's week.
 *
 * Writes go through PUT (the whole week) rather than the per-day POST: seven
 * requests for one rota meant a half-saved week was a normal outcome, and the
 * POST cannot record a day off at all because it hardcodes IsActive = 1.
 */

export const fetchWorkingHours = createAsyncThunk(
  "workingHours/fetch",
  async (barberId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/barbers/${barberId}/availability`);
      return { barberId, days: res.data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load working hours");
    }
  }
);

export const saveWeeklyWorkingHours = createAsyncThunk(
  "workingHours/saveWeek",
  async ({ barberId, days }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/barbers/${barberId}/working-hours`, { days });
      return { barberId, days: res.data?.data ?? [] };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to save working hours");
    }
  }
);

const workingHoursSlice = createSlice({
  name: "workingHours",
  initialState: {
    byBarber: {},
    loading: false,
    error: null
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkingHours.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkingHours.fulfilled, (state, action) => {
        state.loading = false;
        state.byBarber[action.payload.barberId] = action.payload.days;
      })
      .addCase(fetchWorkingHours.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(saveWeeklyWorkingHours.fulfilled, (state, action) => {
        /* The endpoint returns the resulting week, so there is nothing to
           refetch — and no window where the screen shows the old rota. */
        state.byBarber[action.payload.barberId] = action.payload.days;
      });
  }
});

export default workingHoursSlice.reducer;
