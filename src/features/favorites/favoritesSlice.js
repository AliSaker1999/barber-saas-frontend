import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchFavorites = createAsyncThunk(
  "favorites/fetchFavorites",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/favorites");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load favorites");
    }
  }
);

export const toggleFavorite = createAsyncThunk(
  "favorites/toggleFavorite",
  async ({ type, targetId }, { rejectWithValue }) => {
    try {
      const res = await api.post("/favorites/toggle", { type, targetId });
      return { ...res.data.data, type, targetId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update favorite");
    }
  }
);

const favoritesSlice = createSlice({
  name: "favorites",
  initialState: {
    items: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFavorites.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { isFavorite, type, targetId } = action.payload;
        if (!isFavorite) {
          // Remove from list
          state.items = state.items.filter((f) => {
            if (type === "SHOP") return f.TenantId !== targetId;
            return f.BarberId !== targetId;
          });
        }
        // If added, we'll refetch the full list
      });
  },
});

export default favoritesSlice.reducer;
