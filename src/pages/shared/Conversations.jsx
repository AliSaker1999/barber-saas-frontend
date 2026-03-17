import { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchConversations,
  fetchConversation,
  fetchMessages,
  openConversationFromInbox,
  showInbox,
  addOptimisticMessage,
  sendMessage,
  markAsRead
} from "../../features/chat/chatSlice";
import { useI18n } from "../../i18n";

export default function ConversationsPage() {
  const dispatch = useDispatch();
  const { t, isRTL } = useI18n();
  const { user } = useSelector((state) => state.auth);
  const { conversations, activeConversationId, messages, loading, activeDetails } = useSelector((state) => state.chat);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const [mobileShowMessages, setMobileShowMessages] = useState(false);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeConversationId) setMobileShowMessages(true);
  }, [activeConversationId]);

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

  const handleBack = () => {
    setMobileShowMessages(false);
    dispatch(showInbox());
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

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const peerName = activeDetails?.peerName || t("messages_title");

  return (
    <div className="h-[calc(100dvh-10rem)] md:h-[calc(100vh-8rem)] bg-app-surface rounded-2xl border border-app-border shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* Conversation List — hidden on mobile when viewing messages */}
      <aside className={`${mobileShowMessages ? "hidden md:flex" : "flex"} w-full md:w-[340px] flex-col ${isRTL ? "md:border-l" : "md:border-r"} border-app-border bg-app-surface`}>
        <div className="p-4 border-b border-app-border">
          <h1 className="text-xl font-black text-app-text flex items-center gap-2">
            <svg className="w-5 h-5 text-app-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            {t("conversations")}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {sortedConversations.map((conv) => {
            const name = user?.roles?.includes("CUSTOMER") ? conv.BarberName : conv.CustomerName;
            const isActive = conv.Id === activeConversationId;
            const initial = name?.[0]?.toUpperCase() || "?";
            return (
              <button
                key={conv.Id}
                type="button"
                onClick={() => handleSelectConversation(conv)}
                className={`w-full rounded-xl p-3 flex items-center gap-3 transition-all ${isRTL ? "text-right" : "text-left"} ${
                  isActive
                    ? "bg-app-accent/10 border border-app-accent/30"
                    : "hover:bg-app-surface-2 border border-transparent"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  isActive ? "bg-app-accent text-white" : "bg-app-surface-2 text-app-text"
                }`}>
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-app-text truncate">{name}</p>
                    {(conv.UnreadCount || 0) > 0 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-app-accent text-white shrink-0">
                        {conv.UnreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-app-muted truncate mt-0.5">{conv.LastMessage || t("no_conversations")}</p>
                </div>
              </button>
            );
          })}

          {!loading && sortedConversations.length === 0 && (
            <div className="text-center py-16">
              <svg className="w-12 h-12 mx-auto text-app-muted/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <p className="text-sm text-app-muted font-medium">{t("no_conversations")}</p>
              <p className="text-xs text-app-muted/60 mt-1">{t("start_chat")}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Messages Panel — full-screen on mobile when active */}
      <section className={`${mobileShowMessages ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-app-border bg-app-surface flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-app-surface-2 transition"
          >
            <svg className={`w-5 h-5 text-app-text ${isRTL ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {activeConversationId ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-app-accent/15 flex items-center justify-center text-app-accent font-bold text-sm">
                {peerName?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <h2 className="font-bold text-app-text text-sm">{peerName}</h2>
                <p className="text-[10px] text-app-muted">{t("chat")}</p>
              </div>
            </div>
          ) : (
            <h2 className="font-bold text-app-muted text-sm">{t("select_conversation")}</h2>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-app-bg">
          {activeConversationId ? (
            <>
              {messages.length === 0 && !loading && (
                <div className="text-center py-12 text-app-muted text-sm">{t("start_chat")}</div>
              )}
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === user.id;
                const showTime = idx === messages.length - 1 || messages[idx + 1]?.senderId !== msg.senderId;
                return (
                  <div key={msg.id || msg.Id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[80%] sm:max-w-[65%]">
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? "bg-app-accent text-white rounded-br-md"
                            : "bg-app-surface text-app-text border border-app-border rounded-bl-md"
                        } ${msg.pending ? "opacity-60" : ""}`}
                      >
                        {msg.content || msg.Content}
                      </div>
                      {showTime && (msg.createdAt || msg.CreatedAt) && (
                        <p className={`text-[10px] text-app-muted mt-1 ${isMe ? (isRTL ? "text-left" : "text-right") : (isRTL ? "text-right" : "text-left")}`}>
                          {formatTime(msg.createdAt || msg.CreatedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <svg className="w-16 h-16 text-app-muted/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <p className="text-app-muted font-medium">{t("select_conversation")}</p>
              <p className="text-xs text-app-muted/60 mt-1">{t("select_conversation_prompt")}</p>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-app-border bg-app-surface flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!activeConversationId}
            placeholder={activeConversationId ? t("type_message") : t("select_conversation")}
            className="flex-1 rounded-full bg-app-surface-2 border border-app-border px-4 py-2.5 text-sm focus:ring-2 focus:ring-app-accent/30 focus:border-app-accent outline-none disabled:opacity-50 transition"
            aria-label={t("type_message")}
          />
          <button
            type="submit"
            disabled={!activeConversationId || !input.trim()}
            className="w-10 h-10 rounded-full bg-app-accent text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition active:scale-95 shrink-0"
          >
            <svg className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </section>
    </div>
  );
}
