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
export const updateService = createAsyncThunk(
  "services/update",
  async ({ serviceId, updates }, thunkAPI) => {
    try {
      const res = await api.patch(`/services/${serviceId}`, updates);
      return res.data.data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.message || "Failed to update service"
      );
    }
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
      .addCase(updateService.fulfilled, (state, action) => {
        const idx = state.items.findIndex(x => x.Id === action.payload.Id);
        if (idx >= 0) {
          state.items[idx] = action.payload;
        }
      })
      .addCase(deleteService.fulfilled, (state, action) => {
        state.items = state.items.filter(x => x.Id !== action.payload);
      });
  }
});

export default servicesSlice.reducer;
