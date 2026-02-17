
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { markAsRead, markAllAsRead, fetchNotifications } from '../../features/notifications/notificationsSlice';
import MobileHeader from '../../components/MobileHeader';
import { getNotificationPath } from '../../utils/notificationNavigation';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';

export default function NotificationHistory() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { items, loading, error } = useAppSelector(state => state.notifications);
    const user = useAppSelector(state => state.auth.user);

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    const handleMarkAsRead = (id) => {
        dispatch(markAsRead(id));
    };

    const handleNavigate = (item) => {
        navigate(getNotificationPath(item, user?.roles || []));
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
            <MobileHeader title="Notifications" />
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
                {loading ? (
                    <div className="p-4">
                        <LoadingState label="Loading notifications..." blocks={3} />
                    </div>
                ) : error ? (
                    <div className="p-4">
                        <ErrorState message={error} onRetry={() => dispatch(fetchNotifications())} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-4">
                        <EmptyState
                            title="No notifications yet"
                            description="We'll notify you when there's an update on your bookings or queue positions."
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {items.map((item) => (
                            <div 
                                key={item.Id} 
                                className={`p-4 sm:p-6 transition-colors hover:bg-gray-50 flex gap-4 ${!item.IsRead ? 'bg-blue-50/30' : ''}`}
                                onClick={() => {
                                    if (!item.IsRead) handleMarkAsRead(item.Id);
                                    handleNavigate(item);
                                }}
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
