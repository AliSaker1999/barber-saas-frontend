import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchCompanyProfile = createAsyncThunk(
  "company/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/tenants/profile");
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateCompanyProfile = createAsyncThunk(
  "company/updateProfile",
  async (data, { rejectWithValue }) => {
    try {
      const res = await api.patch("/tenants/profile", data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const companySlice = createSlice({
  name: "company",
  initialState: {
    profile: null,
    loading: false,
    error: null,
    updateSuccess: false
  },
  reducers: {
    resetUpdateSuccess: (state) => {
      state.updateSuccess = false;
    }
  },
  extraReducers: (builder) => {
    builder
      /* Fetch */
      .addCase(fetchCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCompanyProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      /* Update */
      .addCase(updateCompanyProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateCompanyProfile.fulfilled, (state) => {
        state.loading = false;
        state.updateSuccess = true;
      })
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { resetUpdateSuccess } = companySlice.actions;
export default companySlice.reducer;
