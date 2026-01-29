import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchConversation = createAsyncThunk(
  "chat/fetchConversation",
  async ({ barberId, customerId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/chat`, {
        params: { barberId, customerId }
      });
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (conversationId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/chat/${conversationId}/messages`);
      return { conversationId, messages: response.data.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/chat/conversations`);
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ conversationId, content }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/chat/${conversationId}/messages`, { content });
      return response.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

// New: Async thunk to mark messages as read
export const markAsRead = createAsyncThunk(
  "chat/markAsRead",
  async (conversationId, { rejectWithValue }) => {
    try {
      await api.patch(`/chat/${conversationId}/read`);
      return conversationId;
    } catch (err) {
       // Silent fail is fine for read receipts
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);


const chatSlice = createSlice({
  name: "chat",
  initialState: {
    isOpen: false,
    minimized: false,
    activeConversationId: null,
    messages: [], 
    conversations: [],
    loading: false,
    error: null,
    activeDetails: {
      barberId: null,
      customerId: null,
      peerName: ""
    }
  },
  reducers: {
    openChatWindow: (state, action) => {
      // action.payload: { barberId, customerId, peerName }
      state.isOpen = true;
      state.minimized = false;
      state.activeDetails = action.payload;
      state.activeConversationId = null;
      state.messages = []; // Clear previous until loaded
    },
    closeChatWindow: (state) => {
      state.isOpen = false;
      state.activeConversationId = null;
    },
    showInbox: (state) => {
      state.activeConversationId = null;
      state.activeDetails = { barberId: null, customerId: null, peerName: "" };
      state.messages = [];
    },
    minimizeChatWindow: (state) => {
        state.minimized = !state.minimized;
    },
    receiveMessage: (state, action) => {
      const message = action.payload;
      if (state.activeConversationId === message.conversationId) {
        state.messages.push(message);
      } else {
        const existing = state.conversations.find(c => c.Id === message.conversationId);
        if (existing) {
          existing.LastMessage = message.content;
          existing.LastMessageAt = message.createdAt;
          existing.UnreadCount = (existing.UnreadCount || 0) + 1;
        } else if (message.customerId || message.barberId) {
          state.conversations.unshift({
            Id: message.conversationId,
            TenantId: message.tenantId,
            CustomerId: message.customerId,
            BarberId: message.barberId,
            CustomerName: message.customerName,
            BarberName: message.barberName,
            LastMessage: message.content,
            LastMessageAt: message.createdAt,
            UnreadCount: 1
          });
        }
      }
    }
  },
  extraReducers: (builder) => {
    builder
        .addCase(fetchConversation.fulfilled, (state, action) => {
            state.activeConversationId = action.payload.Id;
            // Trigger fetch messages? In component.
        })
        .addCase(fetchMessages.fulfilled, (state, action) => {
            if (state.activeConversationId === action.payload.conversationId) {
                state.messages = action.payload.messages;
            }
        })
        .addCase(fetchConversations.fulfilled, (state, action) => {
            state.conversations = action.payload || [];
        })
        .addCase(sendMessage.fulfilled, (state, action) => {
            // Optimistic update handled or wait for socket?
            // Usually we add it immediately.
            const msg = action.payload;
            // Check if already exist (from socket race)
            if (!state.messages.find(m => m.id === msg.id)) {
                state.messages.push(msg);
            }
            const conv = state.conversations.find(c => c.Id === msg.conversationId);
            if (conv) {
              conv.LastMessage = msg.content;
              conv.LastMessageAt = msg.createdAt;
            }
        })
        .addCase(markAsRead.fulfilled, (state, action) => {
            const conversationId = action.payload;
            const conv = state.conversations.find(c => c.Id === conversationId);
            if (conv) {
              conv.UnreadCount = 0;
            }
        });
  }
});

export const { openChatWindow, closeChatWindow, minimizeChatWindow, receiveMessage, showInbox } = chatSlice.actions;
export default chatSlice.reducer;
