import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchConversations,
  fetchConversation,
  fetchMessages,
  openConversationFromInbox,
  addOptimisticMessage,
  sendMessage,
  markAsRead
} from "../../features/chat/chatSlice";

export default function ConversationsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { conversations, activeConversationId, messages, loading, activeDetails } = useSelector(state => state.chat);
  const [input, setInput] = useState("");

  useEffect(() => {
    dispatch(fetchConversations());
  }, [dispatch]);

  useEffect(() => {
    if (activeConversationId) {
      dispatch(fetchMessages(activeConversationId));
      dispatch(markAsRead(activeConversationId));
    }
  }, [activeConversationId, dispatch]);

  useEffect(() => {
    if (!activeConversationId && activeDetails?.barberId && activeDetails?.customerId) {
      dispatch(fetchConversation({
        barberId: activeDetails.barberId,
        customerId: activeDetails.customerId
      }));
    }
  }, [activeConversationId, activeDetails, dispatch]);

  const sortedConversations = useMemo(() => {
    return [...(conversations || [])].sort((a, b) => {
      const aUnread = a.UnreadCount || 0;
      const bUnread = b.UnreadCount || 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      const aDate = new Date(a.LastMessageAt || a.UpdatedAt || 0).getTime();
      const bDate = new Date(b.LastMessageAt || b.UpdatedAt || 0).getTime();
      return bDate - aDate;
    });
  }, [conversations]);

  const handleSelectConversation = (conv) => {
    const peerName = user?.roles?.includes("CUSTOMER") ? conv.BarberName : conv.CustomerName;
    dispatch(openConversationFromInbox({
      conversationId: conv.Id,
      barberId: conv.BarberId,
      customerId: conv.CustomerId,
      peerName
    }));
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!activeConversationId || !input.trim()) return;

    const trimmedInput = input.trim();
    const clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setInput("");
    dispatch(addOptimisticMessage({
      conversationId: activeConversationId,
      senderId: user.id,
      content: trimmedInput,
      clientRequestId
    }));

    await dispatch(sendMessage({
      conversationId: activeConversationId,
      content: trimmedInput,
      clientRequestId
    }));
  };

  return (
    <div className="h-[calc(100dvh-15rem)] md:h-[calc(100vh-11rem)] bg-white dark:bg-black rounded-3xl border border-gray-100 dark:border-red-900/40 shadow-sm overflow-hidden flex flex-col md:flex-row">
      <aside className="w-full md:w-[320px] border-r-0 md:border-r border-b md:border-b-0 border-gray-100 dark:border-red-900/40 bg-gray-50/60 dark:bg-black">
        <div className="p-4 border-b border-gray-100 dark:border-red-900/40 bg-white dark:bg-black">
          <h1 className="text-lg font-black text-gray-900">Conversations</h1>
        </div>
        <div className="p-3 space-y-2 overflow-y-auto max-h-[220px] md:max-h-[calc(100%-65px)]">
          {sortedConversations.map(conv => {
            const peerName = user?.roles?.includes("CUSTOMER") ? conv.BarberName : conv.CustomerName;
            const isActive = conv.Id === activeConversationId;
            return (
              <button
                key={conv.Id}
                type="button"
                onClick={() => handleSelectConversation(conv)}
                className={`w-full text-left rounded-2xl p-3 border transition ${isActive ? "bg-red-50 border-red-200" : "bg-white border-gray-100 hover:border-gray-200"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-gray-900 truncate">{peerName}</p>
                  {(conv.UnreadCount || 0) > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
                      {conv.UnreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-1">{conv.LastMessage || "No messages yet"}</p>
              </button>
            );
          })}
          {!loading && sortedConversations.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-12">No conversations yet.</div>
          )}
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0 relative">
        <div className="p-4 border-b border-gray-100 dark:border-red-900/40 bg-white dark:bg-black">
          <h2 className="font-black text-gray-900">
            {activeConversationId ? "Messages" : "Select a conversation"}
          </h2>
        </div>

        <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50 dark:bg-black space-y-2 pb-24 md:pb-4">
          {activeConversationId ? (
            messages.map(msg => {
              const isMe = msg.senderId === user.id;
              return (
                <div key={msg.id || msg.Id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm font-medium ${isMe ? "bg-red-600 text-white" : "bg-white dark:bg-black text-gray-800 border border-gray-100 dark:border-red-900/40"}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">Choose a conversation from the list.</div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-gray-100 dark:border-red-900/40 bg-white dark:bg-black flex gap-2 sticky bottom-[calc(env(safe-area-inset-bottom)+88px)] md:bottom-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!activeConversationId}
            placeholder={activeConversationId ? "Write your message here..." : "Select a conversation first"}
            className="flex-1 rounded-xl bg-gray-100 dark:bg-black border border-transparent dark:border-red-900/40 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-60"
            aria-label="Write your message"
          />
          <button
            type="submit"
            disabled={!activeConversationId || !input.trim()}
            className="px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
