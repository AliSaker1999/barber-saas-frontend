import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchTenants = createAsyncThunk(
  "tenants/fetch",
  async () => {
    const res = await api.get("/tenants/active");
    return res.data.data;
  }
);

const tenantsSlice = createSlice({
  name: "tenants",
  initialState: {
    tenants: [],
    loading: false
  },
  extraReducers: builder => {
    builder
      .addCase(fetchTenants.pending, state => {
        state.loading = true;
      })
      .addCase(fetchTenants.fulfilled, (state, action) => {
        state.loading = false;
        state.tenants = action.payload;
      });
  }
});

export default tenantsSlice.reducer;
