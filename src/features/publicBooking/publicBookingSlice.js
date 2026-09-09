import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import publicApi, { setPublicAuthToken } from "../../services/publicApi";
import { getAcquisitionSource } from "../../utils/acquisition";
import {
  loadBookingState,
  saveBookingState,
  clearBookingState
} from "../booking/bookingStorage";

const STORAGE_KEY = "public_booking_state";
const persisted = loadBookingState(STORAGE_KEY);

export const fetchActiveTenants = createAsyncThunk(
  "publicBooking/fetchActiveTenants",
  async (_, { rejectWithValue }) => {
    try {
      const res = await publicApi.get("/public/tenants");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load shops");
    }
  }
);

export const fetchTenant = createAsyncThunk(
  "publicBooking/fetchTenant",
  async (slug, { rejectWithValue }) => {
    try {
      const res = await publicApi.get(`/public/tenants/${slug}`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Shop not found");
    }
  }
);

export const fetchServices = createAsyncThunk(
  "publicBooking/fetchServices",
  async (slug, { rejectWithValue }) => {
    try {
      const res = await publicApi.get(`/public/tenants/${slug}/services`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load services");
    }
  }
);

export const fetchBarbers = createAsyncThunk(
  "publicBooking/fetchBarbers",
  async (slug, { rejectWithValue }) => {
    try {
      const res = await publicApi.get(`/public/tenants/${slug}/barbers`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load barbers");
    }
  }
);

export const fetchSlots = createAsyncThunk(
  "publicBooking/fetchSlots",
  async ({ slug, barberId, serviceIds, date }, { rejectWithValue }) => {
    try {
      const res = await publicApi.get(
        `/public/tenants/${slug}/barbers/${barberId}/slots`,
        { params: { serviceIds, date } }
      );
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load slots");
    }
  }
);

export const registerGuest = createAsyncThunk(
  "publicBooking/registerGuest",
  async ({ slug, fullName, phoneNumber }, { rejectWithValue }) => {
    try {
      /* Account creation is the one moment the server can record which of the
         shop's channels — counter QR, Instagram bio, WhatsApp share — brought
         this customer in, so the tag captured on landing is attached here. */
      const source = getAcquisitionSource();
      const res = await publicApi.post(`/public/tenants/${slug}/guest`, {
        fullName,
        phoneNumber,
        ...(source ? { source } : {})
      });
      const result = res.data.data;
      setPublicAuthToken(result.token);
      return result;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to continue as guest");
    }
  }
);

export const requestPhoneVerification = createAsyncThunk(
  "publicBooking/requestPhoneVerification",
  async ({ slug, phoneNumber }, { rejectWithValue }) => {
    try {
      await publicApi.post(`/public/tenants/${slug}/verify-phone/request`, { phoneNumber });
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to send verification code");
    }
  }
);

export const confirmPhoneVerification = createAsyncThunk(
  "publicBooking/confirmPhoneVerification",
  async ({ slug, code, phoneNumber }, { rejectWithValue }) => {
    try {
      await publicApi.post(`/public/tenants/${slug}/verify-phone/confirm`, { code, phoneNumber });
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Invalid or expired code");
    }
  }
);

export const bookAppointment = createAsyncThunk(
  "publicBooking/bookAppointment",
  async ({ slug, barberId, serviceIds, startTime }, { rejectWithValue }) => {
    try {
      const res = await publicApi.post(`/public/tenants/${slug}/book`, {
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

export const joinWaitlist = createAsyncThunk(
  "publicBooking/joinWaitlist",
  async ({ slug, barberId, serviceIds, preferredDate }, { rejectWithValue }) => {
    try {
      const res = await publicApi.post(`/public/tenants/${slug}/waitlist`, { barberId, serviceIds, preferredDate });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to join waitlist");
    }
  }
);

// Not a /public/... route — the guest already holds a real JWT from registerGuest
// above, so this calls the same authenticated endpoint a logged-in customer uses,
// just with the guest's token attached (publicApi carries it via setPublicAuthToken).
export const createDepositCheckoutSession = createAsyncThunk(
  "publicBooking/createDepositCheckoutSession",
  async (appointmentId, { rejectWithValue }) => {
    try {
      const res = await publicApi.post(`/appointments/${appointmentId}/deposit/checkout-session`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to start deposit payment");
    }
  }
);

const publicBookingSlice = createSlice({
  name: "publicBooking",
  initialState: {
    activeTenants: [],
    activeTenantsLoading: false,
    activeTenantsError: null,
    tenant: null,
    tenantLoading: false,
    tenantError: null,
    services: [],
    servicesLoading: false,
    barbers: [],
    barbersLoading: false,
    selectedServiceIds: persisted?.selectedServiceIds || [],
    selectedBarberId: persisted?.selectedBarberId || null,
    slots: [],
    slotsLoading: false,
    slotsError: null,
    guest: null,
    guestLoading: false,
    guestError: null,
    verificationLoading: false,
    verificationError: null,
    booking: null,
    bookingLoading: false,
    bookingError: null,
    waitlistJoined: false,
    waitlistLoading: false,
    waitlistError: null
  },
  reducers: {
    toggleService(state, action) {
      const id = action.payload;
      const exists = state.selectedServiceIds.includes(id);
      state.selectedServiceIds = exists
        ? state.selectedServiceIds.filter(s => s !== id)
        : [...state.selectedServiceIds, id];
      saveBookingState({
        tenantId: state.tenant?.Id,
        selectedServiceIds: state.selectedServiceIds,
        selectedBarberId: state.selectedBarberId
      }, STORAGE_KEY);
    },
    selectBarber(state, action) {
      state.selectedBarberId = action.payload;
      state.slots = [];
    },
    resetPublicBooking(state) {
      setPublicAuthToken(null);
      clearBookingState(STORAGE_KEY);
      Object.assign(state, {
        selectedServiceIds: [],
        selectedBarberId: null,
        slots: [],
        guest: null,
        booking: null,
        waitlistJoined: false
      });
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchActiveTenants.pending, s => { s.activeTenantsLoading = true; s.activeTenantsError = null; })
      .addCase(fetchActiveTenants.fulfilled, (s, a) => { s.activeTenantsLoading = false; s.activeTenants = a.payload; })
      .addCase(fetchActiveTenants.rejected, (s, a) => { s.activeTenantsLoading = false; s.activeTenantsError = a.payload; })

      .addCase(fetchTenant.pending, s => { s.tenantLoading = true; s.tenantError = null; })
      .addCase(fetchTenant.fulfilled, (s, a) => { s.tenantLoading = false; s.tenant = a.payload; })
      .addCase(fetchTenant.rejected, (s, a) => { s.tenantLoading = false; s.tenantError = a.payload; })

      .addCase(fetchServices.pending, s => { s.servicesLoading = true; })
      .addCase(fetchServices.fulfilled, (s, a) => { s.servicesLoading = false; s.services = a.payload; })
      .addCase(fetchServices.rejected, s => { s.servicesLoading = false; })

      .addCase(fetchBarbers.pending, s => { s.barbersLoading = true; })
      .addCase(fetchBarbers.fulfilled, (s, a) => { s.barbersLoading = false; s.barbers = a.payload; })
      .addCase(fetchBarbers.rejected, s => { s.barbersLoading = false; })

      .addCase(fetchSlots.pending, s => { s.slotsLoading = true; s.slotsError = null; })
      .addCase(fetchSlots.fulfilled, (s, a) => { s.slotsLoading = false; s.slots = a.payload; })
      .addCase(fetchSlots.rejected, (s, a) => { s.slotsLoading = false; s.slotsError = a.payload; s.slots = []; })

      .addCase(registerGuest.pending, s => { s.guestLoading = true; s.guestError = null; })
      .addCase(registerGuest.fulfilled, (s, a) => { s.guestLoading = false; s.guest = a.payload.user; })
      .addCase(registerGuest.rejected, (s, a) => { s.guestLoading = false; s.guestError = a.payload; })

      .addCase(requestPhoneVerification.pending, s => { s.verificationLoading = true; s.verificationError = null; })
      .addCase(requestPhoneVerification.fulfilled, s => { s.verificationLoading = false; })
      .addCase(requestPhoneVerification.rejected, (s, a) => { s.verificationLoading = false; s.verificationError = a.payload; })

      .addCase(confirmPhoneVerification.pending, s => { s.verificationLoading = true; s.verificationError = null; })
      .addCase(confirmPhoneVerification.fulfilled, s => {
        s.verificationLoading = false;
        if (s.guest) s.guest.isPhoneVerified = true;
      })
      .addCase(confirmPhoneVerification.rejected, (s, a) => { s.verificationLoading = false; s.verificationError = a.payload; })

      .addCase(bookAppointment.pending, s => { s.bookingLoading = true; s.bookingError = null; })
      .addCase(bookAppointment.fulfilled, (s, a) => {
        s.bookingLoading = false;
        s.booking = a.payload;
        clearBookingState(STORAGE_KEY);
      })
      .addCase(bookAppointment.rejected, (s, a) => { s.bookingLoading = false; s.bookingError = a.payload; })

      .addCase(joinWaitlist.pending, s => { s.waitlistLoading = true; s.waitlistError = null; })
      .addCase(joinWaitlist.fulfilled, s => {
        s.waitlistLoading = false;
        s.waitlistJoined = true;
        clearBookingState(STORAGE_KEY);
      })
      .addCase(joinWaitlist.rejected, (s, a) => { s.waitlistLoading = false; s.waitlistError = a.payload; });
  }
});

export const { toggleService, selectBarber, resetPublicBooking } = publicBookingSlice.actions;
export default publicBookingSlice.reducer;
