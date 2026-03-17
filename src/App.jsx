import { useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { fetchNotifications, addNotification, markAsRead } from "./features/notifications/notificationsSlice";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { setOnlineStatus } from "./features/ui/uiSlice";
import { getSocket, connectSocket } from "./services/socket";
import { getNotificationPath } from "./utils/notificationNavigation";
import api from "./services/api";
import { initPushNotifications, showClientNotification } from "./services/pushNotifications";

export default function App() {
  const { user, token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => dispatch(setOnlineStatus(true));
    const handleOffline = () => dispatch(setOnlineStatus(false));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [dispatch]);

  useEffect(() => {
    // If user is already stored but socket not connected (e.g. on refresh)
    if (user && token) {
       dispatch(fetchNotifications());

       initPushNotifications({
        onToken: async (deviceToken) => {
          try {
            await api.post("/notifications/device-token", {
              token: deviceToken,
              platform: "native"
            });
          } catch {
            // Silent fail for token registration.
          }
        },
        onNotification: (notification) => {
          const title = notification?.title || "Ajmal";
          const message = notification?.body || "You have a new notification";
          const payload = notification?.data || {};

          dispatch(addNotification({
            Id: payload.notificationId || `native-${Date.now()}`,
            Title: title,
            Message: message,
            Type: payload.type || "PUSH",
            TenantId: payload.tenantId || null,
            IsRead: false,
            CreatedAt: new Date().toISOString(),
            Data: payload
          }));

          toast.success(message, {
            id: `native-push-${payload.notificationId || Date.now()}`,
            duration: 4000
          });
        }
       });
       
       if (!getSocket()) {
          const socket = connectSocket(token, user.id);
          socket.emit("join-user", user.id);
       }
    }
  }, [user, token, dispatch]);


  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      // Robust re-join logic for development/unstable connections
      const handleConnect = () => {
         if (user?.id) {
            console.log("🔌 Socket connected/reconnected. Joining room:", `user-${user.id}`);
            socket.emit("join-user", user.id);
         }
      };

      socket.on("connect", handleConnect);

      const handleNotification = (data) => {
        console.log("🔔 Notification received:", data);
        
        // Add to Redux state
        dispatch(addNotification(data));

        showClientNotification({
          title: data.Title || "Ajmal",
          body: data.Message || "You have a new update",
          data,
          tag: `notification-${data.Id || Date.now()}`,
          onClick: () => {
            if (data.Id) {
              dispatch(markAsRead(data.Id));
            }
            navigate(getNotificationPath(data, user?.roles || []));
          }
        });

        // Play sound if available (optional enhancement)

        // const audio = new Audio('/notification.mp3');
        // audio.play().catch(e => console.log('Audio play failed', e));

        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-8 border-blue-600 cursor-pointer`}
            style={{ zIndex: 9999 }} // Ensure high z-index
            onClick={() => {
              if (data.Id) {
                dispatch(markAsRead(data.Id));
              }
              navigate(getNotificationPath(data, user?.roles || []));
              toast.dismiss(t.id);
            }}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 animate-pulse">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-gray-900 uppercase tracking-widest leading-none mb-1">
                    {data.Title || "Remind"}
                  </p>
                  <p className="text-sm font-bold text-gray-600 leading-tight">
                    {data.Message}
                  </p>
                  {/* Show specific tenant info if available */}
                  {data.TenantName && (
                     <p className="text-xs text-indigo-500 font-bold mt-1 uppercase">From: {data.TenantName}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-200">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-xs font-black text-gray-400 hover:text-gray-600 focus:outline-none uppercase"
              >
                Close
              </button>
            </div>
          </div>
        ), { duration: 10000, position: 'top-right' });
      };

      socket.on("notification:new", handleNotification);
      
      return () => {
        socket.off("connect", handleConnect);
        socket.off("notification:new", handleNotification);
      };
    }
  }, [user, dispatch, navigate]);


  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <AppRoutes />
    </>
  );
}