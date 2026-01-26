import { io } from "socket.io-client";

let socket;

export function connectSocket(token, userId) {
  socket = io("http://localhost:5000", {
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
