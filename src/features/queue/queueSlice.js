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

/*
 * A shop adding someone who walked in.
 *
 * No tenant id in the path: the server takes it from the staff member's token,
 * so a shop can only ever add to its own line.
 */
export const addWalkIn = createAsyncThunk(
  "queue/addWalkIn",
  async ({ fullName, phoneNumber, barberId, serviceIds }, { rejectWithValue }) => {
    try {
      const res = await api.post("/queue/walk-in", {
        fullName,
        phoneNumber,
        barberId,
        serviceIds
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to add the walk-in");
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
/*
 * `expectedInChairId` is the entry the screen could see in the chair when the
 * button was tapped. The server completes only that person, so a second tap —
 * from another device, or from Today while Queue is open on the counter
 * tablet — cannot complete whoever the first tap just seated.
 */
export const moveNext = createAsyncThunk(
  "queue/next",
  async ({ barberId, expectedInChairId = null }, { rejectWithValue }) => {
    try {
      await api.post("/queue/next", { barberId, expectedInChairId });
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

export const payQueueWithLoyaltyThunk = createAsyncThunk(
  "queue/payWithLoyalty",
  async ({ queueId, rewardId }, { rejectWithValue }) => {
    try {
      await api.post(`/queue/${queueId}/pay/loyalty`, { rewardId });
      return { queueId, rewardId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to redeem loyalty points");
    }
  }
);

export const approveQueueItemThunk = createAsyncThunk(
  "queue/approve",
  async (queueId, { rejectWithValue }) => {
    try {
      await api.patch(`/queue/${queueId}/approve`);
      return queueId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to approve queue item");
    }
  }
);

export const declineQueueItemThunk = createAsyncThunk(
  "queue/decline",
  async (queueId, { rejectWithValue }) => {
    try {
      await api.patch(`/queue/${queueId}/decline`);
      return queueId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to decline queue item");
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
    error: null,
    lastFetchedAt: null,
    isStale: false
  },
  reducers: {
    setCachedQueueStats(s, a) {
      s.stats = a.payload.stats || [];
      s.lastFetchedAt = a.payload.lastFetchedAt || null;
      s.isStale = true;
      s.error = null;
    },
    setCachedMyPosition(s, a) {
      s.myPosition = a.payload.myPosition || null;
      s.lastFetchedAt = a.payload.lastFetchedAt || null;
      s.isStale = true;
      s.error = null;
    }
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
        s.lastFetchedAt = new Date().toISOString();
        s.isStale = false;
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
        s.lastFetchedAt = new Date().toISOString();
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
        s.lastFetchedAt = new Date().toISOString();
        s.isStale = false;
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

export const { setCachedQueueStats, setCachedMyPosition } = queueSlice.actions;

export default queueSlice.reducer;
