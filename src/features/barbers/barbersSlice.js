import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Fetch barbers */
export const fetchBarbers = createAsyncThunk(
  "barbers/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/barbers");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch barbers");
    }
  }
);

/* Create barber profile */
export const createBarber = createAsyncThunk(
  "barbers/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post("/barbers", data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create barber");
    }
  }
);


/*
 * Set the full list of services a barber performs.
 *
 * Replaces a per-checkbox toggle against POST /barbers/:id/services. That
 * endpoint flips rather than assigns, so a double tap, a retry, or two staff
 * editing the same barber could silently un-assign a service — and the shop
 * only found out when a customer could not book. One request, stating the
 * whole list, applied server-side as a delta.
 */
export const setBarberServices = createAsyncThunk(
  "barbers/setServices",
  async ({ barberId, serviceIds }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/barbers/${barberId}/services`, { serviceIds });
      return { barberId, serviceIds: res.data?.data?.serviceIds ?? serviceIds };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to save services");
    }
  }
);

export const toggleAvailability = createAsyncThunk(
  "barbers/toggleAvailability",
  async ({ barberId, isAvailable, isAcceptingAppointments, autoAcceptAppointments }, { rejectWithValue }) => {
    try {
      const payload = {};
      if (isAvailable !== undefined) payload.isAvailable = isAvailable;
      if (isAcceptingAppointments !== undefined) payload.isAcceptingAppointments = isAcceptingAppointments;
      if (autoAcceptAppointments !== undefined) payload.autoAcceptAppointments = autoAcceptAppointments;
      
      await api.patch(`/barbers/${barberId}/availability`, payload);
      return { barberId, ...payload };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update availability");
    }
  }
);

export const fetchBarberProfile = createAsyncThunk(
  "barbers/fetchProfile",
  async (barberId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/barbers/${barberId}/profile`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Could not load this profile. Please try again."
      );
    }
  }
);

export const updateBarberProfile = createAsyncThunk(
  "barbers/updateProfile",
  async ({ barberId, data }, { rejectWithValue }) => {
    try {
      await api.patch(`/barbers/${barberId}/profile`, data);
      return { barberId, data };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Could not save your profile. Please try again."
      );
    }
  }
);

export const rateBarber = createAsyncThunk(
  "barbers/rate",
  async ({ barberId, rating, comment, appointmentId, queueId }, { rejectWithValue }) => {
    try {
      await api.post(`/barbers/${barberId}/rate`, { rating, comment, appointmentId, queueId });
      return { barberId };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Could not send your review. Please try again."
      );
    }
  }
);

const barbersSlice = createSlice({
  name: "barbers",
  initialState: {
    items: [],
    selectedProfile: null,
    loading: false,
    error: null
  },
  extraReducers: builder => {
    builder
      .addCase(fetchBarbers.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchBarbers.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
      })
      /* The list had no rejected case, so a failed load showed an empty team
         rather than an error — indistinguishable from a shop with no barbers. */
      .addCase(fetchBarbers.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(fetchBarberProfile.pending, (s) => { s.loading = true; })
      .addCase(fetchBarberProfile.fulfilled, (s, a) => {
        s.loading = false;
        s.selectedProfile = a.payload;
      })
      .addCase(fetchBarberProfile.rejected, (s) => { s.loading = false; })
      .addCase(setBarberServices.fulfilled, (s, a) => {
        const barber = s.items.find(b => b.Id === a.payload.barberId);
        if (barber) barber.ServiceIds = a.payload.serviceIds;
      })
    .addCase(toggleAvailability.fulfilled, (state, action) => {
      const { barberId, isAvailable, isAcceptingAppointments, autoAcceptAppointments } = action.payload;
      
      // Update in list
      const barber = state.items.find(b => b.Id === barberId);
      if (barber) {
        if (isAvailable !== undefined) barber.IsAvailable = isAvailable;
        if (isAcceptingAppointments !== undefined) barber.IsAcceptingAppointments = isAcceptingAppointments;
        if (autoAcceptAppointments !== undefined) barber.AutoAcceptAppointments = autoAcceptAppointments;
      }

      // Update in selected profile
      if (state.selectedProfile && state.selectedProfile.Id === barberId) {
        if (isAvailable !== undefined) state.selectedProfile.IsAvailable = isAvailable;
        if (isAcceptingAppointments !== undefined) state.selectedProfile.IsAcceptingAppointments = isAcceptingAppointments;
        if (autoAcceptAppointments !== undefined) state.selectedProfile.AutoAcceptAppointments = autoAcceptAppointments;
      }
    });
  }
});

export default barbersSlice.reducer;
