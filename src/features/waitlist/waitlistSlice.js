import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const joinWaitlist = createAsyncThunk(
  "waitlist/join",
  async ({ tenantId, barberId, serviceIds, preferredDate }, { rejectWithValue }) => {
    try {
      const res = await api.post("/waitlist", { tenantId, barberId, serviceIds, preferredDate });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to join waitlist");
    }
  }
);

export const fetchMyWaitlist = createAsyncThunk(
  "waitlist/fetchMine",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/waitlist/mine");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load waitlist");
    }
  }
);

export const leaveWaitlist = createAsyncThunk(
  "waitlist/leave",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/waitlist/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to leave waitlist");
    }
  }
);

const waitlistSlice = createSlice({
  name: "waitlist",
  initialState: {
    items: [],
    isLoading: false,
    error: null,
    joinLoading: false,
    joinError: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyWaitlist.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyWaitlist.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchMyWaitlist.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(joinWaitlist.pending, (state) => {
        state.joinLoading = true;
        state.joinError = null;
      })
      .addCase(joinWaitlist.fulfilled, (state) => {
        state.joinLoading = false;
      })
      .addCase(joinWaitlist.rejected, (state, action) => {
        state.joinLoading = false;
        state.joinError = action.payload;
      })
      .addCase(leaveWaitlist.fulfilled, (state, action) => {
        state.items = state.items.filter((w) => w.Id !== action.payload);
      });
  },
});

export default waitlistSlice.reducer;
