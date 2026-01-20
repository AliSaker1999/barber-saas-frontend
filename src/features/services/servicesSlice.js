import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Fetch tenant services */
export const fetchServices = createAsyncThunk(
  "services/fetch",
  async () => {
    const res = await api.get("/services");
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
  async ({ id, isActive }) => {
    await api.patch(`/services/${id}/status`, { isActive });
    return { id, isActive };
  }
);

/* Delete service */
export const deleteService = createAsyncThunk(
  "services/delete",
  async (id) => {
    await api.delete(`/services/${id}`);
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
        const s = state.items.find(x => x.Id === action.payload.id);
        if (s) s.IsActive = action.payload.isActive;
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.items = state.items.filter(x => x.Id !== action.payload);
      });
  }
});

export default servicesSlice.reducer;
