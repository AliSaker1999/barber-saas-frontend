import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchMyProfile = createAsyncThunk(
  "customerProfile/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/customers/me");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateMyProfile = createAsyncThunk(
  "customerProfile/update",
  async (data, { rejectWithValue }) => {
    try {
      await api.patch("/customers/me", data);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const customerProfileSlice = createSlice({
  name: "customerProfile",
  initialState: {
    profile: null,
    loading: false,
    updateSuccess: false,
    error: null
  },
  reducers: {
    resetProfileStatus: (state) => {
      state.updateSuccess = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchMyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateMyProfile.pending, (state) => {
        state.loading = true;
        state.updateSuccess = false;
      })
      .addCase(updateMyProfile.fulfilled, (state) => {
        state.loading = false;
        state.updateSuccess = true;
      })
      .addCase(updateMyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { resetProfileStatus } = customerProfileSlice.actions;
export default customerProfileSlice.reducer;
