import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

/* Fetch barbers */
export const fetchBarbers = createAsyncThunk(
  "barbers/fetch",
  async () => {
    const res = await api.get("/barbers");
    return res.data.data;
  }
);

/* Create barber profile */
export const createBarber = createAsyncThunk(
  "barbers/create",
  async (userId) => {
    const res = await api.post("/barbers", { userId });
    return res.data.data;
  }
);

/* Assign service */
export const assignService = createAsyncThunk(
  "barbers/assignService",
  async ({ barberId, serviceId }) => {
    await api.post(`/barbers/${barberId}/services`, { serviceId });
    return { barberId, serviceId };
  }
);

export const toggleBarberService = createAsyncThunk(
  "barbers/toggleService",
  async ({ barberId, serviceId }) => {
    await api.post(`/barbers/${barberId}/services`, { serviceId });
    return { barberId, serviceId };
  }
);

export const toggleAvailability = createAsyncThunk(
  "barbers/toggleAvailability",
  async ({ barberId, isAvailable }) => {
    await api.patch(`/barbers/${barberId}/availability`, {
      isAvailable
    });
    return { barberId, isAvailable };
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
