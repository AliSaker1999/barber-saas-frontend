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

/* This shop's own customer list — search/filter/pagination all happen
   client-side over one fetch, which is the right scale for a single shop's
   customer count (see platform/Customers.jsx for the platform-wide version,
   which is the same shape at a bigger scale). */
export const fetchTenantCustomers = createAsyncThunk(
  "customers/fetchTenantList",
  async (_arg, { rejectWithValue }) => {
    try {
      const response = await api.get("/customers/tenant");
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch customers");
    }
  }
);

/* Blocks or unblocks a customer at this shop only — kept separate from
   updateCustomerTenantDetails above because it is an access-control decision
   with a real consequence, not annotation, and the UI gates it behind its
   own confirmation rather than firing on a Save tap. */
export const updateCustomerBlock = createAsyncThunk(
  "customers/updateBlock",
  async ({ customerId, blocked }, { rejectWithValue }) => {
    try {
      await api.patch(`/customers/${customerId}/block`, { blocked });
      return { customerId, blocked };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update block status");
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
    /* Kept separate from the singular selectedCustomer state above so the
       existing detail-modal contract (and the tests that cover it) are
       untouched by adding a list. */
    list: {
      items: [],
      loading: false,
      error: null
    }
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
      })
      .addCase(fetchTenantCustomers.pending, (state) => {
        state.list.loading = true;
        state.list.error = null;
      })
      .addCase(fetchTenantCustomers.fulfilled, (state, action) => {
        state.list.loading = false;
        state.list.items = action.payload;
      })
      .addCase(fetchTenantCustomers.rejected, (state, action) => {
        state.list.loading = false;
        state.list.error = action.payload;
      })
      .addCase(updateCustomerBlock.fulfilled, (state, action) => {
        const { customerId, blocked } = action.payload;

        /* Patched in place rather than refetched — the row's badge updates
           immediately, and a full reload of every customer for one toggle
           would be wasteful. */
        const row = state.list.items.find(
          (c) => String(c.CustomerId).toLowerCase() === String(customerId).toLowerCase()
        );
        if (row) row.IsBlocked = blocked;

        if (state.selectedCustomer?.Id === customerId) {
          state.selectedCustomer.IsBlocked = blocked;
        }
      });
  },
});

export const { clearSelectedCustomer } = customersSlice.actions;
export default customersSlice.reducer;
