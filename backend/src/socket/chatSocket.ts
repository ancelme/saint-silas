import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { db } from '../db/index';
import { authenticateSocketToken, AuthenticatedUser, getSessionCookieToken } from '../middleware/auth';
import { ChatAttachment, decodeChatMessage } from '../utils/chatMessageContent';

interface ChatMessagePayload {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  attachments?: ChatAttachment[];
  isDeleted?: boolean;
  deliveryStatus: 'sent' | 'delivered' | 'read';
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
}

interface ChatSocket extends Socket {
  data: Socket['data'] & { user: AuthenticatedUser };
}

let chatServer: Server | null = null;
const connectedSockets = new Map<string, Set<string>>();
const heartbeats = new Map<string, number>();

function userRoom(userId: string) {
  return `user:${userId}`;
}

function conversationRoom(firstUserId: string, secondUserId: string) {
  return `conversation:${[firstUserId, secondUserId].sort().join(':')}`;
}

async function getPresencePayload(userId: string, isOnline: boolean, lastSeen?: string | null) {
  const result = await db.query(
    `SELECT show_last_seen FROM users WHERE id = ?`,
    [userId],
  );
  const shareLastSeen = Number(result.rows[0]?.show_last_seen ?? 1) === 1;
  return {
    userId,
    isOnline,
    lastSeen: shareLastSeen ? lastSeen || null : null,
  };
}

export async function broadcastUserPresence(userId: string, isOnline: boolean, lastSeen?: string | null) {
  if (!chatServer) return;
  chatServer.emit('presence:update', await getPresencePayload(userId, isOnline, lastSeen));
}

function messagePayload(row: Record<string, any>): ChatMessagePayload {
  const content = decodeChatMessage(row.body || '');
  const isDeleted = Number(row.deleted_for_everyone) === 1;
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    subject: row.subject,
    body: isDeleted ? '' : content.body,
    attachments: isDeleted ? [] : content.attachments,
    isDeleted,
    deliveryStatus: row.delivery_status || 'sent',
    deliveredAt: row.delivered_at || null,
    readAt: row.read_at || null,
    createdAt: row.created_at,
  };
}

async function notifyMessageStatus(messageId: string, senderId: string, recipientId: string, status: 'delivered' | 'read', at: string) {
  if (!chatServer) return;
  const event = { messageIds: [messageId], senderId, recipientId, status, timestamp: at };
  chatServer.to(userRoom(senderId)).emit('message:status', event);
  chatServer.to(userRoom(recipientId)).emit('message:status', event);
}

async function deliverToConnectedRecipient(message: ChatMessagePayload) {
  if (!chatServer) return false;
  const socketIds = [...(connectedSockets.get(message.recipientId) || [])];
  if (socketIds.length === 0) return false;

  const acknowledgements = await Promise.all(socketIds.map(socketId => new Promise<boolean>(resolve => {
    chatServer!.to(socketId).timeout(5000).emit('message:new', message, (error: Error | null) => {
      resolve(!error);
    });
  })));
  if (!acknowledgements.some(Boolean)) return false;

  const deliveredAt = new Date().toISOString();
  await db.query(
    `UPDATE messages
     SET delivery_status = 'delivered', delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)
     WHERE id = ? AND delivery_status = 'sent'`,
    [message.id],
  );
  await notifyMessageStatus(message.id, message.senderId, message.recipientId, 'delivered', deliveredAt);
  return true;
}

async function deliverPendingMessages(userId: string) {
  const pending = await db.query(
    `SELECT id, sender_id, recipient_id, subject, body, delivery_status, delivered_at, read_at, created_at, deleted_for_everyone
     FROM messages
     WHERE recipient_id = ? AND delivery_status = 'sent'
       AND deleted_for_recipient = 0 AND deleted_for_everyone = 0
     ORDER BY created_at ASC LIMIT 500`,
    [userId],
  );
  for (const row of pending.rows) {
    await deliverToConnectedRecipient(messagePayload(row));
  }
}

async function markConversationRead(userId: string, otherUserId: string) {
  const unread = await db.query<{ id: string }>(
    `SELECT id FROM messages
     WHERE sender_id = ? AND recipient_id = ? AND delivery_status <> 'read'`,
    [otherUserId, userId],
  );
  if (!unread.rows.length) return;

  await db.query(
    `UPDATE messages
     SET is_read = 1, delivery_status = 'read',
         delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP),
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE sender_id = ? AND recipient_id = ? AND delivery_status <> 'read'`,
    [otherUserId, userId],
  );

  const ids = unread.rows.map(row => row.id);
  const readAt = new Date().toISOString();
  const event = {
    messageIds: ids,
    senderId: otherUserId,
    recipientId: userId,
    status: 'read',
    timestamp: readAt,
  };
  chatServer?.to(userRoom(userId)).emit('message:status', event);

  const privacy = await db.query(
    `SELECT show_read_receipts FROM users WHERE id = ?`,
    [userId],
  );
  if (Number(privacy.rows[0]?.show_read_receipts ?? 1) === 1) {
    chatServer?.to(userRoom(otherUserId)).emit('message:status', event);
  }
}

