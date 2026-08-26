import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchMyScheduleRequests = createAsyncThunk(
  "scheduleRequests/fetchMine",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/schedule-requests/mine");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load your requests");
    }
  }
);

export const requestTimeOff = createAsyncThunk(
  "scheduleRequests/requestTimeOff",
  async ({ startDate, endDate, reason }, { rejectWithValue }) => {
    try {
      const res = await api.post("/schedule-requests/time-off", { startDate, endDate, reason });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to submit time-off request");
    }
  }
);

export const requestSwap = createAsyncThunk(
  "scheduleRequests/requestSwap",
  async ({ startDate, endDate, reason, partnerBarberId, partnerStartDate, partnerEndDate }, { rejectWithValue }) => {
    try {
      const res = await api.post("/schedule-requests/swap", {
        startDate, endDate, reason, partnerBarberId, partnerStartDate, partnerEndDate
      });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to submit swap request");
    }
  }
);

export const respondToSwap = createAsyncThunk(
  "scheduleRequests/respondToSwap",
  async ({ id, accept }, { rejectWithValue }) => {
    try {
      await api.post(`/schedule-requests/${id}/respond`, { accept });
      return { id, accept };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to respond to swap");
    }
  }
);

export const cancelScheduleRequest = createAsyncThunk(
  "scheduleRequests/cancel",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/schedule-requests/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to cancel request");
    }
  }
);

export const fetchTenantScheduleRequests = createAsyncThunk(
  "scheduleRequests/fetchTenant",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/schedule-requests");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load requests");
    }
  }
);

export const approveScheduleRequest = createAsyncThunk(
  "scheduleRequests/approve",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/schedule-requests/${id}/approve`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to approve request");
    }
  }
);

export const declineScheduleRequest = createAsyncThunk(
  "scheduleRequests/decline",
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      await api.patch(`/schedule-requests/${id}/decline`, { reason });
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to decline request");
    }
  }
);

const scheduleRequestsSlice = createSlice({
  name: "scheduleRequests",
  initialState: {
    mine: [],
    mineLoading: false,
    mineError: null,
    tenant: [],
    tenantLoading: false,
    tenantError: null,
    actionLoading: false,
    actionError: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyScheduleRequests.pending, (s) => { s.mineLoading = true; s.mineError = null; })
      .addCase(fetchMyScheduleRequests.fulfilled, (s, a) => { s.mineLoading = false; s.mine = a.payload; })
      .addCase(fetchMyScheduleRequests.rejected, (s, a) => { s.mineLoading = false; s.mineError = a.payload; })

      .addCase(fetchTenantScheduleRequests.pending, (s) => { s.tenantLoading = true; s.tenantError = null; })
      .addCase(fetchTenantScheduleRequests.fulfilled, (s, a) => { s.tenantLoading = false; s.tenant = a.payload; })
      .addCase(fetchTenantScheduleRequests.rejected, (s, a) => { s.tenantLoading = false; s.tenantError = a.payload; })

      .addCase(requestTimeOff.pending, (s) => { s.actionLoading = true; s.actionError = null; })
      .addCase(requestTimeOff.fulfilled, (s) => { s.actionLoading = false; })
      .addCase(requestTimeOff.rejected, (s, a) => { s.actionLoading = false; s.actionError = a.payload; })

      .addCase(requestSwap.pending, (s) => { s.actionLoading = true; s.actionError = null; })
      .addCase(requestSwap.fulfilled, (s) => { s.actionLoading = false; })
      .addCase(requestSwap.rejected, (s, a) => { s.actionLoading = false; s.actionError = a.payload; })

      .addCase(respondToSwap.fulfilled, (s, a) => {
        const item = s.mine.find((r) => r.Id === a.payload.id);
        if (item) item.Status = a.payload.accept ? "PENDING_ADMIN" : "DECLINED";
      })

      .addCase(cancelScheduleRequest.fulfilled, (s, a) => {
        s.mine = s.mine.filter((r) => r.Id !== a.payload);
      })

      .addCase(approveScheduleRequest.fulfilled, (s, a) => {
        const item = s.tenant.find((r) => r.Id === a.payload);
        if (item) item.Status = "APPROVED";
      })
      .addCase(declineScheduleRequest.fulfilled, (s, a) => {
        const item = s.tenant.find((r) => r.Id === a.payload);
        if (item) item.Status = "DECLINED";
      });
  },
});

export default scheduleRequestsSlice.reducer;
