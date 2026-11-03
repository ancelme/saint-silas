import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/index';
import { AuthRequest, recordAuditLog } from '../middleware/auth';
import { broadcastUserPresence, publishDirectMessage, publishMessageDeletion } from '../socket/chatSocket';
import { ChatAttachment, decodeChatMessage, encodeChatMessage, getChatMessagePreview } from '../utils/chatMessageContent';

export async function getFeedbackInbox(req: AuthRequest, res: Response) {
  try {
    const result = await db.query(
      `SELECT m.id, m.sender_id, u.full_name AS sender_name, u.role AS sender_role,
              m.subject, m.body, m.is_read, m.created_at
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.recipient_id = ?
         AND (m.subject LIKE 'Question:%' OR m.subject LIKE 'Feedback:%' OR m.subject LIKE 'Report:%')
       ORDER BY m.created_at DESC
       LIMIT 200`,
      [req.user!.id],
    );

    return res.json(result.rows.map(message => ({
      id: message.id,
      senderId: message.sender_id,
      senderName: message.sender_name,
      senderRole: message.sender_role,
      subject: message.subject,
      body: message.body,
      isRead: Number(message.is_read) === 1,
      createdAt: message.created_at,
    })));
  } catch (error) {
    console.error('Error retrieving Ask & Feedback inbox:', error);
    return res.status(500).json({ error: 'Failed to retrieve Ask & Feedback inbox' });
  }
}

export async function markFeedbackRequestRead(req: AuthRequest, res: Response) {
  try {
    const request = await db.query(
      `SELECT id FROM messages
       WHERE id = ?
         AND recipient_id = ?
         AND (subject LIKE 'Question:%' OR subject LIKE 'Feedback:%' OR subject LIKE 'Report:%')`,
      [req.params.id, req.user!.id],
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Private request not found' });
    }

    await db.query(
      `UPDATE messages
       SET is_read = 1,
           delivery_status = 'read',
           read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = ?
         AND recipient_id = ?
         AND (subject LIKE 'Question:%' OR subject LIKE 'Feedback:%' OR subject LIKE 'Report:%')`,
      [req.params.id, req.user!.id],
    );

    return res.json({ message: 'Private request marked as read' });
  } catch (error) {
    console.error('Error marking private request as read:', error);
    return res.status(500).json({ error: 'Failed to update private request' });
  }
}

export async function getMessageContacts(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const result = await db.query(
      `SELECT u.id, u.full_name, u.role, u.avatar_url, u.is_online, u.last_seen_at, u.show_last_seen,
              (SELECT CASE WHEN m.deleted_for_everyone = 1 THEN 'This message was deleted for everyone' ELSE m.body END
               FROM messages m
               WHERE (m.sender_id = u.id AND m.recipient_id = ? AND m.deleted_for_sender = 0)
                  OR (m.sender_id = ? AND m.recipient_id = u.id AND m.deleted_for_recipient = 0)
               ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*) FROM messages m
               WHERE m.sender_id = u.id AND m.recipient_id = ? AND m.is_read = 0
                 AND m.deleted_for_recipient = 0 AND m.deleted_for_everyone = 0) AS unread_count
       FROM users u
       WHERE u.id <> ? AND COALESCE(u.is_active, 1) = 1 AND COALESCE(u.status, 'Active') <> 'Inactive'
         AND (? <> 'parent' OR u.role IN ('owner', 'super_admin', 'admin', 'head_teacher', 'teacher'))
       ORDER BY u.full_name ASC`,
      [userId, userId, userId, userId, req.user!.role],
    );

    const directContacts = result.rows.map(contact => ({
      id: contact.id,
      fullName: contact.full_name,
      role: contact.role,
      avatar: contact.avatar_url || '',
      lastMessage: contact.last_message ? getChatMessagePreview(contact.last_message) : '',
      unreadCount: Number(contact.unread_count || 0),
      isOnline: Number(contact.is_online) === 1,
      lastSeen: Number(contact.show_last_seen ?? 1) === 1 ? contact.last_seen_at || null : null,
    }));
    const groups = await db.query(
      `SELECT g.id, g.name, g.avatar_url,
              (SELECT m.body FROM chat_group_messages m WHERE m.group_id = g.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
       FROM chat_groups g
       JOIN chat_group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = ? ORDER BY g.created_at DESC`,
      [userId],
    );
    return res.json([
      ...groups.rows.map(group => ({
        id: `group:${group.id}`,
        fullName: group.name,
        role: 'group',
        avatar: group.avatar_url || '',
        lastMessage: group.last_message ? getChatMessagePreview(group.last_message) : 'Group conversation',
        unreadCount: 0,
        isOnline: true,
        lastSeen: null,
        isGroup: true,
      })),
      ...directContacts,
    ]);
  } catch (error) {
    console.error('Error retrieving chat contacts:', error);
    return res.status(500).json({ error: 'Failed to retrieve chat contacts' });
  }
}

