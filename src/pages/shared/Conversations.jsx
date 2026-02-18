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
  const { user } = useSelector((state) => state.auth);
  const { conversations, activeConversationId, messages, loading, activeDetails } = useSelector((state) => state.chat);
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
      dispatch(
        fetchConversation({
          barberId: activeDetails.barberId,
          customerId: activeDetails.customerId,
        })
      );
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
    dispatch(
      openConversationFromInbox({
        conversationId: conv.Id,
        barberId: conv.BarberId,
        customerId: conv.CustomerId,
        peerName,
      })
    );
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!activeConversationId || !input.trim()) return;

    const trimmedInput = input.trim();
    const clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setInput("");
    dispatch(
      addOptimisticMessage({
        conversationId: activeConversationId,
        senderId: user.id,
        content: trimmedInput,
        clientRequestId,
      })
    );

    await dispatch(
      sendMessage({
        conversationId: activeConversationId,
        content: trimmedInput,
        clientRequestId,
      })
    );
  };

  return (
    <div className="h-[calc(100dvh-15rem)] md:h-[calc(100vh-11rem)] bg-app-bg rounded-3xl border border-app-border shadow-sm overflow-hidden flex flex-col md:flex-row">
      <aside className="w-full md:w-[320px] border-r-0 md:border-r border-b md:border-b-0 border-app-border bg-app-surface">
        <div className="p-4 border-b border-app-border bg-app-surface">
          <h1 className="text-lg font-black text-app-text">Conversations</h1>
        </div>

        <div className="p-3 space-y-2 overflow-y-auto max-h-[220px] md:max-h-[calc(100%-65px)]">
          {sortedConversations.map((conv) => {
            const peerName = user?.roles?.includes("CUSTOMER") ? conv.BarberName : conv.CustomerName;
            const isActive = conv.Id === activeConversationId;
            return (
              <button
                key={conv.Id}
                type="button"
                onClick={() => handleSelectConversation(conv)}
                className={`w-full text-left rounded-2xl p-3 border transition ${
                  isActive ? "bg-app-surface-2 border-app-border" : "bg-app-surface border-app-border hover:border-app-border"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-app-text truncate">{peerName}</p>
                  {(conv.UnreadCount || 0) > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-app-error text-white">{conv.UnreadCount}</span>
                  )}
                </div>
                <p className="text-xs text-app-muted truncate mt-1">{conv.LastMessage || "No messages yet"}</p>
              </button>
            );
          })}

          {!loading && sortedConversations.length === 0 && <div className="text-center text-sm text-app-muted py-12">No conversations yet.</div>}
        </div>
      </aside>

      <section className="flex-1 flex flex-col min-w-0 relative">
        <div className="p-4 border-b border-app-border bg-app-surface">
          <h2 className="font-black text-app-text">{activeConversationId ? "Messages" : "Select a conversation"}</h2>
        </div>

        <div className="flex-1 p-4 overflow-y-auto bg-app-bg space-y-2 pb-44 md:pb-28">
          {activeConversationId ? (
            messages.map((msg) => {
              const isMe = msg.senderId === user.id;
              return (
                <div key={msg.id || msg.Id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm font-medium ${
                      isMe ? "bg-app-primary-solid text-app-text" : "bg-app-surface text-app-text border border-app-border"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-app-muted">Choose a conversation from the list.</div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-app-border bg-app-surface flex gap-2 sticky bottom-[calc(env(safe-area-inset-bottom)+88px)] md:bottom-0 z-50 shadow-md">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!activeConversationId}
            placeholder={activeConversationId ? "Write your message here..." : "Select a conversation first"}
            className="flex-1 rounded-xl bg-app-surface-2 border border-app-border px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-app-primary outline-none disabled:opacity-60"
            aria-label="Write your message"
          />
          <button type="submit" disabled={!activeConversationId || !input.trim()} className="px-4 py-3 rounded-xl bg-app-primary-solid text-app-text font-bold text-sm disabled:opacity-50">
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
