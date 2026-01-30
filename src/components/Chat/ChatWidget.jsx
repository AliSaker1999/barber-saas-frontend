import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from "react-hot-toast";
import { 
    closeChatWindow, 
    minimizeChatWindow, 
    openChatWindow,
    showInbox,
    fetchConversation, 
    fetchMessages, 
    sendMessage,
    receiveMessage,
    markAsRead,
    fetchConversations
} from '../../features/chat/chatSlice';
import { getSocket } from '../../services/socket';

export default function ChatWidget() {
    const dispatch = useDispatch();
    const { 
        isOpen, 
        minimized, 
        activeConversationId, 
        messages, 
        activeDetails,
        conversations
    } = useSelector(state => state.chat);
    const { user } = useSelector(state => state.auth);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);
    const hasWindow = typeof window !== "undefined";
    const canUseStorage = hasWindow && typeof window.localStorage !== "undefined";
    const [viewport, setViewport] = useState({
        w: hasWindow ? window.innerWidth : 1024,
        h: hasWindow ? window.innerHeight : 768
    });

    // Draggable Logic
    const [pos, setPos] = useState(() => {
        if (canUseStorage) {
            try {
                const saved = window.localStorage.getItem('chat_widget_pos');
                if (saved) return JSON.parse(saved);
            } catch  {
                // ignore storage errors
            }
        }
        return { x: viewport.w - 80, y: viewport.h - 120 };
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragState = useRef({ startX: 0, startY: 0, originX: 0, originY: 0, moved: false });
    const isMobile = viewport.w < 640;
    const launcherSize = { w: 56, h: 56 };
    // const minimizedSize = { w: 260, h: 64 };
    // const fullSize = { w: isMobile ? viewport.w : 400, h: isMobile ? viewport.h : 600 };
    const widgetSize = launcherSize;
    const dragEnabled = !isOpen && !isMobile;

    const clampPos = (x, y) => {
        const maxX = Math.max(0, viewport.w - widgetSize.w);
        const maxY = Math.max(0, viewport.h - widgetSize.h);
        return {
            x: Math.max(0, Math.min(x, maxX)),
            y: Math.max(0, Math.min(y, maxY))
        };
    };

    const beginDrag = (clientX, clientY) => {
        if (!dragEnabled) return;
        setIsDragging(true);
        dragState.current = {
            startX: clientX,
            startY: clientY,
            originX: pos.x,
            originY: pos.y,
            moved: false
        };
    };

    const handlePointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        beginDrag(e.clientX, e.clientY);
    };

    const handleTouchStart = (e) => {
        const touch = e.touches?.[0];
        if (!touch) return;
        beginDrag(touch.clientX, touch.clientY);
    };

    const handlePointerMove = (clientX, clientY) => {
        if (!isDragging) return;
        const dx = clientX - dragState.current.startX;
        const dy = clientY - dragState.current.startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) {
            dragState.current.moved = true;
        }
        const next = clampPos(dragState.current.originX + dx, dragState.current.originY + dy);
        setPos(next);
    };

    const endDrag = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setViewport({ w, h });
            setPos(prev => {
                const maxX = Math.max(0, w - launcherSize.w);
                const maxY = Math.max(0, h - launcherSize.h);
                const nx = Math.max(0, Math.min(prev.x, maxX));
                const ny = Math.max(0, Math.min(prev.y, maxY));
                return (nx === prev.x && ny === prev.y) ? prev : { x: nx, y: ny };
            });
        };
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => {
        if (!canUseStorage) return;
        try {
            window.localStorage.setItem('chat_widget_pos', JSON.stringify(pos));
        } catch  {
            // ignore storage errors
        }
    }, [pos, canUseStorage]);

    useEffect(() => {
        const onMouseMove = (e) => handlePointerMove(e.clientX, e.clientY);
        const onMouseUp = () => {
            endDrag();
        };
        const onTouchMove = (e) => {
            const touch = e.touches?.[0];
            if (!touch) return;
            if (isDragging) e.preventDefault();
            handlePointerMove(touch.clientX, touch.clientY);
        };
        const onTouchEnd = () => {
            endDrag();
        };

        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('touchend', onTouchEnd);
        }

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, [isDragging, dragEnabled]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && activeConversationId) {
             dispatch(fetchMessages(activeConversationId));
             dispatch(markAsRead(activeConversationId));
             scrollToBottom();
        }
    }, [isOpen, activeConversationId]);

    useEffect(() => {
        if (user?.id) {
            dispatch(fetchConversations());
        }
    }, [user?.id]);

    useEffect(() => {
        if (isOpen && activeDetails.barberId && activeDetails.customerId && !activeConversationId) {
            dispatch(fetchConversation({
                barberId: activeDetails.barberId,
                customerId: activeDetails.customerId
            }));
        }
    }, [isOpen, activeDetails, activeConversationId]);
    
    useEffect(() => {
        scrollToBottom();
    }, [messages, minimized, isOpen]);

    // Socket listener
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return; 

        const handleMsg = (msg) => {
            dispatch(receiveMessage(msg));

            const isActive = msg.conversationId === activeConversationId;
            const isFromMe = msg.senderId === user?.id;

            if (isActive && !isFromMe && isOpen && !minimized) {
                dispatch(markAsRead(activeConversationId));
            }

            if (!isFromMe && (!isOpen || minimized || !isActive)) {
                toast(`New message from ${user?.roles?.includes("CUSTOMER") ? msg.barberName : msg.customerName}`);
            }
        };

        socket.on("chat:message", handleMsg);
        return () => {
            socket.off("chat:message", handleMsg);
        };
    }, [activeConversationId, minimized, isOpen, user?.id]);


    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !activeConversationId) return;

        await dispatch(sendMessage({
            conversationId: activeConversationId,
            content: input
        }));
        setInput("");
    };

    const unreadTotal = useMemo(() => {
        return (conversations || []).reduce((sum, c) => sum + (c.UnreadCount || 0), 0);
    }, [conversations]);

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

    if (!isOpen) {
        const launcherStyle = isMobile
            ? { right: 16, bottom: 88 }
            : { left: pos.x, top: pos.y };
        return (
            <button
                onMouseDown={dragEnabled ? handlePointerDown : undefined}
                onTouchStart={dragEnabled ? handleTouchStart : undefined}
                onClick={() => {
                    if (dragState.current.moved) return;
                    dispatch(openChatWindow({ barberId: null, customerId: null, peerName: "" }));
                    dispatch(showInbox());
                    dragState.current.moved = false;
                }}
                style={launcherStyle}
                className={`fixed bg-gradient-to-tr from-blue-600 to-indigo-600 hover:scale-110 active:scale-95 text-white w-14 h-14 rounded-2xl shadow-[0_10px_25px_-5px_rgba(59,130,246,0.5)] flex items-center justify-center z-[90] transition-transform duration-300 group ${dragEnabled ? 'cursor-move' : 'cursor-pointer'} ${isDragging ? 'scale-110 opacity-70' : ''}`}
                title="Open messages"
            >
                <svg className="w-7 h-7 pointer-events-none transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                {unreadTotal > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-black rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-lg border-2 border-white animate-bounce">
                        {unreadTotal}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div 
            className={`fixed z-[90] shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col
            ${minimized 
                ? 'bottom-24 right-6 h-16 w-64 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-blue-200' 
                : `bottom-0 right-0 w-full h-full bg-white ${isMobile ? 'rounded-none' : 'sm:bottom-28 sm:right-8 sm:w-[400px] sm:h-[600px] sm:rounded-3xl'}`
            }`}
        >
            {/* Header */}
            <div 
                className={`text-white p-4 flex justify-between items-center ${isMobile ? 'cursor-pointer' : 'cursor-move'} shadow-lg relative z-10 
                    ${minimized ? 'bg-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}
                `}
                onClick={() => {
                    if (!dragState.current.moved) {
                        dispatch(minimizeChatWindow());
                        dragState.current.moved = false;
                    }
                }}
            >
                <div className="flex items-center gap-3">
                    {!activeConversationId ? (
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                            <span className="text-xl">💬</span>
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md font-black text-sm">
                            {(activeDetails.peerName || "?").charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="font-black text-base leading-tight tracking-tight truncate">
                            {activeDetails.peerName || "Messages"}
                        </h3>
                        {!minimized && (
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                                {activeConversationId ? "Active Conversation" : `${sortedConversations.length} Conversations`}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {activeConversationId && !minimized && (
                        <button
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors font-bold text-xs uppercase"
                            onClick={(e) => {
                                e.stopPropagation();
                                dispatch(showInbox());
                            }}
                        >
                            ← Inbox
                        </button>
                    )}
                    <button 
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch(minimizeChatWindow());
                        }}
                    >
                        {minimized ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        )}
                    </button>
                    <button 
                        className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch(closeChatWindow());
                        }}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Body */}
            {!minimized && (
                <>
                    {activeConversationId ? (
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3 section-scrollbar">
                            {messages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 flex items-center justify-center text-3xl">👋</div>
                                    <p className="font-bold uppercase tracking-widest text-xs">Start a conversation</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.senderId === user.id;
                                    const prevMsg = messages[idx-1];
                                    const showHeader = !prevMsg || prevMsg.senderId !== msg.senderId;

                                    return (
                                        <div 
                                            key={msg.id} 
                                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${showHeader ? 'mt-2' : 'mt-0.5'}`}
                                        >
                                            <div 
                                                className={`max-w-[85%] px-4 py-2.5 shadow-sm text-sm font-medium ${
                                                    isMe 
                                                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' 
                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none'
                                                }`}
                                            >
                                                {msg.content}
                                            </div>
                                            {idx === messages.length - 1 && isMe && (
                                                <span className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Sent</span>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    ) : (
                        <div className="flex-1 p-4 overflow-y-auto bg-white section-scrollbar">
                            {sortedConversations.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <span className="text-4xl mb-4">📭</span>
                                    <h4 className="font-black text-gray-900 mb-1 tracking-tight">Your inbox is empty</h4>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-normal">
                                        Messages from your active queue or appointments will show up here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sortedConversations.map((conv) => {
                                        const peerName = user?.roles?.includes("CUSTOMER") ? conv.BarberName : conv.CustomerName;
                                        const initials = (peerName || "?").charAt(0).toUpperCase();
                                        return (
                                            <button
                                                key={conv.Id}
                                                onClick={() => dispatch(openChatWindow({
                                                    barberId: conv.BarberId,
                                                    customerId: conv.CustomerId,
                                                    peerName
                                                }))}
                                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border group ${
                                                    conv.UnreadCount > 0 
                                                    ? 'bg-blue-50/50 border-blue-100' 
                                                    : 'bg-white border-gray-50 hover:border-gray-200 hover:bg-gray-50 shadow-sm'
                                                }`}
                                            >
                                                <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border ${
                                                     conv.UnreadCount > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-500 border-white'
                                                }`}>
                                                    {initials}
                                                </div>
                                                <div className="flex-1 min-w-0 text-left">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <p className={`text-sm font-black truncate uppercase tracking-tighter ${conv.UnreadCount > 0 ? 'text-blue-700' : 'text-gray-900'}`}>{peerName}</p>
                                                        {conv.UpdatedAt && (
                                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                                                                {new Date(conv.UpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-xs truncate flex-1 uppercase tracking-widest font-bold ${conv.UnreadCount > 0 ? 'text-blue-500' : 'text-gray-400'}`}>
                                                            {conv.LastMessage || "No messages yet"}
                                                        </p>
                                                        {conv.UnreadCount > 0 && (
                                                            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse shadow-blue-200 shadow-lg"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Input */}
                    {activeConversationId && (
                        <div className="p-4 bg-white border-t border-gray-100">
                            <form onSubmit={handleSend} className="relative flex items-center gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-gray-100 border-none rounded-2xl px-5 py-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="Aa"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                />
                                <button 
                                    type="submit"
                                    className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                                    disabled={!input.trim()}
                                >
                                    <svg className="w-5 h-5 -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </form>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