export async function createChatGroup(req: AuthRequest, res: Response) {
    const name = String(req.body?.name || '').trim();
    const memberIds = Array.isArray(req.body?.memberIds)
      ? [...new Set(req.body.memberIds.filter((value: unknown) => typeof value === 'string'))] as string[]
      : [];
    if (!name || name.length > 150) return res.status(400).json({ error: 'Group name must contain 1 to 150 characters.' });

    const groupId = crypto.randomUUID();
    await db.query(
      'INSERT INTO chat_groups (id, name, description, created_by) VALUES (?, ?, ?, ?)',
      [groupId, name, String(req.body?.description || '').trim(), req.user!.id],
    );
    await db.query(
      "INSERT INTO chat_group_members (group_id, user_id, role) VALUES (?, ?, 'admin')",
      [groupId, req.user!.id],
    );
    for (const memberId of memberIds) {
      if (memberId === req.user!.id) continue;
      const member = await db.query('SELECT id FROM users WHERE id = ? AND COALESCE(is_active, 1) = 1 LIMIT 1', [memberId]);
      if (member.rows.length) {
        await db.query(
          "INSERT INTO chat_group_members (group_id, user_id, role) VALUES (?, ?, 'member')",
          [groupId, memberId],
        );
      }
    }
    return res.status(201).json({ id: groupId, name });
}

export async function getConversation(req: AuthRequest, res: Response) {
  const currentUserId = req.user!.id;
  const otherUserId = req.params.userId;

  if (otherUserId.startsWith('group:')) {
    const groupId = otherUserId.slice(6);
    const membership = await db.query(
      'SELECT 1 FROM chat_group_members WHERE group_id = ? AND user_id = ? LIMIT 1',
      [groupId, currentUserId],
    );
    if (!membership.rows.length) return res.status(403).json({ error: 'You are not a member of this group.' });
    const messages = await db.query(
      `SELECT gm.id, gm.sender_id, gm.body, gm.attachments, gm.created_at, u.full_name AS sender_name
       FROM chat_group_messages gm JOIN users u ON u.id = gm.sender_id
       WHERE gm.group_id = ? ORDER BY gm.created_at ASC LIMIT 200`,
      [groupId],
    );
    return res.json(messages.rows.map(message => ({
      id: message.id,
      senderId: message.sender_id,
      senderName: message.sender_name,
      recipientId: otherUserId,
      subject: '',
      body: decodeChatMessage(message.body || '').body,
      attachments: decodeChatMessage(message.body || '').attachments,
      deliveryStatus: 'read',
      deliveredAt: message.created_at,
      readAt: message.created_at,
      createdAt: message.created_at,
    })));
  }

  if (!otherUserId || otherUserId === currentUserId) {
    return res.status(400).json({ error: 'Choose a different user to start a conversation' });
  }

  try {
    const recipient = await db.query(
      `SELECT id, role, show_read_receipts FROM users WHERE id = ? AND COALESCE(is_active, 1) = 1 AND COALESCE(status, 'Active') <> 'Inactive'`,
      [otherUserId],
    );
    if (!recipient.rows.length) {
      return res.status(404).json({ error: 'Chat contact not found or inactive' });
    }
    if (req.user!.role === 'parent' && !['owner', 'super_admin', 'admin', 'head_teacher', 'teacher'].includes(recipient.rows[0].role)) {
      return res.status(403).json({ error: 'Parents can only message school staff' });
    }

    const result = await db.query(
      `SELECT id, sender_id, recipient_id, subject, body, is_read, delivery_status, delivered_at, read_at, created_at, deleted_for_everyone
       FROM messages
       WHERE ((sender_id = ? AND recipient_id = ? AND deleted_for_sender = 0)
          OR (sender_id = ? AND recipient_id = ? AND deleted_for_recipient = 0))
       ORDER BY created_at ASC
       LIMIT 200`,
      [currentUserId, otherUserId, otherUserId, currentUserId],
    );

    return res.json(result.rows.map(message => {
      const content = decodeChatMessage(message.body);
      const isDeleted = Number(message.deleted_for_everyone) === 1;
      return {
        id: message.id,
        senderId: message.sender_id,
        recipientId: message.recipient_id,
        subject: message.subject,
        body: isDeleted ? '' : content.body,
        attachments: isDeleted ? [] : content.attachments,
        isDeleted,
        deliveryStatus: message.sender_id === currentUserId &&
          (message.delivery_status === 'read' || Number(message.is_read) === 1) &&
          Number(recipient.rows[0].show_read_receipts ?? 1) === 0
          ? 'delivered'
          : message.delivery_status || (Number(message.is_read) === 1 ? 'read' : 'sent'),
        deliveredAt: message.delivered_at || null,
        readAt: message.sender_id === currentUserId && Number(recipient.rows[0].show_read_receipts ?? 1) === 0
          ? null
          : message.read_at || null,
        createdAt: message.created_at,
      };
    }));
  } catch (error) {
    console.error('Error retrieving chat conversation:', error);
    return res.status(500).json({ error: 'Failed to retrieve conversation' });
  }
}

