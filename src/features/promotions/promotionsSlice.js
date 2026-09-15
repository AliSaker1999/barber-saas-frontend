import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchPromotions = createAsyncThunk(
  "promotions/fetchPromotions",
  async (tenantId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/promotions/tenant/${tenantId}`);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load promotions");
    }
  }
);

export const fetchAdminPromotions = createAsyncThunk(
  "promotions/fetchAdminPromotions",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/promotions");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load promotions");
    }
  }
);

export const createPromotion = createAsyncThunk(
  "promotions/createPromotion",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.post("/promotions", data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create promotion");
    }
  }
);

export const updatePromotion = createAsyncThunk(
  "promotions/updatePromotion",
  async ({ id, ...data }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/promotions/${id}`, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update promotion");
    }
  }
);

export const deletePromotion = createAsyncThunk(
  "promotions/deletePromotion",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/promotions/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete promotion");
    }
  }
);

const promotionsSlice = createSlice({
  name: "promotions",
  initialState: {
    items: [],
    adminItems: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    clearPromotions: (state) => {
      state.items = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPromotions.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPromotions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchPromotions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(fetchAdminPromotions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.adminItems = action.payload;
      })
      .addCase(createPromotion.fulfilled, (state, action) => {
        state.adminItems.unshift(action.payload);
      })
      .addCase(updatePromotion.fulfilled, (state, action) => {
        const idx = state.adminItems.findIndex((p) => p.Id === action.payload.Id);
        if (idx >= 0) state.adminItems[idx] = action.payload;
      })
      .addCase(deletePromotion.fulfilled, (state, action) => {
        state.adminItems = state.adminItems.filter((p) => p.Id !== action.payload);
      })
      /* The server refuses to delete an offer that has already been redeemed
         and says how many times. Without this the thunk rejected into silence
         and the row simply stayed put with no explanation. */
      .addCase(deletePromotion.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(createPromotion.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updatePromotion.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchAdminPromotions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAdminPromotions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearPromotions } = promotionsSlice.actions;
export default promotionsSlice.reducer;
