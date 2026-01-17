import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchWorkingHours = createAsyncThunk(
  "workingHours/fetch",
  async (barberId) => {
    const res = await api.get(`/barbers/${barberId}/availability`);
    return res.data.data;
  }
);

export const saveWorkingHours = createAsyncThunk(
  "workingHours/save",
  async ({ barberId, dayOfWeek, startTime, endTime }) => {
    await api.post(`/barbers/${barberId}/working-hours`, {
      dayOfWeek,
      startTime,
      endTime
    });
  }
);

const workingHoursSlice = createSlice({
  name: "workingHours",
  initialState: {
    items: []
  },
  extraReducers: builder => {
    builder.addCase(fetchWorkingHours.fulfilled, (s, a) => {
      s.items = a.payload;
    });
  }
});

export default workingHoursSlice.reducer;
