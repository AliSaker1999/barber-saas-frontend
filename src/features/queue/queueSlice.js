import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Join queue */
export const joinQueue = createAsyncThunk(
  "queue/join",
  async (tenantId) => {
    await api.post(`/queue/${tenantId}/join`);
    return tenantId;
  }
);

/* Fetch queue */
export const fetchQueue = createAsyncThunk(
  "queue/fetch",
  async () => {
    const res = await api.get("/queue");
    return res.data.data;
  }
);

/* Move to next */
export const moveNext = createAsyncThunk(
  "queue/next",
  async () => {
    await api.post("/queue/next");
  }
);

export const fetchMyQueuePosition = createAsyncThunk(
  "queue/position",
  async (tenantId) => {
    const res = await api.get(
      `/queue/me/${tenantId}/position`
    );
    return res.data.position;
  }
);

export const leaveQueue = createAsyncThunk(
  "queue/leave",
  async (tenantId) => {
    await api.patch(`/queue/me/${tenantId}/leave`);
  }
);

const queueSlice = createSlice({
  name: "queue",
  initialState: {
    items: [],
    loading: false,
    myPosition: null
  },
  extraReducers: builder => {
    builder
      .addCase(joinQueue.pending, s => {
        s.loading = true;
      })
      .addCase(joinQueue.fulfilled, s => {
        s.loading = false;
      })
      .addCase(joinQueue.rejected, s => {
        s.loading = false;
      })
      .addCase(fetchQueue.pending, s => {
        s.loading = true;
      })
      .addCase(fetchQueue.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
      })
      .addCase(moveNext.fulfilled, s => {
        s.loading = false;
      })
      .addCase(fetchMyQueuePosition.fulfilled, (s, a) => {
        s.myPosition = a.payload;
      })
      .addCase(leaveQueue.fulfilled, s => {
        s.myPosition = null;
      });
  }
});

export default queueSlice.reducer;
