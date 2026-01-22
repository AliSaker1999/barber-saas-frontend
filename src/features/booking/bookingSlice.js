import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import {
  loadBookingState,
  saveBookingState,
  clearBookingState
} from "./bookingStorage";

export const fetchServices = createAsyncThunk(
  "booking/fetchServices",
  async (tenantId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/services/tenant/${tenantId}`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load services");
    }
  }
);

export const fetchSlots = createAsyncThunk(
  "booking/fetchSlots",
  async ({ tenantId, barberId, serviceIds, date, excludeAppointmentId }, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `/barbers/tenants/${tenantId}/barbers/${barberId}/slots`,
        { params: { serviceIds, date, excludeAppointmentId } }
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load slots");
    }
  }
);

export const bookAppointment = createAsyncThunk(
  "booking/book",
  async ({ tenantId, barberId, serviceIds, startTime }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/appointments/tenants/${tenantId}`, {
        barberId,
        serviceIds,
        startTime
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to book appointment");
    }
  }
);

export const fetchWorkingHours = createAsyncThunk(
  "booking/fetchWorkingHours",
  async (barberId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/barbers/${barberId}/availability`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load availability");
    }
  }
);

export const fetchBarbersForTenant = createAsyncThunk(
  "booking/fetchBarbersForTenant",
  async ({ tenantId }, { rejectWithValue }) => {
    try {
      const res = await api.get(`/barbers/tenants/${tenantId}/barbers`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load barbers");
    }
  }
);
const persisted = loadBookingState();

const bookingSlice = createSlice({
  name: "booking",
  initialState: {
    tenantId: persisted?.tenantId || null,
    services: [],
    barbers: [],
    slots: [],
    workingHours: [],
    workingHoursLoading: false,
    workingHoursError: null,
    slotsLoading: false,
    slotsError: null,
    selectedServiceIds: persisted?.selectedServiceIds || [],
    selectedBarberId: persisted?.selectedBarberId || null,
    loading: false,
    error: null,
    barbersLoading: false,
    barbersError: null,
    reschedule: null
  },
  reducers: {
    selectTenant(state, action) {
      state.tenantId = action.payload;
      state.selectedServiceIds = [];
      state.selectedBarberId = null;
      saveBookingState(state);
    },
    toggleService(state, action) {
      const id = action.payload;
      const exists = state.selectedServiceIds.includes(id);
      state.selectedServiceIds = exists
        ? state.selectedServiceIds.filter(s => s !== id)
        : [...state.selectedServiceIds, id];
      saveBookingState(state);
    },
    setSelectedServices(state, action) {
      state.selectedServiceIds = action.payload;
      saveBookingState(state);
    },
    selectBarber(state, action) {
      state.selectedBarberId = action.payload;
      state.workingHours = [];
      state.workingHoursError = null;
      state.workingHoursLoading = false;
      saveBookingState(state);
    },
    startReschedule(state, action) {
      state.reschedule = action.payload;
    },
    clearReschedule(state) {
      state.reschedule = null;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchServices.pending, s => { s.loading = true; })
      .addCase(fetchServices.fulfilled, (s, a) => {
        s.loading = false;
        s.services = a.payload;
        s.error = null;
      })
      .addCase(fetchServices.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload || a.error?.message || "Failed to load services";
      })
      .addCase(fetchBarbersForTenant.pending, s => {
        s.barbersLoading = true;
        s.barbersError = null;
      })
      .addCase(fetchBarbersForTenant.fulfilled, (s, a) => {
        s.barbersLoading = false;
        s.barbers = a.payload;
      })
      .addCase(fetchBarbersForTenant.rejected, (s, a) => {
        s.barbersLoading = false;
        s.barbersError = a.payload || a.error?.message || "Failed to load barbers";
      })
      .addCase(fetchSlots.pending, s => {
        s.slotsLoading = true;
        s.slotsError = null;
      })
      .addCase(fetchSlots.fulfilled, (s, a) => {
        s.slotsLoading = false;
        s.slots = a.payload;
      })
      .addCase(fetchSlots.rejected, (s, a) => {
        s.slotsLoading = false;
        s.slotsError = a.payload || a.error?.message || "Failed to load slots";
        s.slots = [];
      })
      .addCase(fetchWorkingHours.pending, s => {
        s.workingHoursLoading = true;
        s.workingHoursError = null;
        s.workingHours = [];
      })
      .addCase(fetchWorkingHours.fulfilled, (s, a) => {
        s.workingHoursLoading = false;
        s.workingHours = a.payload;
      })
      .addCase(fetchWorkingHours.rejected, (s, a) => {
        s.workingHoursLoading = false;
        s.workingHoursError = a.payload || a.error?.message || "Failed to load working hours";
      })
      .addCase(bookAppointment.fulfilled, state => {
        clearBookingState();
        state.tenantId = null;
        state.selectedServiceIds = [];
        state.selectedBarberId = null;
        state.slots = [];
        state.reschedule = null;
      });
  }
});

export const {
  selectTenant,
  toggleService,
  setSelectedServices,
  selectBarber,
  startReschedule,
  clearReschedule
} = bookingSlice.actions;

export default bookingSlice.reducer;
