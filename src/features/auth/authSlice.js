import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import { connectSocket, disconnectSocket } from "../../services/socket";

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.data.user));
    return res.data.data;
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
    isLoading: false, // Changed from 'loading' to match component logic
    token: localStorage.getItem("token") || null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      disconnectSocket();
    }
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;   // ✅ FIX
        state.token = action.payload.token; // ✅ optional but correct
        connectSocket(action.payload.token);
      })
      .addCase(login.rejected, state => {
        state.isLoading = false;
      });
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
