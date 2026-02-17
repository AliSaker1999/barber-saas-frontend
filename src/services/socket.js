import { io } from "socket.io-client";

const defaultSocketUrl = "https://barber-saas-backend-l4iz.onrender.com";
const socketUrl = import.meta.env.VITE_WS_URL || defaultSocketUrl;

let socket;

export function connectSocket(token, userId) {
  socket = io(socketUrl, {
    auth: { token },
    transports: ["websocket"],
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 300,
    reconnectionDelayMax: 2000
  });

  if (userId) {
    socket.emit("join-user", userId);
  }

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
}
