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
    error: null
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
        connectSocket(action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || "Login failed";
      });
  }
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
