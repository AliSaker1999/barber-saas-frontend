import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import {
  loadBookingState,
  saveBookingState,
  clearBookingState
} from "./bookingStorage";

export const fetchServices = createAsyncThunk(
  "booking/fetchServices",
  async (tenantId) => {
    const res = await api.get(`/services/tenant/${tenantId}`);
    return res.data.data;
  }
);

export const fetchBarbersByService = createAsyncThunk(
  "booking/fetchBarbersByService",
  async (serviceId) => {
    const res = await api.get(`/barbers/services/${serviceId}/barbers`);
    return res.data.data;
  }
);

export const fetchSlots = createAsyncThunk(
  "booking/fetchSlots",
  async ({ tenantId, barberId, serviceIds, date }) => {
    const res = await api.get(
      `/barbers/tenants/${tenantId}/barbers/${barberId}/slots`,
      { params: { serviceId: serviceIds[0], date } } // first version
    );
    return res.data.data;
  }
);

export const bookAppointment = createAsyncThunk(
  "booking/book",
  async ({ tenantId, barberId, serviceIds, startTime }) => {
    const res = await api.post(`/appointments/tenants/${tenantId}`, {
      barberId,
      serviceIds,
      startTime
    });
    return res.data.data;
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
  selectedServiceIds: persisted?.selectedServiceIds || [],
  selectedBarberId: persisted?.selectedBarberId || null,
  loading: false,
  error: null
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
      state.selectedServiceIds = state.selectedServiceIds.includes(id)
        ? state.selectedServiceIds.filter(s => s !== id)
        : [...state.selectedServiceIds, id];
        saveBookingState(state);
    },
    selectBarber(state, action) {
      state.selectedBarberId = action.payload;
      saveBookingState(state);
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
        s.error = a.error?.message || "Failed to load services";
      })
      .addCase(fetchBarbersByService.fulfilled, (s, a) => {
        s.barbers = a.payload;
      })
      .addCase(fetchSlots.fulfilled, (s, a) => {
        s.slots = a.payload;
      })
      .addCase(bookAppointment.fulfilled, state => {
        clearBookingState();
        state.tenantId = null;
        state.selectedServiceIds = [];
        state.selectedBarberId = null;
        state.slots = [];
      });
  }
});

export const {
  selectTenant,
  toggleService,
  selectBarber
} = bookingSlice.actions;

export default bookingSlice.reducer;
