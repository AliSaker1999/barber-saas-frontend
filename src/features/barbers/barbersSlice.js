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


/* Assign service */
export const assignService = createAsyncThunk(
  "barbers/assignService",
  async ({ barberId, serviceId }, { rejectWithValue }) => {
    try {
      await api.post(`/barbers/${barberId}/services`, { serviceId });
      return { barberId, serviceId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to assign service");
    }
  }
);

export const toggleBarberService = createAsyncThunk(
  "barbers/toggleService",
  async ({ barberId, serviceId }, { rejectWithValue }) => {
    try {
      await api.post(`/barbers/${barberId}/services`, { serviceId });
      return { barberId, serviceId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to toggle service");
    }
  }
);

export const toggleAvailability = createAsyncThunk(
  "barbers/toggleAvailability",
  async ({ barberId, isAvailable, isAcceptingAppointments }, { rejectWithValue }) => {
    try {
      const payload = {};
      if (isAvailable !== undefined) payload.isAvailable = isAvailable;
      if (isAcceptingAppointments !== undefined) payload.isAcceptingAppointments = isAcceptingAppointments;
      
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
      return rejectWithValue(err.response?.data?.message || "Failed");
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
      return rejectWithValue(err.response?.data?.message || "Failed");
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
      return rejectWithValue(err.response?.data?.message || "Failed");
    }
  }
);

const barbersSlice = createSlice({
  name: "barbers",
  initialState: {
    items: [],
    selectedProfile: null,
    loading: false
  },
  extraReducers: builder => {
    builder
      .addCase(fetchBarbers.fulfilled, (s, a) => {
        s.items = a.payload;
      })
      .addCase(fetchBarberProfile.pending, (s) => { s.loading = true; })
      .addCase(fetchBarberProfile.fulfilled, (s, a) => {
        s.loading = false;
        s.selectedProfile = a.payload;
      })
      .addCase(fetchBarberProfile.rejected, (s) => { s.loading = false; })
      .addCase(toggleBarberService.fulfilled, (s, a) => {
      const barber = s.items.find(b => b.Id === a.payload.barberId);
      if (!barber) return;

      barber.ServiceIds = barber.ServiceIds || [];

      barber.ServiceIds = barber.ServiceIds.includes(a.payload.serviceId)
        ? barber.ServiceIds.filter(id => id !== a.payload.serviceId)
        : [...barber.ServiceIds, a.payload.serviceId];
    })
    .addCase(toggleAvailability.fulfilled, (state, action) => {
      const { barberId, isAvailable, isAcceptingAppointments } = action.payload;
      
      // Update in list
      const barber = state.items.find(b => b.Id === barberId);
      if (barber) {
        if (isAvailable !== undefined) barber.IsAvailable = isAvailable;
        if (isAcceptingAppointments !== undefined) barber.IsAcceptingAppointments = isAcceptingAppointments;
      }

      // Update in selected profile
      if (state.selectedProfile && state.selectedProfile.Id === barberId) {
        if (isAvailable !== undefined) state.selectedProfile.IsAvailable = isAvailable;
        if (isAcceptingAppointments !== undefined) state.selectedProfile.IsAcceptingAppointments = isAcceptingAppointments;
      }
    });
  }
});

export default barbersSlice.reducer;
