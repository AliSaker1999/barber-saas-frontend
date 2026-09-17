import { useEffect, useMemo, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
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
import Icon from "../../components/ui/Icon";
import { IconButton } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Primitives";
import { EmptyState, InlineError } from "../../components/ui/States";

/*
 * Messages between a customer and a shop.
 *
 * Rendered by both shells, which is how it went unnoticed in the per-area
 * sweeps — it lives in pages/shared rather than pages/customer or
 * pages/company, and was the last legacy-styled screen either of them could
 * reach.
 *
 * The defect underneath the palette: send cleared the input, added an
 * optimistic bubble, and dispatched without ever looking at the result. The
 * slice removes the optimistic message when the request fails, so a failed
 * send made the message disappear along with the text the person had typed,
 * with nothing said. On Lebanese mobile data that is not a rare path. The text
 * now comes back to the box so it can simply be sent again.
 */
export default function ConversationsPage() {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const { user } = useAppSelector((state) => state.auth);
  const { conversations, activeConversationId, messages, loading, activeDetails } =
    useAppSelector((state) => state.chat);

  const [input, setInput] = useState("");
  const [sendError, setSendError] = useState("");
  const messagesEndRef = useRef(null);
  const mobileShowMessages = Boolean(activeConversationId);

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
          customerId: activeDetails.customerId
        })
      );
    }
  }, [activeConversationId, activeDetails, dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isCustomer = user?.roles?.includes("CUSTOMER");

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

  async function handleSend(event) {
    event.preventDefault();
    if (!activeConversationId || !input.trim()) return;

    const content = input.trim();
    const clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setInput("");
    setSendError("");
    dispatch(
      addOptimisticMessage({
        conversationId: activeConversationId,
        senderId: user.id,
        content,
        clientRequestId
      })
    );

    const result = await dispatch(
      sendMessage({ conversationId: activeConversationId, content, clientRequestId })
    );

    if (sendMessage.rejected.match(result)) {
      /* The slice has already taken the optimistic bubble away. Give the words
         back rather than losing them. */
      setInput(content);
      setSendError(t("message_not_sent"));
    }
  }

  const formatTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const peerName = activeDetails?.peerName || t("messages_title");

  return (
    <div className="h-[calc(100dvh-10rem)] md:h-[calc(100vh-8rem)] bg-surface-raised rounded-card border border-line-subtle overflow-hidden flex flex-col md:flex-row">
      <aside
        className={`${
          mobileShowMessages ? "hidden md:flex" : "flex"
        } w-full md:w-[340px] flex-col md:border-e border-line-subtle`}
      >
        <div className="p-4 border-b border-line-subtle">
          <h1 className="text-h3 text-content-primary flex items-center gap-2">
            <Icon name="message" size={18} className="text-brand-gold-text" />
            {t("conversations")}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {sortedConversations.map((conversation) => {
            const name = isCustomer ? conversation.BarberName : conversation.CustomerName;
            const isActive = conversation.Id === activeConversationId;

            return (
              <button
                key={conversation.Id}
                type="button"
                onClick={() =>
                  dispatch(
                    openConversationFromInbox({
                      conversationId: conversation.Id,
                      barberId: conversation.BarberId,
                      customerId: conversation.CustomerId,
                      peerName: name
                    })
                  )
                }
                className={`press w-full rounded-card p-3 flex items-center gap-3 text-start border ${
                  isActive
                    ? "bg-brand-gold-soft border-brand-gold"
                    : "bg-surface-raised border-transparent"
                }`}
              >
                <Avatar name={name || "?"} size={40} />
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-body-sm font-semibold text-content-primary truncate">
                      {name}
                    </span>
                    {conversation.UnreadCount > 0 ? (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-pill bg-brand-gold text-content-on-gold text-caption font-bold leading-5 text-center tnum">
                        {conversation.UnreadCount}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-caption text-content-muted truncate mt-0.5">
                    {conversation.LastMessage || t("start_chat")}
                  </span>
                </span>
              </button>
            );
          })}

          {!loading && !sortedConversations.length ? (
            <EmptyState
              icon="message"
              title={t("no_conversations")}
              description={t("start_chat")}
            />
          ) : null}
        </div>
      </aside>

      <section
        className={`${
          mobileShowMessages ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0`}
      >
        <div className="p-3 border-b border-line-subtle flex items-center gap-2">
          <span className="md:hidden">
            <IconButton
              icon="chevron-left"
              label={t("back")}
              variant="ghost"
              onClick={() => dispatch(showInbox())}
            />
          </span>

          {activeConversationId ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={peerName} size={36} />
              <div className="min-w-0">
                <h2 className="text-body font-semibold text-content-primary truncate">
                  {peerName}
                </h2>
                <p className="text-caption text-content-muted">{t("chat")}</p>
              </div>
            </div>
          ) : (
            <h2 className="text-body font-semibold text-content-muted">
              {t("select_conversation")}
            </h2>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-base">
          {activeConversationId ? (
            <>
              {!messages.length && !loading ? (
                <p className="text-center py-10 text-body-sm text-content-muted">
                  {t("start_chat")}
                </p>
              ) : null}

              {messages.map((message, index) => {
                const isMe = message.senderId === user.id;
                const showTime =
                  index === messages.length - 1 ||
                  messages[index + 1]?.senderId !== message.senderId;

                return (
                  <div
                    key={message.id || message.Id || index}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%] sm:max-w-[65%]">
                      <div
                        className={`rounded-card px-3.5 py-2.5 text-body-sm leading-relaxed ${
                          isMe
                            ? "bg-brand-gold text-content-on-gold"
                            : "bg-surface-raised text-content-primary border border-line-subtle"
                        } ${message.pending ? "opacity-60" : ""}`}
                      >
                        {message.content || message.Content}
                      </div>
                      {showTime && (message.createdAt || message.CreatedAt) ? (
                        <p
                          className={`text-caption text-content-muted mt-1 tnum ${
                            isMe ? "text-end" : "text-start"
                          }`}
                        >
                          {formatTime(message.createdAt || message.CreatedAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <EmptyState
              icon="message"
              title={t("select_conversation")}
              description={t("select_conversation_prompt")}
            />
          )}
        </div>

        {sendError ? (
          <div className="px-3 pt-3">
            <InlineError message={sendError} />
          </div>
        ) : null}

        <form
          onSubmit={handleSend}
          className="p-3 border-t border-line-subtle flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setSendError("");
            }}
            disabled={!activeConversationId}
            placeholder={activeConversationId ? t("type_message") : t("select_conversation")}
            aria-label={t("type_message")}
            className="flex-1 min-h-[44px] rounded-pill bg-surface-sunken border border-line-subtle px-4 text-body-sm text-content-primary placeholder:text-content-muted outline-none focus:border-brand-gold disabled:opacity-50"
          />
          <IconButton
            icon="navigate"
            label={t("send")}
            type="submit"
            disabled={!activeConversationId || !input.trim()}
          />
        </form>
      </section>
    </div>
  );
}