async function isActiveUser(userId: string) {
  const result = await db.query(
    `SELECT id FROM users WHERE id = ? AND COALESCE(is_active, 1) = 1 AND COALESCE(status, 'Active') <> 'Inactive'`,
    [userId],
  );
  return result.rows.length > 0;
}

export function attachChatSocket(httpServer: HttpServer) {
  chatServer = new Server(httpServer, {
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  chatServer.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || getSessionCookieToken(socket.handshake.headers.cookie);
    if (typeof token !== 'string') return next(new Error('Authentication required'));
    const user = await authenticateSocketToken(token);
    if (!user) return next(new Error('Authentication required'));
    (socket as ChatSocket).data.user = user;
    next();
  });

  chatServer.on('connection', async rawSocket => {
    const socket = rawSocket as ChatSocket;
    const userId = socket.data.user.id;
    const sockets = connectedSockets.get(userId) || new Set<string>();
    sockets.add(socket.id);
    connectedSockets.set(userId, sockets);
    heartbeats.set(socket.id, Date.now());
    socket.join(userRoom(userId));

    await db.query(`UPDATE users SET is_online = 1 WHERE id = ?`, [userId]);
    await broadcastUserPresence(userId, true);
    void deliverPendingMessages(userId);

    socket.on('presence:heartbeat', () => {
      heartbeats.set(socket.id, Date.now());
    });

    socket.on('conversation:open', async (otherUserId: unknown, acknowledge?: (result: { ok: boolean }) => void) => {
      if (typeof otherUserId !== 'string' || otherUserId === userId || !(await isActiveUser(otherUserId))) {
        acknowledge?.({ ok: false });
        return;
      }
      socket.join(conversationRoom(userId, otherUserId));
      await markConversationRead(userId, otherUserId);
      acknowledge?.({ ok: true });
    });

    socket.on('conversation:close', (otherUserId: unknown) => {
      if (typeof otherUserId === 'string' && otherUserId !== userId) {
        socket.leave(conversationRoom(userId, otherUserId));
      }
    });

    const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
    const stopTyping = (otherUserId: string) => {
      const timer = typingTimers.get(otherUserId);
      if (timer) clearTimeout(timer);
      typingTimers.delete(otherUserId);
      chatServer?.to(userRoom(otherUserId)).emit('typing:update', {
        userId,
        fullName: socket.data.user.fullName,
        isTyping: false,
      });
    };

    socket.on('typing:start', async (otherUserId: unknown) => {
      if (typeof otherUserId !== 'string' || otherUserId === userId || !(await isActiveUser(otherUserId))) return;
      const timer = typingTimers.get(otherUserId);
      if (timer) clearTimeout(timer);
      chatServer?.to(userRoom(otherUserId)).emit('typing:update', {
        userId,
        fullName: socket.data.user.fullName,
        isTyping: true,
      });
      typingTimers.set(otherUserId, setTimeout(() => stopTyping(otherUserId), 5000));
    });

    socket.on('typing:stop', (otherUserId: unknown) => {
      if (typeof otherUserId === 'string') stopTyping(otherUserId);
    });

    socket.on('disconnect', async () => {
      heartbeats.delete(socket.id);
      for (const otherUserId of typingTimers.keys()) stopTyping(otherUserId);
      const activeSockets = connectedSockets.get(userId);
      activeSockets?.delete(socket.id);
      if (activeSockets?.size) return;

      connectedSockets.delete(userId);
      const lastSeen = new Date().toISOString();
      await db.query(
        `UPDATE users SET is_online = 0, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [userId],
      );
      if (connectedSockets.get(userId)?.size) {
        await db.query(`UPDATE users SET is_online = 1 WHERE id = ?`, [userId]);
        return;
      }
      await broadcastUserPresence(userId, false, lastSeen);
    });
  });

  const heartbeatMonitor = setInterval(() => {
    if (!chatServer) return;
    const now = Date.now();
    for (const [socketId, lastHeartbeat] of heartbeats) {
      if (now - lastHeartbeat > 45000) {
        chatServer.sockets.sockets.get(socketId)?.disconnect(true);
      }
    }
  }, 15000);
  heartbeatMonitor.unref();

  return chatServer;
}

export async function publishDirectMessage(message: ChatMessagePayload) {
  if (!chatServer) return;
  chatServer.to(userRoom(message.senderId)).emit('message:new', message);
  await deliverToConnectedRecipient(message);
}

export function publishMessageDeletion(event: {
  messageId: string;
  senderId: string;
  recipientId: string;
  deletedBy: string;
  scope: 'me' | 'everyone';
}) {
  if (!chatServer) return;
  const payload = { ...event };
  if (event.scope === 'everyone') {
    chatServer.to(userRoom(event.senderId)).emit('message:deleted', payload);
    chatServer.to(userRoom(event.recipientId)).emit('message:deleted', payload);
    return;
  }
  chatServer.to(userRoom(event.deletedBy)).emit('message:deleted', payload);
}
