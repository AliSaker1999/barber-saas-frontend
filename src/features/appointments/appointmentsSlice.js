import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Fetch tenant appointments */
export const fetchAppointments = createAsyncThunk(
  "appointments/fetch",
  async () => {
    const res = await api.get("/appointments");
    return res.data.data;
  }
);

/* Cancel */
export const cancelAppointment = createAsyncThunk(
  "appointments/cancel",
  async (id) => {
    await api.patch(`/appointments/${id}/cancel`);
    return id;
  }
);

/* No-show */
export const markNoShow = createAsyncThunk(
  "appointments/noShow",
  async (id) => {
    await api.patch(`/appointments/${id}/no-show`);
    return id;
  }
);

const appointmentsSlice = createSlice({
  name: "appointments",
  initialState: {
    items: [],
    loading: false
  },
  extraReducers: builder => {
    builder
      .addCase(fetchAppointments.pending, state => {
        state.loading = true;
      })
      .addCase(fetchAppointments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(cancelAppointment.fulfilled, state => {
        state.loading = false;
      })
      .addCase(markNoShow.fulfilled, state => {
        state.loading = false;
      });
  }
});

export default appointmentsSlice.reducer;
