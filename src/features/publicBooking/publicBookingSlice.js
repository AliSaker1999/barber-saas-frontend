import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import publicApi, { setPublicAuthToken } from "../../services/publicApi";
import {
  saveGuestSession,
  saveGuestQueue,
  clearGuestSession
} from "../../utils/guestSession";
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

      /* Persisted so a refresh — or the phone locking mid-OTP — doesn't throw
         the guest back to the start of the flow, and so a walk-in tracker can
         be resumed later from the same tab. */
      saveGuestSession({
        token: result.token,
        slug,
        fullName,
        phoneNumber
      });

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

/*
 * `GET /queue/me/:tenantId/position` answers with a flat `{ inQueue: false }`
 * — not null, and not wrapped in `data` like the rest of the API — once the
 * customer is out of the line, whether they were served, cancelled or marked a
 * no-show.
 *
 * That object is truthy, so passing it straight through made the tracker
 * render a queue card reading "#undefined in line" for someone whose turn had
 * already come. Collapsed to null here so every consumer can just check for a
 * queue.
 */
export function normalizeQueuePosition(payload) {
  const body = payload?.data ?? payload;
  if (!body || body.inQueue !== true) return null;

  /* eslint-disable-next-line no-unused-vars -- the flag is the thing being dropped */
  const { inQueue, ...queue } = body;
  return queue;
}

/*
 * Live walk-in waits for the landing page. Unauthenticated on purpose: the
 * wait has to be visible before anyone signs up, which is the whole point of
 * the QR card on the counter.
 */
export const fetchQueueStats = createAsyncThunk(
  "publicBooking/fetchQueueStats",
  async (slug, { rejectWithValue }) => {
    try {
      const res = await publicApi.get(`/public/tenants/${slug}/queue-stats`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load wait times");
    }
  }
);

/*
 * Joining and tracking a walk-in queue as a guest.
 *
 * These three call the *authenticated* queue endpoints with the guest's own
 * token rather than public duplicates. That works because tenantMiddleware
 * short-circuits for the CUSTOMER role and a guest account is an ordinary
 * CUSTOMER — the same mechanism createDepositCheckoutSession already relies
 * on. A backend test pins the behaviour down so it can't regress silently.
 */
export const joinQueue = createAsyncThunk(
  "publicBooking/joinQueue",
  async ({ tenantId, slug, barberId, serviceIds }, { rejectWithValue }) => {
    try {
      await publicApi.post(`/queue/tenants/${tenantId}/join`, { barberId, serviceIds });
      saveGuestQueue({ tenantId, slug });
      return { tenantId, slug };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to join the queue");
    }
  }
);

export const fetchQueuePosition = createAsyncThunk(
  "publicBooking/fetchQueuePosition",
  async (tenantId, { rejectWithValue }) => {
    try {
      const res = await publicApi.get(`/queue/me/${tenantId}/position`);
      return normalizeQueuePosition(res.data);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load your place in line");
    }
  }
);

export const leaveQueue = createAsyncThunk(
  "publicBooking/leaveQueue",
  async (tenantId, { rejectWithValue }) => {
    try {
      await publicApi.patch(`/queue/me/${tenantId}/leave`);
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to leave the queue");
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
    /* Without these a rejected fetch only cleared the loading flag, so "this
       shop has no services" and "the request failed" rendered identically. */
    servicesError: null,
    barbers: [],
    barbersLoading: false,
    barbersError: null,
    queueStats: [],
    queueStatsLoading: false,
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
    waitlistError: null,
    queue: null,
    queueLoading: false,
    queueError: null,
    queueJoining: false
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

      .addCase(fetchServices.pending, s => { s.servicesLoading = true; s.servicesError = null; })
      .addCase(fetchServices.fulfilled, (s, a) => { s.servicesLoading = false; s.services = a.payload; })
      .addCase(fetchServices.rejected, (s, a) => { s.servicesLoading = false; s.servicesError = a.payload; })

      .addCase(fetchBarbers.pending, s => { s.barbersLoading = true; s.barbersError = null; })
      .addCase(fetchBarbers.fulfilled, (s, a) => { s.barbersLoading = false; s.barbers = a.payload; })
      .addCase(fetchBarbers.rejected, (s, a) => { s.barbersLoading = false; s.barbersError = a.payload; })

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
      .addCase(joinWaitlist.rejected, (s, a) => { s.waitlistLoading = false; s.waitlistError = a.payload; })

      /* Wait times are refreshed by polling, so a failed refresh keeps the
         last known figures rather than blanking them — a slightly stale wait
         is more useful than none, and the tracker labels it. */
      .addCase(fetchQueueStats.pending, s => { s.queueStatsLoading = true; })
      .addCase(fetchQueueStats.fulfilled, (s, a) => { s.queueStatsLoading = false; s.queueStats = a.payload || []; })
      .addCase(fetchQueueStats.rejected, s => { s.queueStatsLoading = false; })

      .addCase(joinQueue.pending, s => { s.queueJoining = true; s.queueError = null; })
      .addCase(joinQueue.fulfilled, s => {
        s.queueJoining = false;
        clearBookingState(STORAGE_KEY);
      })
      .addCase(joinQueue.rejected, (s, a) => { s.queueJoining = false; s.queueError = a.payload; })

      .addCase(fetchQueuePosition.pending, s => { s.queueLoading = true; })
      .addCase(fetchQueuePosition.fulfilled, (s, a) => {
        s.queueLoading = false;
        s.queue = a.payload;
        s.queueError = null;
      })
      .addCase(fetchQueuePosition.rejected, (s, a) => { s.queueLoading = false; s.queueError = a.payload; })

      .addCase(leaveQueue.fulfilled, s => {
        s.queue = null;
        s.queueError = null;
        /* The guest has nothing left to come back to, so the stored token goes
           too rather than lingering in the tab. */
        clearGuestSession();
      })
      .addCase(leaveQueue.rejected, (s, a) => { s.queueError = a.payload; });
  }
});

export const { toggleService, selectBarber, resetPublicBooking } = publicBookingSlice.actions;
export default publicBookingSlice.reducer;
