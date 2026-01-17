import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

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
      .addCase(fetchQueue.pending, state => {
        state.loading = true;
      })
      .addCase(fetchQueue.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(moveNext.fulfilled, state => {
        state.loading = false;
      })
      .addCase(fetchMyQueuePosition.fulfilled, (state, action) => {
        state.myPosition = action.payload;
      })
      .addCase(leaveQueue.fulfilled, state => {
        state.myPosition = null;
        });
  }
});

export default queueSlice.reducer;
