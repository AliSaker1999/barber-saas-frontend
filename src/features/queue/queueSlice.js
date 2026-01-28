import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Fetch Queue Stats (Customer view) */
export const fetchQueueStats = createAsyncThunk(
  "queue/fetchStats",
  async (tenantId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/queue/tenants/${tenantId}/stats`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch queue stats");
    }
  }
);

/* Join queue (with barberId and serviceIds) */
export const joinQueue = createAsyncThunk(
  "queue/join",
  async ({ tenantId, barberId, serviceIds }, { rejectWithValue }) => {
    try {
      await api.post(`/queue/tenants/${tenantId}/join`, { barberId, serviceIds });
      return tenantId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to join queue");
    }
  }
);

/* Fetch queue (Admin/Barber view) */
export const fetchQueue = createAsyncThunk(
  "queue/fetch",
  async (params = {}, { rejectWithValue }) => {
    try {
      // params can specify barberId filter
      const res = await api.get("/queue", { params });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch queue");
    }
  }
);

/* Move to next */
export const moveNext = createAsyncThunk(
  "queue/next",
  async (barberId, { rejectWithValue }) => {
    try {
      await api.post("/queue/next", { barberId }); 
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to move next");
    }
  }
);

/* Notify Customer */
export const notifyCustomer = createAsyncThunk(
  "queue/notify",
  async (id, { rejectWithValue }) => {
    try {
      await api.post(`/queue/${id}/notify`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to notify customer");
    }
  }
);

export const markQueueNoShow = createAsyncThunk(
  "queue/noShow",
  async (queueId, { rejectWithValue }) => {
    try {
      await api.patch(`/queue/${queueId}/no-show`);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to mark no show");
    }
  }
);

export const fetchMyQueuePosition = createAsyncThunk(
  "queue/position",
  async (tenantId, { rejectWithValue }) => {
    try {
      const res = await api.get(
        `/queue/me/${tenantId}/position`
      );
      // Backend now returns full object { inQueue, barberName, position, status }
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to get queue position");
    }
  }
);

export const leaveQueue = createAsyncThunk(
  "queue/leave",
  async (tenantId, { rejectWithValue }) => {
    try {
      await api.patch(`/queue/me/${tenantId}/leave`);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to leave queue");
    }
  }
);

export const findMyActiveQueue = createAsyncThunk(
  "queue/findActive",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/queue/me/active");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed");
    }
  }
);

export const updateQueueServicesThunk = createAsyncThunk(
  "queue/updateServices",
  async ({ queueId, serviceIds }, { rejectWithValue }) => {
    try {
      await api.patch(`/queue/${queueId}/services`, { serviceIds });
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update services");
    }
  }
);

export const verifyQueuePaymentThunk = createAsyncThunk(
  "queue/verifyPayment",
  async (queueId, { rejectWithValue }) => {
    try {
      await api.patch(`/queue/${queueId}/pay/verify`);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to verify queue payment");
    }
  }
);

export const reportQueuePaymentThunk = createAsyncThunk(
  "queue/reportPayment",
  async ({ queueId, reference }, { rejectWithValue }) => {
    try {
      await api.post(`/queue/${queueId}/pay/report`, { reference });
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to report payment");
    }
  }
);

const queueSlice = createSlice({
  name: "queue",
  initialState: {
    items: [], // Active queue items for Admin/Barber
    stats: [], // Barber stats for Customer
    loading: false,
    myPosition: null, // { inQueue, position, barberName }
    activeQueue: null, // Cross-tenant active queue if any
    error: null
  },
  extraReducers: builder => {
    builder
      .addCase(fetchQueueStats.pending, s => {
        s.loading = true;
      })
      .addCase(fetchQueueStats.fulfilled, (s, a) => {
        s.loading = false;
        s.stats = a.payload;
        s.error = null;
      })
      .addCase(fetchQueueStats.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(joinQueue.pending, s => {
        s.loading = true;
        s.error = null;
      })
      .addCase(joinQueue.fulfilled, s => {
        s.loading = false;
        s.error = null;
      })
      .addCase(joinQueue.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(fetchQueue.pending, s => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchQueue.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
        s.error = null;
      })
      .addCase(fetchQueue.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(moveNext.fulfilled, s => {
        s.loading = false;
        s.error = null;
      })
      .addCase(moveNext.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      })
      .addCase(fetchMyQueuePosition.fulfilled, (s, a) => {
        s.myPosition = a.payload;
        s.error = null;
      })
      .addCase(leaveQueue.fulfilled, s => {
        s.myPosition = null;
        s.activeQueue = null;
        s.error = null;
      })
      .addCase(leaveQueue.rejected, (s, a) => {
        s.error = a.payload;
      })
      .addCase(findMyActiveQueue.fulfilled, (s, a) => {
        s.activeQueue = a.payload;
      });
  }
});

export default queueSlice.reducer;
