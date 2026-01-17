import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";
import { connectSocket, disconnectSocket } from "../../services/socket";

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.data.token);
    return res.data.data;
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    loading: false
  },
  reducers: {
    logout(state) {
      state.user = null;
      localStorage.removeItem("token");
      disconnectSocket();
    }
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => {
        state.loading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        connectSocket(action.payload.token);
      });
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
