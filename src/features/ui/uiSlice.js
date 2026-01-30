import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    lastSyncAt: new Date().toISOString(),
  },
  reducers: {
    setOnlineStatus(state, action) {
      state.isOnline = action.payload;
      if (action.payload) {
        state.lastSyncAt = new Date().toISOString();
      }
    },
    updateLastSync(state) {
      state.lastSyncAt = new Date().toISOString();
    }
  },
  extraReducers: (builder) => {
    // Automatically update lastSyncAt on successful data fetches
    builder.addMatcher(
      (action) => action.type.endsWith('/fulfilled') && 
                 (action.type.includes('fetch') || action.type.includes('get') || action.type.includes('find')),
      (state) => {
        state.lastSyncAt = new Date().toISOString();
      }
    );
  }
});

export const { setOnlineStatus, updateLastSync } = uiSlice.actions;
export default uiSlice.reducer;
