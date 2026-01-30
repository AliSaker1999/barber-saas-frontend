import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const requestUserLocation = createAsyncThunk(
  "location/request",
  async (_, { rejectWithValue }) => {
    if (!navigator.geolocation) {
      return rejectWithValue("Geolocation is not supported by your browser");
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        (err) => {
          reject(rejectWithValue(err.message || "Failed to retrieve location"));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }
);

const locationSlice = createSlice({
  name: "location",
  initialState: {
    coords: null,
    accuracy: null,
    loading: false,
    error: null,
    lastUpdatedAt: null
  },
  reducers: {
    clearLocation(state) {
      state.coords = null;
      state.accuracy = null;
      state.error = null;
      state.loading = false;
      state.lastUpdatedAt = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestUserLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestUserLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.coords = {
          latitude: action.payload.latitude,
          longitude: action.payload.longitude
        };
        state.accuracy = action.payload.accuracy;
        state.lastUpdatedAt = new Date().toISOString();
      })
      .addCase(requestUserLocation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to retrieve location";
      });
  }
});

export const { clearLocation } = locationSlice.actions;
export default locationSlice.reducer;
