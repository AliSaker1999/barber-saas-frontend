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
  async ({ conversationId, content, clientRequestId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/chat/${conversationId}/messages`, { content });
      return {
        ...response.data.data,
        clientRequestId
      };
    } catch (err) {
      return rejectWithValue({
        error: err.response?.data || err.message,
        conversationId,
        clientRequestId
      });
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
    messagesByConversation: {},
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
      state.messages = [];
    },
    openConversationFromInbox: (state, action) => {
      const { conversationId, barberId, customerId, peerName } = action.payload;
      state.isOpen = true;
      state.minimized = false;
      state.activeConversationId = conversationId;
      state.activeDetails = {
        barberId: barberId || null,
        customerId: customerId || null,
        peerName: peerName || ""
      };
      state.messages = state.messagesByConversation[conversationId] || [];
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
      const conversationId = message.conversationId;
      const normalizedMessage = {
        ...message,
        id: message.id || message.Id
      };

      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }

      const existsInCache = state.messagesByConversation[conversationId].find(
        m => (m.id || m.Id) === (normalizedMessage.id || normalizedMessage.Id)
      );
      if (!existsInCache) {
        state.messagesByConversation[conversationId].push(normalizedMessage);
      }

      if (state.activeConversationId === message.conversationId) {
        // Prevent duplicates from socket/local race
        const exists = state.messages.find(m => (m.id || m.Id) === (message.id || message.Id));
        if (!exists) {
          state.messages.push(normalizedMessage);
        }
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
    },
    addOptimisticMessage: (state, action) => {
      const { conversationId, senderId, content, clientRequestId } = action.payload;
      const optimisticId = `optimistic-${clientRequestId}`;
      const optimisticMessage = {
        id: optimisticId,
        conversationId,
        senderId,
        content,
        isRead: false,
        createdAt: new Date().toISOString(),
        pending: true,
        clientRequestId
      };

      if (!state.messagesByConversation[conversationId]) {
        state.messagesByConversation[conversationId] = [];
      }

      state.messagesByConversation[conversationId].push(optimisticMessage);
      if (state.activeConversationId === conversationId) {
        state.messages.push(optimisticMessage);
      }

      const conv = state.conversations.find(c => c.Id === conversationId);
      if (conv) {
        conv.LastMessage = content;
        conv.LastMessageAt = optimisticMessage.createdAt;
      }
    }
  },
  extraReducers: (builder) => {
    builder
        .addCase(fetchConversation.fulfilled, (state, action) => {
            state.activeConversationId = action.payload.Id;
          state.messages = state.messagesByConversation[action.payload.Id] || [];
        })
        .addCase(fetchMessages.fulfilled, (state, action) => {
          state.messagesByConversation[action.payload.conversationId] = action.payload.messages;
          if (state.activeConversationId === action.payload.conversationId) {
            state.messages = action.payload.messages;
          }
        })
        .addCase(fetchConversations.fulfilled, (state, action) => {
            state.conversations = action.payload || [];
        })
        .addCase(sendMessage.fulfilled, (state, action) => {
            const msg = action.payload;
            const conversationId = msg.conversationId;

            const cleanConversation = (arr) =>
              arr.filter(m => m.clientRequestId !== msg.clientRequestId && !(m.pending && m.content === msg.content));

            if (state.messagesByConversation[conversationId]) {
              state.messagesByConversation[conversationId] = cleanConversation(state.messagesByConversation[conversationId]);
            }

            if (!state.messagesByConversation[conversationId]) {
              state.messagesByConversation[conversationId] = [];
            }

            const cacheExists = state.messagesByConversation[conversationId].find(m => (m.id || m.Id) === (msg.id || msg.Id));
            if (!cacheExists) {
              state.messagesByConversation[conversationId].push(msg);
            }

            if (state.activeConversationId === conversationId) {
              state.messages = cleanConversation(state.messages);
              if (!state.messages.find(m => (m.id || m.Id) === (msg.id || msg.Id))) {
                state.messages.push(msg);
              }
            }

            const conv = state.conversations.find(c => c.Id === msg.conversationId);
            if (conv) {
              conv.LastMessage = msg.content;
              conv.LastMessageAt = msg.createdAt;
            }
        })
        .addCase(sendMessage.rejected, (state, action) => {
            const conversationId = action.payload?.conversationId;
            const clientRequestId = action.payload?.clientRequestId;
            if (!conversationId || !clientRequestId) return;

            const removeFailed = (arr) => arr.filter(m => m.clientRequestId !== clientRequestId);

            if (state.messagesByConversation[conversationId]) {
              state.messagesByConversation[conversationId] = removeFailed(state.messagesByConversation[conversationId]);
            }

            if (state.activeConversationId === conversationId) {
              state.messages = removeFailed(state.messages);
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

export const { openChatWindow, openConversationFromInbox, closeChatWindow, minimizeChatWindow, receiveMessage, showInbox, addOptimisticMessage } = chatSlice.actions;
export default chatSlice.reducer;
