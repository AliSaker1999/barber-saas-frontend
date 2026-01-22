import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Fetch barbers */
export const fetchBarbers = createAsyncThunk(
  "barbers/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/barbers");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch barbers");
    }
  }
);

/* Create barber profile */
export const createBarber = createAsyncThunk(
  "barbers/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post("/barbers", data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create barber");
    }
  }
);


/* Assign service */
export const assignService = createAsyncThunk(
  "barbers/assignService",
  async ({ barberId, serviceId }, { rejectWithValue }) => {
    try {
      await api.post(`/barbers/${barberId}/services`, { serviceId });
      return { barberId, serviceId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to assign service");
    }
  }
);

export const toggleBarberService = createAsyncThunk(
  "barbers/toggleService",
  async ({ barberId, serviceId }, { rejectWithValue }) => {
    try {
      await api.post(`/barbers/${barberId}/services`, { serviceId });
      return { barberId, serviceId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to toggle service");
    }
  }
);

export const toggleAvailability = createAsyncThunk(
  "barbers/toggleAvailability",
  async ({ barberId, isAvailable }, { rejectWithValue }) => {
    try {
      await api.patch(`/barbers/${barberId}/availability`, {
        isAvailable
      });
      return { barberId, isAvailable };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update availability");
    }
  }
);

const barbersSlice = createSlice({
  name: "barbers",
  initialState: {
    items: []
  },
  extraReducers: builder => {
    builder
      .addCase(fetchBarbers.fulfilled, (s, a) => {
        s.items = a.payload;
      })
      .addCase(toggleBarberService.fulfilled, (s, a) => {
      const barber = s.items.find(b => b.Id === a.payload.barberId);
      if (!barber) return;

      barber.ServiceIds = barber.ServiceIds || [];

      barber.ServiceIds = barber.ServiceIds.includes(a.payload.serviceId)
        ? barber.ServiceIds.filter(id => id !== a.payload.serviceId)
        : [...barber.ServiceIds, a.payload.serviceId];
    })
    .addCase(toggleAvailability.fulfilled, (state, action) => {
  const barber = state.items.find(
    b => b.Id === action.payload.barberId
  );
  if (barber) {
    barber.IsAvailable = action.payload.isAvailable;
  }
});
  }
});

export default barbersSlice.reducer;
