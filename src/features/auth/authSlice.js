import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import { connectSocket, disconnectSocket } from "../../services/socket";

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.data.user));
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Invalid email or password");
    }
  }
);

export const registerCustomer = createAsyncThunk(
  "auth/registerCustomer",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("/auth/register/customer", payload);
      return res.data?.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Registration failed");
    }
  }
);

export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      return true;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Failed to change password"
      );
    }
  }
);

const loadStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: loadStoredUser(),
    isLoading: false,
    token: localStorage.getItem("token") || null,
    error: null,
    changePasswordLoading: false
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      disconnectSocket();
    },
    updateUserVerification(state) {
      if (state.user) {
        state.user.isPhoneVerified = true;
        localStorage.setItem("user", JSON.stringify(state.user));
      }
    },
    clearAuthError(state) {
      state.error = null;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
        connectSocket(action.payload.token, action.payload.user.id);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Login failed";
      })
      .addCase(registerCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerCustomer.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(registerCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Registration failed";
      })
      .addCase(changePassword.pending, (state) => {
        state.changePasswordLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.changePasswordLoading = false;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.changePasswordLoading = false;
        state.error = action.payload || "Failed to change password";
      });
  }
});

export const { logout, clearAuthError, updateUserVerification } = authSlice.actions;
export default authSlice.reducer;
