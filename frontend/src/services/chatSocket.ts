import { io, Socket } from 'socket.io-client';
import { getStoredAuthToken } from './api';

let chatSocket: Socket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

function startHeartbeat(socket: Socket) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => socket.emit('presence:heartbeat'), 15000);
}

export function connectChatSocket() {
  const token = getStoredAuthToken();
  if (chatSocket) {
    chatSocket.auth = { token };
    if (!chatSocket.connected) chatSocket.connect();
    return chatSocket;
  }

  chatSocket = io({
    autoConnect: false,
    auth: { token },
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  chatSocket.on('message:new', (_message, acknowledge?: () => void) => {
    acknowledge?.();
  });
  chatSocket.on('connect', () => startHeartbeat(chatSocket!));
  chatSocket.on('disconnect', () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  });
  chatSocket.connect();
  return chatSocket;
}

export function getChatSocket() {
  return chatSocket;
}

export function disconnectChatSocket() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = null;
  chatSocket?.disconnect();
  chatSocket = null;
}
