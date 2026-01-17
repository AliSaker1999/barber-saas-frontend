import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Fetch staff */
export const fetchStaff = createAsyncThunk(
  "staff/fetch",
  async () => {
    const res = await api.get("/staff");
    return res.data.data;
  }
);

/* Add staff */
export const addStaff = createAsyncThunk(
  "staff/add",
  async (data) => {
    const res = await api.post("/staff", data);
    return res.data.data;
  }
);

/* Toggle active */
export const toggleStaff = createAsyncThunk(
  "staff/toggle",
  async (id) => {
    await api.patch(`/staff/${id}/toggle`);
    return id;
  }
);

const staffSlice = createSlice({
  name: "staff",
  initialState: {
    items: [],
    loading: false
  },
  extraReducers: builder => {
    builder
      .addCase(fetchStaff.pending, s => {
        s.loading = true;
      })
      .addCase(fetchStaff.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
      })
      .addCase(addStaff.fulfilled, (s, a) => {
        s.items.push(a.payload);
      })
      .addCase(toggleStaff.fulfilled, (s, a) => {
        const u = s.items.find(x => x.Id === a.payload);
        if (u) u.IsActive = !u.IsActive;
      });
  }
});

export default staffSlice.reducer;
