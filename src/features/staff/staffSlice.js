import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Fetch barbers */
export const fetchStaff = createAsyncThunk(
  "staff/fetch",
  async () => {
    const res = await api.get("/barbers");
    return res.data.data;
  }
);

/* Add barber */
export const addStaff = createAsyncThunk(
  "staff/add",
  async (data) => {
    const res = await api.post("/users/barber", {
      email: data.email,
      fullName: data.fullName
    });
    return res.data.data;
  }
);

/* Toggle barber availability */
export const toggleStaff = createAsyncThunk(
  "staff/toggle",
  async ({ id, isAvailable }) => {
    await api.patch(`/barbers/${id}/availability`, { isAvailable });
    return { id, isAvailable };
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
        const u = s.items.find(x => x.Id === a.payload.id);
        if (u) u.IsAvailable = a.payload.isAvailable;
      });
  }
});

export default staffSlice.reducer;
