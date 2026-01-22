import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchCustomerDetails = createAsyncThunk(
  "customers/fetchDetails",
  async ({ customerId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customers/${customerId}/details`);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch customer details");
    }
  }
);

export const updateCustomerTenantDetails = createAsyncThunk(
  "customers/updateTenantDetails",
  async ({ customerId, notes, loyaltyPoints }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/customers/${customerId}/tenant-info`, { notes, loyaltyPoints });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update customer info");
    }
  }
);

const customersSlice = createSlice({
  name: "customers",
  initialState: {
    selectedCustomer: null,
    loading: false,
    error: null,
    updateSuccess: false,
  },
  reducers: {
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
      state.updateSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCustomerDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCustomer = action.payload;
      })
      .addCase(fetchCustomerDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateCustomerTenantDetails.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateCustomerTenantDetails.fulfilled, (state) => {
        state.loading = false;
        state.updateSuccess = true;
      })
      .addCase(updateCustomerTenantDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSelectedCustomer } = customersSlice.actions;
export default customersSlice.reducer;
