
import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { markAsRead, markAllAsRead, fetchNotifications } from '../../features/notifications/notificationsSlice';

export default function NotificationHistory() {
    const dispatch = useAppDispatch();
    const { items } = useAppSelector(state => state.notifications);

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    const handleMarkAsRead = (id) => {
        dispatch(markAsRead(id));
    };

    const handleMarkAll = () => {
        dispatch(markAllAsRead());
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        // Treat server timestamp as Wall Clock (UTC) to match Lebanon time stored/sent by server
        return d.toLocaleDateString("en-US", { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }) + 
               ' • ' + 
               d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    };

    return (
        <div className="max-w-4xl mx-auto py-6 px-4">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-500 text-sm">Review your past alerts and messages</p>
                </div>
                {items.some(i => !i.IsRead) && (
                    <button 
                        onClick={handleMarkAll}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {items.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
                        <p className="text-gray-500">We'll notify you when there's an update on your bookings or queue positions.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {items.map((item) => (
                            <div 
                                key={item.Id} 
                                className={`p-4 sm:p-6 transition-colors hover:bg-gray-50 flex gap-4 ${!item.IsRead ? 'bg-blue-50/30' : ''}`}
                                onClick={() => !item.IsRead && handleMarkAsRead(item.Id)}
                            >
                                <div className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${!item.IsRead ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                                <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-2">
                                        <h4 className={`text-base ${!item.IsRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                            {item.Title}
                                        </h4>
                                        <span className="text-xs text-gray-400">
                                            {formatDate(item.CreatedAt)}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                                        {item.Message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
