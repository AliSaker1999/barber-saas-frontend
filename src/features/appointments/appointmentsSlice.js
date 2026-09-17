import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import { STATUS_ID } from "../../utils/appointmentStatus";

/* Fetch tenant appointments */
export const fetchAppointments = createAsyncThunk(
  "appointments/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      // Build query string if params exist
      const q = new URLSearchParams(params).toString();
      const url = q ? `/appointments?${q}` : "/appointments";
      const res = await api.get(url);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch appointments");
    }
  }
);

export const fetchCustomerAppointments = createAsyncThunk(
  "appointments/fetchCustomer",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/appointments/me");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch your appointments");
    }
  }
);

/* Arrive */
export const arriveForAppointment = createAsyncThunk(
  "appointments/arrive",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/appointments/${id}/arrive`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark as arrived");
    }
  }
);

/* Cancel */
export const cancelAppointment = createAsyncThunk(
  "appointments/cancel",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/appointments/${id}/cancel`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to cancel appointment");
    }
  }
);

/* Notify Customer */
export const notifyCustomer = createAsyncThunk(
  "appointments/notify",
  async (id, { rejectWithValue }) => {
    try {
      await api.post(`/appointments/${id}/notify`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to notify customer");
    }
  }
);

/* No-show */
export const markNoShow = createAsyncThunk(
  "appointments/noShow",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/appointments/${id}/no-show`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark no-show");
    }
  }
);

/* Complete */
export const completeAppointment = createAsyncThunk(
  "appointments/complete",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/appointments/${id}/complete`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to complete appointment");
    }
  }
);

export const rescheduleAppointment = createAsyncThunk(
  "appointments/reschedule",
  async ({ appointmentId, startTime }, { rejectWithValue }) => {
    try {
      await api.patch(`/appointments/${appointmentId}/reschedule`, { startTime });
      return { appointmentId, startTime };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to reschedule appointment");
    }
  }
);

export const acceptAppointment = createAsyncThunk(
  "appointments/accept",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/appointments/${id}/accept`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to accept appointment");
    }
  }
);

/* Verify Payment */
export const verifyPayment = createAsyncThunk(
  "appointments/verifyPayment",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/appointments/${id}/pay/verify`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to verify payment");
    }
  }
);

export const declineAppointment = createAsyncThunk(
  "appointments/decline",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      await api.patch(`/appointments/${id}/decline`, { reason });
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to decline appointment");
    }
  }
);

export const reportAppointmentPaymentThunk = createAsyncThunk(
  "appointments/reportPayment",
  async ({ id, reference }, { rejectWithValue }) => {
    try {
      await api.post(`/appointments/${id}/pay/report`, { reference });
      return { id, reference };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to report payment");
    }
  }
);

export const createDepositCheckoutSessionThunk = createAsyncThunk(
  "appointments/createDepositCheckoutSession",
  async (id, { rejectWithValue }) => {
    try {
      const res = await api.post(`/appointments/${id}/deposit/checkout-session`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to start deposit payment");
    }
  }
);

export const payAppointmentWithLoyaltyThunk = createAsyncThunk(
  "appointments/payWithLoyalty",
  async ({ id, rewardId }, { rejectWithValue }) => {
    try {
      await api.post(`/appointments/${id}/pay/loyalty`, { rewardId });
      return { id, rewardId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to redeem loyalty points");
    }
  }
);

const appointmentsSlice = createSlice({
  name: "appointments",
  initialState: {
    items: [],
    loading: false,
    error: null,
    lastFetchedAt: null,
    isStale: false
  },
  reducers: {
    clearAppointmentsError(state) {
      state.error = null;
    },
    setCachedAppointments(state, action) {
      state.items = action.payload.items || [];
      state.lastFetchedAt = action.payload.lastFetchedAt || null;
      state.isStale = true;
      state.error = null;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(fetchAppointments.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
        state.lastFetchedAt = new Date().toISOString();
        state.isStale = false;
      })
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })
      .addCase(fetchCustomerAppointments.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
        state.lastFetchedAt = new Date().toISOString();
        state.isStale = false;
      })
      .addCase(fetchCustomerAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })
      .addCase(arriveForAppointment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      /*
       * Checking a customer in converts their appointment into a walk-in queue
       * entry (POST /appointments/:id/arrive -> convertAppointmentToQueue). It
       * does NOT complete the service, but this reducer used to mark the row
       * COMPLETED, so a checked-in customer disappeared from "today" and was
       * counted in the day's completed total before their cut had started.
       * The server owns the resulting state, so refetch rather than guess.
       */
      .addCase(arriveForAppointment.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(arriveForAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })
      .addCase(cancelAppointment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(i => i.Id === action.payload);
        if (index !== -1) {
          state.items[index].Status = "CANCELLED";
          state.items[index].StatusId = STATUS_ID.CANCELLED;
        }
      })
      .addCase(cancelAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Failed to cancel appointment";
      })
      .addCase(markNoShow.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markNoShow.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(i => i.Id === action.payload);
        if (index !== -1) {
          state.items[index].Status = "NO_SHOW";
          state.items[index].StatusId = STATUS_ID.NO_SHOW;
        }
      })
      .addCase(markNoShow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Failed to mark no-show";
      })
      .addCase(completeAppointment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(i => i.Id === action.payload);
        if (index !== -1) {
          state.items[index].Status = "COMPLETED";
          state.items[index].StatusId = STATUS_ID.COMPLETED;
        }
      })
      .addCase(completeAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Failed to complete appointment";
      })
      .addCase(rescheduleAppointment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rescheduleAppointment.fulfilled, state => {
        state.loading = false;
      })
      .addCase(rescheduleAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Failed to reschedule appointment";
      })
      .addCase(acceptAppointment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(acceptAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(i => i.Id === action.payload);
        if (index !== -1) {
          state.items[index].Status = "SCHEDULED";
          state.items[index].StatusId = STATUS_ID.SCHEDULED;
        }
      })
      /* `loading = true` here left the Appointments screen stuck in its
         skeleton forever after one failed accept — both the filter tiles and
         the list are gated on `!loading`, so the owner had no way back except
         navigating away. */
      .addCase(acceptAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Failed to accept appointment";
      })
      .addCase(declineAppointment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(declineAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(i => i.Id === action.payload);
        if (index !== -1) {
          /* Both, like every sibling case — anything reading StatusId saw a
             declined booking as still PENDING until the next refetch. */
          state.items[index].Status = "DECLINED";
          state.items[index].StatusId = STATUS_ID.DECLINED;
        }
      })
      .addCase(declineAppointment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || "Failed to decline appointment";
      })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i.Id === action.payload);
        if (index !== -1) {
            state.items[index].PaymentStatus = "PAID";
        }
      })
      .addCase(payAppointmentWithLoyaltyThunk.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i.Id === action.payload.id);
        if (index !== -1) {
          state.items[index].PaymentStatus = "PAID";
          state.items[index].PaymentReference = `LOYALTY:${action.payload.rewardId}`;
          if (state.items[index].Status === "AWAITING_PAYMENT" || state.items[index].StatusId === 7) {
            state.items[index].Status = "SCHEDULED";
            state.items[index].StatusId = 1;
          }
        }
      });
  }
});

export const { clearAppointmentsError, setCachedAppointments } = appointmentsSlice.actions;

export default appointmentsSlice.reducer;
