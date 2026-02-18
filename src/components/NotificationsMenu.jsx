
import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { markAsRead, markAllAsRead } from "../features/notifications/notificationsSlice";
import { getNotificationPath } from "../utils/notificationNavigation";

export default function NotificationsMenu() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(state => state.auth.user);
  const { items, unreadCount } = useAppSelector(state => state.notifications);

  const notifications = items.slice(0, 5); // Show last 5

  const handleMarkAsRead = (item) => {
    dispatch(markAsRead(item.Id));
    const targetPath = getNotificationPath(item, user?.roles || []);
    setTimeout(() => navigate(targetPath), 0);
  };
  
  const handleMarkAll = () => {
    dispatch(markAllAsRead());
  };

  return (
    <Menu as="div" className="relative inline-block text-left mr-2">
      <Menu.Button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors focus:outline-none">
        <svg 
           className={`w-6 h-6 transition-colors ${unreadCount > 0 ? "text-blue-600 animate-pulse-slow" : "text-gray-400"}`} 
           fill="none" 
           stroke="currentColor" 
           viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white font-bold items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-[-40px] sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 origin-top-right bg-app-surface divide-y divide-app-border rounded-2xl shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
             <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Notifications</h3>
             {unreadCount > 0 && (
                 <button onClick={handleMarkAll} className="text-xs text-blue-600 font-bold hover:underline">
                    Mark all read
                 </button>
             )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
             {notifications.length === 0 ? (
                 <div className="p-8 text-center text-gray-500">
                     <p className="text-sm">No notifications yet</p>
                 </div>
             ) : (
                 notifications.map((item) => (
                    <Menu.Item key={item.Id}>
                      {({ active }) => (
                        <button 
                          type="button"
                          className={`w-full text-left px-4 py-3 flex gap-3 transition-colors ${active ? 'bg-gray-50' : 'bg-white'} ${!item.IsRead ? 'bg-blue-50/50' : ''}`}
                          onClick={() => handleMarkAsRead(item)}
                        >
                            <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${!item.IsRead ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5 gap-2">
                                    <p className={`text-sm truncate ${!item.IsRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                        {item.Title}
                                    </p>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                                        {item.CreatedAt ? new Date(item.CreatedAt).toLocaleTimeString("en-US", {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'}) : ''}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed break-words">
                                    {item.Message}
                                </p>
                            </div>
                        </button>
                      )}
                    </Menu.Item>
                 ))
             )}
          </div>
          <div className="p-3 bg-gray-50 border-t text-center">
              <Link 
                to={user?.roles?.includes("CUSTOMER") ? "/customer/notifications" : "/company/notifications"} 
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest"
              >
                  View Full History
              </Link>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
