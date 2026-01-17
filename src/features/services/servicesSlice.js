import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Fetch tenant services */
export const fetchServices = createAsyncThunk(
  "services/fetch",
  async (tenantId) => {
    const res = await api.get(`/tenants/${tenantId}/services`);
    return res.data.data;
  }
);

/* Add service */
export const addService = createAsyncThunk(
  "services/add",
  async (data) => {
    const res = await api.post("/services", data);
    return res.data.data;
  }
);

/* Toggle active */
export const toggleService = createAsyncThunk(
  "services/toggle",
  async (id) => {
    await api.patch(`/services/${id}/toggle`);
    return id;
  }
);

const servicesSlice = createSlice({
  name: "services",
  initialState: {
    items: [],
    loading: false
  },
  extraReducers: builder => {
    builder
      .addCase(fetchServices.pending, state => {
        state.loading = true;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(addService.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(toggleService.fulfilled, (state, action) => {
        const s = state.items.find(x => x.Id === action.payload);
        if (s) s.IsActive = !s.IsActive;
      });
  }
});

export default servicesSlice.reducer;
