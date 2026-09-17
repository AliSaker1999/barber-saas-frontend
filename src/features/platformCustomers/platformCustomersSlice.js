import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/*
 * Customers, as the platform sees them.
 *
 * Same two faults as the tenants slice, and one of them was worse here:
 * `resetCustomerPassword` had no rejectWithValue, so `.unwrap()` in
 * ResetCustomerPasswordModal rejected with RTK's SerializedError object, the
 * modal stored it in state, and rendering `{error}` put an object where React
 * expects a node — a white screen on the one path that had tried to handle its
 * errors properly.
 */

export const fetchCustomers = createAsyncThunk(
  "platformCustomers/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/customers");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not load customers.");
    }
  }
);

export const deactivateCustomer = createAsyncThunk(
  "platformCustomers/deactivate",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/customers/${id}/deactivate`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not deactivate the customer.");
    }
  }
);

export const reactivateCustomer = createAsyncThunk(
  "platformCustomers/reactivate",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/customers/${id}/reactivate`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not reactivate the customer.");
    }
  }
);

export const resetCustomerPassword = createAsyncThunk(
  "platformCustomers/resetPassword",
  async ({ id, password }, { rejectWithValue }) => {
    try {
      await api.patch(`/customers/${id}/reset-password`, { password });
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not reset the password.");
    }
  }
);

export const updateCustomerPlatform = createAsyncThunk(
  "platformCustomers/update",
  async ({ id, data }, { dispatch, rejectWithValue }) => {
    try {
      await api.patch(`/customers/${id}`, data);
      /* The reducer used to spread the modal's camelCase form onto a row the
         list reads as PascalCase, so a saved change never appeared. Re-read
         instead of guessing the shape. */
      await dispatch(fetchCustomers());
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not save the customer.");
    }
  }
);

const failed = (state, action) => {
  state.loading = false;
  state.error = action.payload || "Something went wrong.";
};

const slice = createSlice({
  name: "platformCustomers",
  initialState: {
    items: [],
    loading: false,
    error: null
  },
  reducers: {
    clearPlatformCustomersError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload;
        s.error = null;
      })
      .addCase(fetchCustomers.rejected, failed)

      .addCase(deactivateCustomer.fulfilled, (s, a) => {
        const customer = s.items.find((x) => x.Id === a.payload);
        if (customer) customer.IsActive = false;
      })
      .addCase(deactivateCustomer.rejected, failed)

      .addCase(reactivateCustomer.fulfilled, (s, a) => {
        const customer = s.items.find((x) => x.Id === a.payload);
        if (customer) customer.IsActive = true;
      })
      .addCase(reactivateCustomer.rejected, failed)

      .addCase(resetCustomerPassword.rejected, failed)

      /* The list has already been re-read by the thunk. */
      .addCase(updateCustomerPlatform.rejected, failed);
  }
});

export const { clearPlatformCustomersError } = slice.actions;
export default slice.reducer;
