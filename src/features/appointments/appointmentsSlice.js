import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Fetch tenant appointments */
export const fetchAppointments = createAsyncThunk(
  "appointments/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/appointments");
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

export const verifyAppointmentPaymentThunk = createAsyncThunk(
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

const appointmentsSlice = createSlice({
  name: "appointments",
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {
    clearAppointmentsError(state) {
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
      })
      .addCase(fetchCustomerAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message;
      })
      .addCase(arriveForAppointment.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(arriveForAppointment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(i => i.Id === action.payload);
        if (index !== -1) {
          state.items[index].Status = "COMPLETED";
          state.items[index].StatusId = 2;
        }
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
          state.items[index].StatusId = 3;
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
          state.items[index].StatusId = 4;
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
          state.items[index].StatusId = 2;
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
      .addCase(verifyPayment.fulfilled, (state, action) => {
        const index = state.items.findIndex(i => i.Id === action.payload);
        if (index !== -1) {
            state.items[index].PaymentStatus = "PAID";
        }
      });
  }
});

export const { clearAppointmentsError } = appointmentsSlice.actions;

export default appointmentsSlice.reducer;
