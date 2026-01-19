import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchCustomers = createAsyncThunk(
  "platformCustomers/fetch",
  async () => {
    const res = await api.get("/customers");
    return res.data.data;
  }
);

export const deactivateCustomer = createAsyncThunk(
  "platformCustomers/deactivate",
  async (id) => {
    await api.patch(`/customers/${id}/deactivate`);
    return id;
  }
);

export const reactivateCustomer = createAsyncThunk(
  "platformCustomers/reactivate",
  async (id) => {
    await api.patch(`/customers/${id}/reactivate`);
    return id;
  }
);

export const resetCustomerPassword = createAsyncThunk(
  "platformCustomers/resetPassword",
  async ({ id, password }) => {
    await api.patch(`/customers/${id}/reset-password`, { password });
  }
);

const slice = createSlice({
  name: "platformCustomers",
  initialState: {
    items: [],
    loading: false
  },
  extraReducers: builder => {
    builder
      .addCase(fetchCustomers.pending, s => {
        s.loading = true;
      })
      .addCase(fetchCustomers.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
      })
      .addCase(fetchCustomers.rejected, s => {
        s.loading = false;
      })
      .addCase(deactivateCustomer.fulfilled, (s, a) => {
        const c = s.items.find(x => x.Id === a.payload);
        if (c) c.IsActive = false;
      })
      .addCase(reactivateCustomer.fulfilled, (s, a) => {
        const c = s.items.find(x => x.Id === a.payload);
        if (c) c.IsActive = true;
      });
  }
});

export default slice.reducer;
