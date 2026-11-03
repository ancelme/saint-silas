import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, FileText, Image, LoaderCircle, MessageCircle, Mic, Minimize2, Paperclip, Plus, Search, Send, Settings2, ShieldCheck, Smile, StopCircle, Trash2, UserRound, UsersRound, Wifi, WifiOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  ChatAttachment,
  ChatContact,
  DirectMessage,
  deleteDirectMessage as deleteDirectMessageRequest,
  fetchChatContacts,
  fetchConversation,
  fetchMessagePrivacy,
  sendDirectMessage,
  updateMessagePrivacy,
  createChatGroup,
} from '../../services/api';
import { connectChatSocket, getChatSocket } from '../../services/chatSocket';
import { SocialTab } from './SocialTab';

function formatLastSeen(value: string | null) {
  if (!value) return 'Last seen unavailable';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return 'Offline';
  return `Last seen ${date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
}

function formatMessageTime(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;
const acceptedMimeTypes = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain', 'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav',
]);
const mimeByExtension: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  webm: 'audio/webm', m4a: 'audio/mp4', ogg: 'audio/ogg', mp3: 'audio/mpeg', wav: 'audio/wav',
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error(`Could not read ${file.name}.`));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ChatTab: React.FC<{
  initialContactId?: string;
  onInitialContactOpened?: () => void;
  onExitFullScreen: () => void;
}> = ({ initialContactId, onInitialContactOpened, onExitFullScreen }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<DirectMessage | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [privacy, setPrivacy] = useState({ showLastSeen: true, showReadReceipts: true });
  const [error, setError] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const selectedContactIdRef = useRef(selectedContactId);
  const contactsRef = useRef(contacts);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'community'>('chat');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  selectedContactIdRef.current = selectedContactId;
  contactsRef.current = contacts;

  const selectedContact = useMemo(
    () => contacts.find(contact => contact.id === selectedContactId) || null,
    [contacts, selectedContactId],
  );
  const visibleContacts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return contacts;
    return contacts.filter(contact =>
      `${contact.fullName} ${contact.role}`.toLowerCase().includes(search),
    );
  }, [contacts, searchTerm]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoadingContacts(true);
      try {
        const [loadedContacts, loadedPrivacy] = await Promise.all([
          fetchChatContacts(),
          fetchMessagePrivacy(),
        ]);
        if (!active) return;
        setContacts(loadedContacts);
        setPrivacy(loadedPrivacy);
        setError('');
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load chat.');
      } finally {
        if (active) setIsLoadingContacts(false);
      }
    };
    void load();
    const refresh = setInterval(() => {
      void fetchChatContacts().then(loaded => {
        if (active) setContacts(loaded);
      }).catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to refresh contacts.');
      });
    }, 30000);
    return () => {
      active = false;
      clearInterval(refresh);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!initialContactId || !contacts.some(contact => contact.id === initialContactId)) return;
    setSelectedContactId(initialContactId);
    onInitialContactOpened?.();
  }, [contacts, initialContactId, onInitialContactOpened]);

  useEffect(() => {
    if (!selectedContactId) {
      setMessages([]);
      return;
    }
    let active = true;
    setIsLoadingMessages(true);
    setIsPeerTyping(false);
    setContacts(current => current.map(contact =>
      contact.id === selectedContactId ? { ...contact, unreadCount: 0 } : contact,
    ));
    void fetchConversation(selectedContactId)
      .then(conversation => {
        if (!active) return;
        setMessages(conversation);
        setError('');
        if (document.visibilityState === 'visible') {
          getChatSocket()?.emit('conversation:open', selectedContactId);
        }
      })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load conversation.');
      })
      .finally(() => {
        if (active) setIsLoadingMessages(false);
      });

    return () => {
      active = false;
      getChatSocket()?.emit('conversation:close', selectedContactId);
      getChatSocket()?.emit('typing:stop', selectedContactId);
    };
  }, [selectedContactId]);

  useEffect(() => {
    if (!user) return;
    const socket = connectChatSocket();
    if (!socket) return;
    const onConnect = () => {
      setIsConnected(true);
      const contactId = selectedContactIdRef.current;
      if (contactId && document.visibilityState === 'visible') {
        socket.emit('conversation:open', contactId);
      }
    };
    const onDisconnect = () => setIsConnected(false);
    const onNewMessage = (message: DirectMessage) => {
      setMessages(current => {
        if (current.some(existing => existing.id === message.id)) return current;
        if (
          message.senderId === selectedContactIdRef.current ||
          message.recipientId === selectedContactIdRef.current
        ) {
          return [...current, message];
        }
        return current;
      });
      const otherUserId = message.senderId === user.id ? message.recipientId : message.senderId;
      setContacts(current => current.map(contact =>
        contact.id !== otherUserId
          ? contact
          : {
            ...contact,
            lastMessage: message.body,
            unreadCount: message.recipientId === user.id && (
              selectedContactIdRef.current !== otherUserId || document.visibilityState !== 'visible'
            )
              ? contact.unreadCount + 1
              : contact.unreadCount,
          },
      ));
      if (
        message.recipientId === user.id &&
        message.senderId === selectedContactIdRef.current &&
        document.visibilityState === 'visible'
      ) {
        socket.emit('conversation:open', message.senderId);
      }
    };
    const onMessageStatus = (event: {
      senderId: string;
      recipientId: string;
      messageIds: string[];
      status: DirectMessage['deliveryStatus'];
      timestamp: string;
    }) => {
      setMessages(current => current.map(message =>
        event.messageIds.includes(message.id)
          ? {
            ...message,
            deliveryStatus: event.status,
            deliveredAt: event.status === 'delivered' ? event.timestamp : message.deliveredAt,
            readAt: event.status === 'read' ? event.timestamp : message.readAt,
          }
          : message,
      ));
      if (event.status === 'read' && event.recipientId === user.id) {
        setContacts(current => current.map(contact =>
          contact.id === event.senderId ? { ...contact, unreadCount: 0 } : contact,
        ));
      }
    };
    const onMessageDeleted = (event: {
      messageId: string;
      deletedBy: string;
      scope: 'me' | 'everyone';
    }) => {
      setMessages(current => event.scope === 'me'
        ? current.filter(message => message.id !== event.messageId)
        : current.map(message => message.id === event.messageId
          ? { ...message, body: '', attachments: [], isDeleted: true }
          : message,
        ));
      void fetchChatContacts().then(setContacts).catch(loadError => {
        setError(loadError instanceof Error ? loadError.message : 'Could not refresh chat contacts.');
      });
    };
    const onPresenceUpdate = (event: { userId: string; isOnline: boolean; lastSeen: string | null }) => {
      setContacts(current => current.map(contact =>
        contact.id === event.userId
          ? { ...contact, isOnline: event.isOnline, lastSeen: event.lastSeen }
          : contact,
      ));
    };
    const onTypingUpdate = (event: { userId: string; isTyping: boolean }) => {
      if (event.userId === selectedContactIdRef.current) setIsPeerTyping(event.isTyping);
    };
    const onVisibilityChange = () => {
      const contactId = selectedContactIdRef.current;
      if (document.visibilityState === 'visible' && contactId) {
        socket.emit('conversation:open', contactId);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message:new', onNewMessage);
    socket.on('message:status', onMessageStatus);
    socket.on('message:deleted', onMessageDeleted);
    socket.on('presence:update', onPresenceUpdate);
    socket.on('typing:update', onTypingUpdate);
    document.addEventListener('visibilitychange', onVisibilityChange);
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message:new', onNewMessage);
      socket.off('message:status', onMessageStatus);
      socket.off('message:deleted', onMessageDeleted);
      socket.off('presence:update', onPresenceUpdate);
      socket.off('typing:update', onTypingUpdate);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isPeerTyping]);

  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const addFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setError('');
    const currentBytes = attachments.reduce((total, attachment) => total + attachment.size, 0);
    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setError(`You can attach up to ${MAX_ATTACHMENTS} files to one message.`);
      return;
    }
    const preparedFiles: ChatAttachment[] = [];
    let totalBytes = currentBytes;

    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const detectedMimeType = file.type.split(';', 1)[0];
      const mimeType = acceptedMimeTypes.has(detectedMimeType)
        ? detectedMimeType
        : mimeByExtension[extension] || detectedMimeType;
      if (!acceptedMimeTypes.has(mimeType)) {
        setError(`${file.name} has an unsupported file type.`);
        return;
      }
      totalBytes += file.size;
      if (totalBytes > MAX_ATTACHMENT_BYTES) {
        setError('Attachments must total 6 MB or less per message.');
        return;
      }
      if (file.size === 0) {
        setError(`${file.name} is empty.`);
        return;
      }
      try {
        preparedFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          mimeType,
          size: file.size,
          dataUrl: await readFileAsDataUrl(file),
        });
      } catch (fileError) {
        setError(fileError instanceof Error ? fileError.message : 'Unable to read the selected file.');
        return;
      }
    }
    setAttachments(current => [...current, ...preparedFiles]);
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    setIsReadingFiles(true);
    try {
      await addFiles(files);
    } finally {
      setIsReadingFiles(false);
    }
  };

  const toggleVoiceRecording = async () => {
    if (isRecordingVoice) {
      recorderRef.current?.stop();
      return;
    }
    if (!window.isSecureContext) {
      setError('Voice recording requires a secure browser page (HTTPS). On this computer, use localhost; on other devices, open the school site over HTTPS.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported in this browser. Try a recent browser or attach an audio file.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/ogg;codecs=opus']
        .find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      recordingStreamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        setError('Voice recording failed. Please try again.');
        setIsRecordingVoice(false);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `voice-note-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`, {
          type: (blob.type || 'audio/webm').split(';', 1)[0],
        });
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
        setIsRecordingVoice(false);
        if (file.size > MAX_ATTACHMENT_BYTES) {
          setError('This voice note is larger than the 6 MB attachment limit. Please record a shorter note.');
        } else if (file.size > 0) {
          void addFiles([file]);
        } else {
          setError('The voice note was empty. Please record it again.');
        }
      };
      recorder.start();
      setIsRecordingVoice(true);
      setError('');
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : 'Microphone access was denied or unavailable.');
    }
  };

  const handleDeleteMessage = async (scope: 'me' | 'everyone') => {
    if (!messageToDelete) return;
    setIsDeletingMessage(true);
    setError('');
    try {
      await deleteDirectMessageRequest(messageToDelete.id, scope);
      setMessages(current => scope === 'me'
        ? current.filter(message => message.id !== messageToDelete.id)
        : current.map(message => message.id === messageToDelete.id
          ? { ...message, body: '', attachments: [], isDeleted: true }
          : message,
        ));
      setMessageToDelete(null);
      void fetchChatContacts().then(setContacts).catch(loadError => {
        setError(loadError instanceof Error ? loadError.message : 'Could not refresh chat contacts.');
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this message.');
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if ((!content && attachments.length === 0) || !selectedContact || isSending || isReadingFiles || isRecordingVoice) return;
    if (content.length > 2000) {
      setError('Messages can be up to 2,000 characters.');
      return;
    }
    setIsSending(true);
    setError('');
    getChatSocket()?.emit('typing:stop', selectedContact.id);
    try {
      const sentAttachments = attachments;
      const result = await sendDirectMessage(selectedContact.id, content, undefined, sentAttachments);
      setMessages(current =>
        current.some(message => message.id === result.message.id)
          ? current
          : [...current, result.message],
      );
      setContacts(current => current.map(contact =>
        contact.id === selectedContact.id
          ? { ...contact, lastMessage: content || (sentAttachments.length === 1 ? `📎 ${sentAttachments[0].name}` : `📎 ${sentAttachments.length} attachments`) }
          : contact,
      ));
      setDraft('');
      setAttachments([]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Message could not be sent.');
    } finally {
      setIsSending(false);
    }
  };

  const handlePrivacyChange = async (setting: 'showLastSeen' | 'showReadReceipts', enabled: boolean) => {
    const updated = { ...privacy, [setting]: enabled };
    setPrivacy(updated);
    try {
      const saved = await updateMessagePrivacy(updated);
      setPrivacy(saved);
    } catch (saveError) {
      setPrivacy(privacy);
      setError(saveError instanceof Error ? saveError.message : 'Privacy settings could not be saved.');
    }
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!selectedContact) return;
    const socket = getChatSocket();
    socket?.emit(value.trim() ? 'typing:start' : 'typing:stop', selectedContact.id);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (value.trim()) {
      typingTimerRef.current = setTimeout(
        () => socket?.emit('typing:stop', selectedContact.id),
        1500,
      );
    }
  };

  if (activeView === 'community') {
    return (
      <section className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Community</h2>
            <p className="text-xs text-slate-500">Stories, school posts, and announcements</p>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button type="button" onClick={() => setActiveView('chat')} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500">Chat</button>
            <button type="button" className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300">Community</button>
          </div>
        </header>
        <SocialTab />
      </section>
    );
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setIsCreatingGroup(true);
    try {
      await createChatGroup({ name: groupName.trim(), memberIds: groupMembers });
      setGroupName('');
      setGroupMembers([]);
      setShowGroupModal(false);
      const loadedContacts = await fetchChatContacts();
      setContacts(loadedContacts);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create group.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  return (
    <>
    <section className="flex h-dvh min-h-0 flex-col gap-3 overflow-hidden bg-slate-50 p-3 dark:bg-slate-950 sm:gap-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Chat</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Private messages with your school community.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button type="button" className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300">Chat</button>
            <button type="button" onClick={() => setActiveView('community')} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500">Community</button>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
          }`} aria-live="polite">
            {isConnected ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <WifiOff className="h-4 w-4" aria-hidden="true" />}
            {isConnected ? 'Connected' : 'Reconnecting…'}
          </div>
          <button
            type="button"
            onClick={onExitFullScreen}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Minimize2 className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Exit chat</span>
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(250px,320px)_1fr]">
        <aside className={`${selectedContactId ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-slate-200 dark:border-slate-800`}>
          <div className="border-b border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Conversations</h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setShowGroupModal(true)}
                  aria-label="Create chat group"
                  title="Create group"
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-slate-800"
                >
                  <UsersRound className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrivacy(value => !value)}
                  aria-expanded={showPrivacy}
                  aria-label="Chat privacy settings"
                  className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search people"
                aria-label="Search chat contacts"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            {showPrivacy && (
              <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
                <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Privacy
                </p>
                <label className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
                  <span>Share last seen</span>
                  <input type="checkbox" checked={privacy.showLastSeen} onChange={event => void handlePrivacyChange('showLastSeen', event.target.checked)} />
                </label>
                <label className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
                  <span>Share read receipts</span>
                  <input type="checkbox" checked={privacy.showReadReceipts} onChange={event => void handlePrivacyChange('showReadReceipts', event.target.checked)} />
                </label>
              </div>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {isLoadingContacts ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading contacts…
              </div>
            ) : visibleContacts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-5 text-center text-sm text-slate-500">
                <UserRound className="mb-2 h-8 w-8 text-slate-300" />
                {searchTerm ? 'No contacts match your search.' : 'No active chat contacts are available.'}
              </div>
            ) : visibleContacts.map(contact => (
              <button
                key={contact.id}
                type="button"
                onClick={() => setSelectedContactId(contact.id)}
                aria-current={selectedContactId === contact.id ? 'true' : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                  selectedContactId === contact.id
                    ? 'bg-emerald-50 dark:bg-emerald-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <span className="relative shrink-0">
                  {contact.avatar ? (
                    <img src={contact.avatar} alt="" className="h-11 w-11 rounded-full bg-slate-100 object-cover dark:bg-slate-800" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {contact.fullName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  {contact.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" aria-label="Online" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{contact.fullName}</span>
                    {contact.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white" aria-label={`${contact.unreadCount} unread messages`}>
                        {contact.unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-xs capitalize text-slate-500 dark:text-slate-400">
                    {contact.isOnline ? 'Online' : formatLastSeen(contact.lastSeen)}
                  </span>
                  {contact.lastMessage && (
                    <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{contact.lastMessage}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className={`${selectedContactId ? 'flex' : 'hidden md:flex'} min-h-0 flex-col bg-slate-50/70 dark:bg-slate-950/40`}>
          {selectedContact ? (
            <>
              <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <button type="button" onClick={() => setSelectedContactId('')} className="mr-1 rounded-lg px-2 py-1 text-sm text-emerald-700 md:hidden" aria-label="Back to conversations">←</button>
                {selectedContact.avatar ? (
                  <img src={selectedContact.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {selectedContact.fullName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{selectedContact.fullName}</h3>
                  <p className="flex items-center gap-1.5 text-xs capitalize text-slate-500 dark:text-slate-400" aria-live="polite">
                    {isPeerTyping ? (
                      <>
                        <span>typing</span>
                        <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                          <span className="animate-bounce [animation-delay:-300ms]">•</span>
                          <span className="animate-bounce [animation-delay:-150ms]">•</span>
                          <span className="animate-bounce">•</span>
                        </span>
                        <span className="sr-only">{selectedContact.fullName} is typing</span>
                      </>
                    ) : selectedContact.isOnline ? 'Online' : formatLastSeen(selectedContact.lastSeen)}
                  </p>
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6" aria-live="polite" aria-label="Conversation messages">
                {isLoadingMessages ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading messages…
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <MessageCircle className="h-7 w-7" />
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-white">Start the conversation</p>
                    <p className="mt-1 text-xs text-slate-500">Messages are private between you and {selectedContact.fullName}.</p>
                  </div>
                ) : (
                  <div className="mx-auto flex max-w-3xl flex-col gap-3">
                    {messages.map(message => {
                      const sentByMe = message.senderId === user?.id;
                      return (
                        <div key={message.id} className={`flex ${sentByMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[75%] ${
                            sentByMe
                              ? 'rounded-br-md bg-emerald-600 text-white'
                              : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                          }`}>
                            {message.subject !== 'Chat message' && (
                              <p className="mb-1 text-[11px] font-bold opacity-80">{message.subject}</p>
                            )}
                            {message.isDeleted ? (
                              <p className="text-sm italic opacity-75">This message was deleted for everyone.</p>
                            ) : (
                              <>
                                {message.body && <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>}
                                {message.attachments?.map(attachment => (
                                  <div key={attachment.id} className="mt-2">
                                    {attachment.mimeType.startsWith('image/') ? (
                                      <a href={attachment.dataUrl} target="_blank" rel="noreferrer" aria-label={`Open image ${attachment.name}`}>
                                        <img src={attachment.dataUrl} alt={attachment.name} className="max-h-72 max-w-full rounded-xl object-contain" />
                                      </a>
                                    ) : attachment.mimeType.startsWith('audio/') ? (
                                      <div className="min-w-56 max-w-full">
                                        <audio controls preload="metadata" src={attachment.dataUrl} className="max-w-full" aria-label={attachment.name} />
                                        <p className="mt-1 truncate text-[10px] opacity-80">{attachment.name}</p>
                                      </div>
                                    ) : (
                                      <a
                                        href={attachment.dataUrl}
                                        download={attachment.name}
                                        className="flex items-center gap-2 rounded-xl bg-black/5 p-2 text-xs underline underline-offset-2 dark:bg-white/10"
                                      >
                                        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                                        <span className="max-w-56 truncate">{attachment.name}</span>
                                        <span className="shrink-0 opacity-70">{formatFileSize(attachment.size)}</span>
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </>
                            )}
                            <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                              sentByMe ? 'text-emerald-100' : 'text-slate-400'
                            }`}>
                              <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                              {sentByMe && (
                                <span className="inline-flex" aria-label={`Message ${message.deliveryStatus}`}>
                                  {message.deliveryStatus === 'sent'
                                    ? <Check className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
                                    : <CheckCheck className={`h-3.5 w-3.5 ${
                                      message.deliveryStatus === 'read' ? 'text-sky-300' : 'text-slate-300'
                                    }`} aria-hidden="true" />}
                                </span>
                              )}
                              {!message.isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => setMessageToDelete(message)}
                                  aria-label={`Delete message from ${sentByMe ? 'you' : selectedContact.fullName}`}
                                  className="ml-1 rounded-md p-1 opacity-70 transition hover:bg-black/10 hover:opacity-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {isPeerTyping && (
                      <div className="self-start rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800" aria-label={`${selectedContact.fullName} is typing`}>
                        <span className="mr-1 inline-block animate-pulse">●</span>
                        <span className="mr-1 inline-block animate-pulse [animation-delay:150ms]">●</span>
                        <span className="inline-block animate-pulse [animation-delay:300ms]">●</span>
                        <span className="sr-only">{selectedContact.fullName} is typing</span>
                      </div>
                    )}
                    <div ref={endOfMessagesRef} />
                  </div>
                )}
              </div>

              <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,audio/*"
                  onChange={event => void handleFileSelection(event)}
                  className="sr-only"
                  aria-label="Attach files"
                />
                {attachments.length > 0 && (
                  <ul className="mb-3 flex flex-wrap gap-2" aria-label="Files attached to this message">
                    {attachments.map(attachment => (
                      <li key={attachment.id} className="flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
                        {attachment.mimeType.startsWith('image/')
                          ? <Image className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                          : attachment.mimeType.startsWith('audio/')
                            ? <Mic className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                            : <FileText className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
                        <span className="max-w-40 truncate">{attachment.name}</span>
                        <span className="text-slate-500">{formatFileSize(attachment.size)}</span>
                        <button
                          type="button"
                          onClick={() => setAttachments(current => current.filter(item => item.id !== attachment.id))}
                          aria-label={`Remove ${attachment.name}`}
                          className="rounded p-1 text-slate-500 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {showEmojiPicker && (
                  <div className="mb-3 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800" aria-label="Quick emoji">
                    {['😊', '😂', '❤️', '👍', '🙏', '🎉', '👏', '😢'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          handleDraftChange(`${draft}${emoji}`);
                          setShowEmojiPicker(false);
                        }}
                        className="rounded-lg px-2 py-1 text-lg transition hover:bg-white dark:hover:bg-slate-700"
                        aria-label={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mb-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isReadingFiles || isRecordingVoice || attachments.length >= MAX_ATTACHMENTS}
                    aria-label="Attach files"
                    title="Attach up to 5 files"
                    className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700 disabled:opacity-50 dark:hover:bg-slate-800"
                  >
                    {isReadingFiles ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void toggleVoiceRecording()}
                    disabled={isReadingFiles || (attachments.length >= MAX_ATTACHMENTS && !isRecordingVoice)}
                    aria-label={isRecordingVoice ? 'Stop voice note recording' : 'Record voice note'}
                    title={isRecordingVoice ? 'Stop recording' : 'Record voice note'}
                    className={`rounded-xl p-2 transition disabled:opacity-50 ${
                      isRecordingVoice ? 'animate-pulse bg-rose-100 text-rose-700 dark:bg-rose-950' : 'text-slate-500 hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isRecordingVoice ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(value => !value)}
                    aria-label="Open emoji picker"
                    aria-expanded={showEmojiPicker}
                    className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-emerald-700 dark:hover:bg-slate-800"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  {isRecordingVoice && <span className="text-xs font-semibold text-rose-600 dark:text-rose-300">Recording voice note…</span>}
                  {isReadingFiles && <span className="text-xs text-slate-500">Reading attachments…</span>}
                </div>
                <div className="flex items-end gap-2">
                  <label className="sr-only" htmlFor="chat-message">Write a message</label>
                  <textarea
                    id="chat-message"
                    value={draft}
                    onChange={event => handleDraftChange(event.target.value)}
                    onBlur={() => selectedContact && getChatSocket()?.emit('typing:stop', selectedContact.id)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend(event);
                      }
                    }}
                    maxLength={2000}
                    rows={1}
                    placeholder="Write a message…"
                    className="max-h-32 min-h-11 flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={(!draft.trim() && attachments.length === 0) || isSending || !isConnected || isReadingFiles || isRecordingVoice}
                    aria-label="Send message"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <MessageCircle className="h-8 w-8" />
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your school chat</h3>
              <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">Choose a contact to view messages, see live presence, and continue a private conversation.</p>
            </div>
          )}
        </div>
      </div>
    </section>
      {showGroupModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={event => {
          if (event.target === event.currentTarget) setShowGroupModal(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-group-title" className="w-full max-w-lg rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div>
                <h2 id="create-group-title" className="text-lg font-bold text-slate-900 dark:text-white">Create group</h2>
                <p className="text-xs text-slate-500">Start a private conversation with your school community.</p>
              </div>
              <button type="button" onClick={() => setShowGroupModal(false)} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Group name</span>
                <input value={groupName} onChange={event => setGroupName(event.target.value)} maxLength={150} placeholder="e.g. Primary 5 Class A" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </label>
              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Add members</span>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                  {contacts.filter(contact => !contact.isGroup).map(contact => (
                    <label key={contact.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input type="checkbox" checked={groupMembers.includes(contact.id)} onChange={event => setGroupMembers(current => event.target.checked ? [...current, contact.id] : current.filter(id => id !== contact.id))} />
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{contact.fullName}</span>
                      <span className="ml-auto text-xs text-slate-500">{String(contact.role).replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => void handleCreateGroup()} disabled={!groupName.trim() || isCreatingGroup} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                {isCreatingGroup ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                Create group
              </button>
            </div>
          </section>
        </div>
      )}
      {messageToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={event => {
          if (event.target === event.currentTarget && !isDeletingMessage) setMessageToDelete(null);
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-chat-message-title"
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
          >
            <div>
              <h2 id="delete-chat-message-title" className="text-lg font-bold text-slate-900 dark:text-white">Delete message?</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Choose whether to remove this message only from your chat or from both participants.</p>
            </div>
            {messageToDelete.body && (
              <p className="max-h-20 overflow-hidden rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {messageToDelete.body}
              </p>
            )}
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => void handleDeleteMessage('me')}
                disabled={isDeletingMessage}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {isDeletingMessage ? 'Deleting…' : 'Delete for me'}
              </button>
              {messageToDelete.senderId === user?.id && (
                <button
                  type="button"
                  onClick={() => void handleDeleteMessage('everyone')}
                  disabled={isDeletingMessage}
                  className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {isDeletingMessage ? 'Deleting…' : 'Delete for everyone'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                disabled={isDeletingMessage}
                className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
