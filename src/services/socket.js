import { io } from "socket.io-client";

let socket;

export function connectSocket(token, userId) {
  socket = io("https://barber-saas-backend-l4iz.onrender.com", {
    auth: { token }
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