export async function sendDirectMessage(req: AuthRequest, res: Response) {
  const senderId = req.user!.id;
  const recipientId = req.params.userId;
  const body = req.body?.body;
  const requestedSubject = req.body?.subject;
  const attachments = req.body?.attachments;

  if (recipientId.startsWith('group:')) {
    const groupId = recipientId.slice(6);
    const membership = await db.query(
      'SELECT 1 FROM chat_group_members WHERE group_id = ? AND user_id = ? LIMIT 1',
      [groupId, senderId],
    );
    if (!membership.rows.length) return res.status(403).json({ error: 'You are not a member of this group.' });
    if (typeof body !== 'string' || (!body.trim() && !Array.isArray(attachments))) {
      return res.status(400).json({ error: 'Message must contain text or an attachment.' });
    }
    const messageId = crypto.randomUUID();
    await db.query(
      'INSERT INTO chat_group_messages (id, group_id, sender_id, body, attachments) VALUES (?, ?, ?, ?, ?)',
      [messageId, groupId, senderId, encodeChatMessage(String(body || ''), Array.isArray(attachments) ? attachments : []), JSON.stringify(Array.isArray(attachments) ? attachments : [])],
    );
    return res.status(201).json({
      message: {
        id: messageId, senderId, recipientId, subject: '', body: String(body || ''),
        attachments: Array.isArray(attachments) ? attachments : [],
        deliveryStatus: 'read', deliveredAt: new Date().toISOString(), readAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    });
  }

  if (!recipientId || recipientId === senderId) {
    return res.status(400).json({ error: 'Choose a different user to receive this message' });
  }
  if (typeof body !== 'string' || body.trim().length > 2000) {
    return res.status(400).json({ error: 'Message must contain 1 to 2000 characters' });
  }
  if (attachments !== undefined && !Array.isArray(attachments)) {
    return res.status(400).json({ error: 'Attachments must be a list of files' });
  }
  const requestedAttachments = Array.isArray(attachments) ? attachments : [];
  const allowedMimeTypes = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav',
  ]);
  if (requestedAttachments.length > 5) {
    return res.status(400).json({ error: 'You can attach up to 5 files to a message' });
  }
  let totalAttachmentBytes = 0;
  const cleanAttachments: ChatAttachment[] = [];
  for (const attachment of requestedAttachments) {
    if (
      typeof attachment?.id !== 'string' ||
      typeof attachment?.name !== 'string' ||
      attachment.name.length === 0 ||
      attachment.name.length > 180 ||
      /[\u0000-\u001f]/.test(attachment.name) ||
      typeof attachment?.mimeType !== 'string' ||
      !allowedMimeTypes.has(attachment.mimeType) ||
      typeof attachment?.dataUrl !== 'string'
    ) {
      return res.status(400).json({ error: 'One or more attachments are invalid or use an unsupported file type' });
    }
    const match = attachment.dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match || match[1] !== attachment.mimeType) {
      return res.status(400).json({ error: 'An attachment could not be read. Please select it again.' });
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.toString('base64') !== match[2]) {
      return res.status(400).json({ error: 'An attachment contains invalid file data' });
    }
    totalAttachmentBytes += buffer.byteLength;
    cleanAttachments.push({
      id: attachment.id.slice(0, 80),
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: buffer.byteLength,
      dataUrl: attachment.dataUrl,
    });
  }
  if (!body.trim() && cleanAttachments.length === 0) {
    return res.status(400).json({ error: 'Enter a message or attach a file before sending' });
  }
  if (totalAttachmentBytes > 6 * 1024 * 1024) {
    return res.status(400).json({ error: 'Attachments must total 6 MB or less per message' });
  }
  if (requestedSubject !== undefined && (
    typeof requestedSubject !== 'string' ||
    !requestedSubject.trim() ||
    requestedSubject.trim().length > 120
  )) {
    return res.status(400).json({ error: 'Subject must contain 1 to 120 characters' });
  }

  try {
    const recipient = await db.query(
      `SELECT id, role FROM users WHERE id = ? AND COALESCE(is_active, 1) = 1 AND COALESCE(status, 'Active') <> 'Inactive'`,
      [recipientId],
    );
    if (!recipient.rows.length) {
      return res.status(404).json({ error: 'Chat contact not found or inactive' });
    }
    if (
      typeof requestedSubject === 'string' &&
      /^(report|question|feedback):/i.test(requestedSubject.trim()) &&
      !['admin', 'owner', 'super_admin'].includes(String(recipient.rows[0].role))
    ) {
      return res.status(403).json({ error: 'Reports, questions, and feedback can only be sent to an administrator or owner.' });
    }
    if (req.user!.role === 'parent' && !['owner', 'super_admin', 'admin', 'head_teacher', 'teacher'].includes(recipient.rows[0].role)) {
      return res.status(403).json({ error: 'Parents can only message school staff' });
    }

    const id = `msg-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const content = body.trim();
    const subject = typeof requestedSubject === 'string' ? requestedSubject.trim() : 'Chat message';
    const storedBody = encodeChatMessage(content, cleanAttachments);
    await db.query(
      `INSERT INTO messages (id, sender_id, recipient_id, subject, body, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [id, senderId, recipientId, subject, storedBody],
    );

    const message = {
      id,
      senderId,
      recipientId,
      subject,
      body: content,
      attachments: cleanAttachments,
      isDeleted: false,
      deliveryStatus: 'sent' as const,
      deliveredAt: null,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    await publishDirectMessage(message);

    await recordAuditLog({
      userId: senderId,
      userName: req.user!.fullName,
      userEmail: req.user!.email,
      role: req.user!.role,
      action: 'DIRECT_MESSAGE_SENT',
      details: `Sent a direct message to account ${recipientId}.`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ message });
  } catch (error) {
    console.error('Error sending direct message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}

export async function deleteDirectMessage(req: AuthRequest, res: Response) {
  const messageId = req.params.id;
  const userId = req.user!.id;
  const scope = req.query.scope;
  if (scope !== 'me' && scope !== 'everyone') {
    return res.status(400).json({ error: 'Choose whether to delete the message for you or everyone' });
  }

  try {
    const result = await db.query(
      `SELECT id, sender_id, recipient_id FROM messages WHERE id = ?`,
      [messageId],
    );
    const message = result.rows[0];
    if (!message || (message.sender_id !== userId && message.recipient_id !== userId)) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (scope === 'everyone' && message.sender_id !== userId) {
      return res.status(403).json({ error: 'Only the sender can delete this message for everyone' });
    }

    if (scope === 'everyone') {
      await db.query(
        `UPDATE messages SET body = '', deleted_for_everyone = 1, is_read = 1 WHERE id = ?`,
        [messageId],
      );
    } else {
      const deletedColumn = message.sender_id === userId ? 'deleted_for_sender' : 'deleted_for_recipient';
      await db.query(`UPDATE messages SET ${deletedColumn} = 1 WHERE id = ?`, [messageId]);
    }

    publishMessageDeletion({
      messageId,
      senderId: message.sender_id,
      recipientId: message.recipient_id,
      deletedBy: userId,
      scope,
    });

    return res.json({ message: scope === 'everyone' ? 'Message deleted for everyone' : 'Message deleted for you' });
  } catch (error) {
    console.error('Error deleting direct message:', error);
    return res.status(500).json({ error: 'Failed to delete message' });
  }
}

export async function getMessagePrivacy(req: AuthRequest, res: Response) {
  try {
    const result = await db.query(
      `SELECT show_last_seen, show_read_receipts FROM users WHERE id = ?`,
      [req.user!.id],
    );
    const settings = result.rows[0];
    if (!settings) return res.status(404).json({ error: 'User not found' });
    return res.json({
      showLastSeen: Number(settings.show_last_seen ?? 1) === 1,
      showReadReceipts: Number(settings.show_read_receipts ?? 1) === 1,
    });
  } catch (error) {
    console.error('Error retrieving message privacy settings:', error);
    return res.status(500).json({ error: 'Failed to retrieve privacy settings' });
  }
}

export async function updateMessagePrivacy(req: AuthRequest, res: Response) {
  const { showLastSeen, showReadReceipts } = req.body || {};
  if (typeof showLastSeen !== 'boolean' || typeof showReadReceipts !== 'boolean') {
    return res.status(400).json({ error: 'Both privacy settings must be boolean values' });
  }

  try {
    await db.query(
      `UPDATE users SET show_last_seen = ?, show_read_receipts = ? WHERE id = ?`,
      [showLastSeen ? 1 : 0, showReadReceipts ? 1 : 0, req.user!.id],
    );
    const presence = await db.query(
      `SELECT is_online, last_seen_at FROM users WHERE id = ?`,
      [req.user!.id],
    );
    await broadcastUserPresence(
      req.user!.id,
      Number(presence.rows[0]?.is_online) === 1,
      presence.rows[0]?.last_seen_at || null,
    );
    return res.json({ showLastSeen, showReadReceipts });
  } catch (error) {
    console.error('Error updating message privacy settings:', error);
    return res.status(500).json({ error: 'Failed to update privacy settings' });
  }
}
