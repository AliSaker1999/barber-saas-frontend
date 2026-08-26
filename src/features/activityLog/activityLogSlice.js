import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchActivityLog = createAsyncThunk(
  "activityLog/fetch",
  async (filters, { rejectWithValue }) => {
    try {
      const res = await api.get("/activity-logs", { params: filters });
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load activity log");
    }
  }
);

const activityLogSlice = createSlice({
  name: "activityLog",
  initialState: {
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchActivityLog.pending, s => { s.loading = true; s.error = null; })
      .addCase(fetchActivityLog.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload.items;
        s.total = a.payload.total;
        s.page = a.payload.page;
        s.pageSize = a.payload.pageSize;
      })
      .addCase(fetchActivityLog.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  }
});

export default activityLogSlice.reducer;
