
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async ({ page = 1 } = {}, { rejectWithValue }) => {
    try {
      const res = await api.get("/notifications", { params: { page } });
      const { data, hasMore, unreadCount } = res.data;
      return { items: data, page, hasMore, unreadCount };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch notifications");
    }
  }
);

export const markAsRead = createAsyncThunk(
  "notifications/markRead",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { rejectWithValue }) => {
    try {
      await api.patch(`/notifications/all/read`);
      return 'all';
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    items: [],
    loading: false,
    unreadCount: 0,
    hasMore: false,
    page: 1,
    error: null
  },
  reducers: {
    addNotification: (state, action) => {
      // Avoid duplicates if possible (check last 5)
      const exists = state.items.slice(0, 5).some(n => n.Id === action.payload.Id && action.payload.Id);
      if (exists) return;

      state.items.unshift({
        IsRead: false,
        CreatedAt: new Date().toISOString(),
        ...action.payload
      });
      state.unreadCount += 1;
    }
  },
  extraReducers: (builder) => {
    builder.addCase(fetchNotifications.pending, (state) => {
      state.loading = true;
      state.error = null;
    });

    builder.addCase(fetchNotifications.fulfilled, (state, action) => {
      const { items, page, hasMore, unreadCount } = action.payload;
      state.loading = false;
      // page 1 replaces (a fresh mount or a pull-to-refresh); anything after
      // that is a "Load more" append.
      state.items = page === 1 ? items : [...state.items, ...items];
      state.page = page;
      state.hasMore = hasMore;
      state.unreadCount = unreadCount;
    });

    builder.addCase(fetchNotifications.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || "Failed to fetch notifications";
    });
    builder.addCase(markAsRead.fulfilled, (state, action) => {
      const item = state.items.find(n => n.Id === action.payload);
      if (item && !item.IsRead) {
        item.IsRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });
    builder.addCase(markAllAsRead.fulfilled, (state) => {
      state.items.forEach(i => i.IsRead = true);
      state.unreadCount = 0;
    });
  }
});

export const { addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
