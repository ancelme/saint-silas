import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  MessageCircleQuestion,
  MessageSquareText,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  ChatContact,
  FeedbackRequest,
  fetchChatContacts,
  fetchFeedbackInbox,
  markFeedbackRequestRead,
  sendDirectMessage,
} from '../../services/api';
import { getChatSocket } from '../../services/chatSocket';
import { notifySuccess } from '../common/AppSuccessToast';

type RecipientRole = 'admin' | 'owner';

export const AskFeedbackTab: React.FC<{ onOpenConversation: (contactId: string) => void }> = ({ onOpenConversation }) => {
  const { user } = useAuth();
  const canViewInbox = ['owner', 'super_admin', 'admin'].includes(user?.role || '');
  const canReplyPrivately = ['owner', 'super_admin'].includes(user?.role || '');
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [inbox, setInbox] = useState<FeedbackRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replySent, setReplySent] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [recipientRole, setRecipientRole] = useState<RecipientRole>('admin');
  const [recipientId, setRecipientId] = useState('');
  const [category, setCategory] = useState<'Report' | 'Question' | 'Feedback'>('Report');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [inboxError, setInboxError] = useState('');

  useEffect(() => {
    let active = true;
    fetchChatContacts()
      .then(loadedContacts => {
        if (active) setContacts(loadedContacts);
      })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load administrators.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!canViewInbox) return;
    let active = true;
    const loadInbox = async () => {
      try {
        const requests = await fetchFeedbackInbox();
        if (active) {
          setInbox(requests);
          setInboxError('');
        }
      } catch (loadError) {
        if (active) setInboxError(loadError instanceof Error ? loadError.message : 'Unable to load incoming requests.');
      } finally {
        if (active) setIsLoadingInbox(false);
      }
    };

    setIsLoadingInbox(true);
    void loadInbox();
    const socket = getChatSocket();
    const handleIncomingMessage = (incoming: { recipientId: string; subject: string }) => {
      if (
        incoming.recipientId === user?.id &&
        /^(report|question|feedback):/i.test(incoming.subject)
      ) {
        void loadInbox();
      }
    };
    socket?.on('message:new', handleIncomingMessage);
    const refresh = window.setInterval(() => void loadInbox(), 30000);
    return () => {
      active = false;
      socket?.off('message:new', handleIncomingMessage);
      window.clearInterval(refresh);
    };
  }, [canViewInbox, user?.id]);

  const recipients = useMemo(
    () => contacts.filter(contact => recipientRole === 'admin'
      ? contact.role === 'admin'
      : contact.role === 'owner' || contact.role === 'super_admin'),
    [contacts, recipientRole],
  );
  const selectedRecipient = recipients.find(contact => contact.id === recipientId);
  const selectedRequest = inbox.find(item => item.id === selectedRequestId);

  useEffect(() => {
    if (!inbox.some(item => item.id === selectedRequestId)) {
      setSelectedRequestId(inbox[0]?.id || '');
    }
  }, [inbox, selectedRequestId]);

  useEffect(() => {
    if (!recipients.some(contact => contact.id === recipientId)) {
      setRecipientId(recipients[0]?.id || '');
    }
  }, [recipients, recipientId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecipient) {
      setError(`No active ${recipientRole === 'admin' ? 'administrator' : 'owner'} account is available.`);
      return;
    }
    setError('');
    setIsSending(true);
    try {
      await sendDirectMessage(
        selectedRecipient.id,
        message.trim(),
        `${category}: ${subject.trim()}`,
      );
      notifySuccess(`Your ${category.toLowerCase()} was sent to ${selectedRecipient.fullName}.`);
      setSubject('');
      setMessage('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send your message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectRequest = async (request: FeedbackRequest) => {
    setSelectedRequestId(request.id);
    setReplyError('');
    setReplySent('');
    if (request.isRead) return;

    try {
      await markFeedbackRequestRead(request.id);
      setInbox(current => current.map(item =>
        item.id === request.id ? { ...item, isRead: true } : item
      ));
    } catch (readError) {
      setInboxError(readError instanceof Error ? readError.message : 'Unable to update request status.');
    }
  };

  const handleSendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequest || !replyDraft.trim()) return;

    setReplyError('');
    setReplySent('');
    setIsSendingReply(true);
    try {
      await sendDirectMessage(
        selectedRequest.senderId,
        replyDraft.trim(),
        `Re: ${selectedRequest.subject}`.slice(0, 120),
      );
      setReplySent(`Your private reply was sent to ${selectedRequest.senderName}.`);
      setReplyDraft('');
      notifySuccess(`Private feedback sent to ${selectedRequest.senderName}.`);
    } catch (sendError) {
      setReplyError(sendError instanceof Error ? sendError.message : 'Unable to send your private reply.');
    } finally {
      setIsSendingReply(false);
    }
  };

  if (canViewInbox) {
    const unreadCount = inbox.filter(item => !item.isRead).length;
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-sky-950 to-emerald-950 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100">
                <LockKeyhole className="h-3.5 w-3.5" /> Private school communication
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Ask &amp; Feedback Inbox</h1>
              <p className="mt-2 max-w-2xl text-sm text-sky-100/80">
                {canReplyPrivately
                  ? 'Review private requests sent directly to your account and reply securely to each sender.'
                  : 'Review authorized reports from users. This inbox is read-only; submitted reports cannot be edited or deleted.'}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
              <Inbox className="h-5 w-5 text-emerald-200" />
              <div>
                <p className="text-xl font-black leading-none">{inbox.length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-sky-100/80">Private requests</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Requests received</p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{inbox.length}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Unread</p>
            <p className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-100">{unreadCount}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Privacy</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-bold text-emerald-950 dark:text-emerald-100">
              <ShieldCheck className="h-4 w-4" /> Account-to-account
            </p>
          </div>
        </div>

        {inboxError && (
          <div role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> {inboxError}
          </div>
        )}

        <div className="grid min-h-[34rem] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.5fr)]">
          <section className="border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">Requests to your account</h2>
                <p className="mt-1 text-[11px] text-slate-500">Only you and each sender can access these messages.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {unreadCount} new
              </span>
            </div>

            {isLoadingInbox && inbox.length === 0 ? (
              <div className="flex items-center gap-2 p-6 text-xs text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Loading private requests…
              </div>
            ) : inbox.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No private requests yet</p>
                <p className="mt-1 text-xs text-slate-500">Requests sent to this account will appear here.</p>
              </div>
            ) : (
              <div className="max-h-[35rem] overflow-y-auto p-2">
                {inbox.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleSelectRequest(item)}
                    className={`mb-1 w-full rounded-2xl p-3 text-left transition ${
                      selectedRequestId === item.id
                        ? 'bg-sky-50 ring-1 ring-sky-200 dark:bg-sky-950/30 dark:ring-sky-900'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.isRead ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                        <UserRound className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold text-slate-900 dark:text-white">{item.senderName}</span>
                          {!item.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" title="Unread" />}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] font-semibold text-sky-800 dark:text-sky-300">{item.subject}</span>
                        <span className="mt-1 block truncate text-[10px] text-slate-500">{item.body}</span>
                        <span className="mt-2 flex items-center gap-1 text-[9px] text-slate-400">
                          <Clock3 className="h-3 w-3" /> {new Date(item.createdAt.replace(' ', 'T')).toLocaleString()}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="flex min-h-[30rem] flex-col">
            {selectedRequest ? (
              <>
                <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-7">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-300">
                    {selectedRequest.subject.split(':')[0]}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{selectedRequest.subject.replace(/^(Question|Feedback):\s*/i, '')}</h2>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedRequest.senderName}</span>
                    <span>{selectedRequest.senderRole.replace('_', ' ')}</span>
                    <span>{new Date(selectedRequest.createdAt.replace(' ', 'T')).toLocaleString()}</span>
                  </p>
                </div>
                <div className="flex-1 px-5 py-6 sm:px-7">
                  <div className="rounded-2xl rounded-tl-sm bg-slate-100 p-4 text-sm leading-relaxed text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Private request</p>
                    <p className="whitespace-pre-wrap break-words">{selectedRequest.body}</p>
                  </div>
                </div>
                {canReplyPrivately ? <form onSubmit={handleSendReply} className="border-t border-slate-100 p-5 dark:border-slate-800 sm:p-7">
                  {replyError && (
                    <div role="alert" className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {replyError}
                    </div>
                  )}
                  {replySent && (
                    <div role="status" className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <CheckCircle2 className="h-4 w-4 shrink-0" /> {replySent}
                    </div>
                  )}
                  <label htmlFor="private-feedback-reply" className="mb-2 block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Send a private reply to {selectedRequest.senderName}
                  </label>
                  <textarea
                    id="private-feedback-reply"
                    value={replyDraft}
                    onChange={event => setReplyDraft(event.target.value)}
                    maxLength={2000}
                    rows={4}
                    required
                    placeholder="Write your response…"
                    className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="text-[10px] text-slate-500">Your reply is private and delivered directly to the sender’s account.</p>
                    <button
                      type="submit"
                      disabled={isSendingReply || !replyDraft.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSendingReply ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {isSendingReply ? 'Sending reply…' : 'Send private reply'}
                    </button>
                  </div>
                </form> : (
                  <div className="border-t border-slate-100 p-5 text-xs font-semibold text-slate-500 dark:border-slate-800 sm:p-7">
                    Read-only report access. The original submission cannot be modified or deleted by an administrator.
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <MessageSquareText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <h2 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">Select a private request</h2>
                <p className="mt-1 max-w-sm text-xs text-slate-500">Choose a message from your inbox to read it and send a private response.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <MessageCircleQuestion className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">School support</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Ask &amp; Feedback</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Send a private report, question, or feedback directly to a school administrator or owner.
        </p>
      </div>

      {canViewInbox && (
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Incoming requests</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Reports, questions, and feedback sent directly to your account.
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {inbox.filter(item => !item.isRead).length} unread
            </span>
          </div>

          {inboxError && (
            <div role="alert" className="mb-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{inboxError}</span>
            </div>
          )}
          {isLoadingInbox && inbox.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading incoming requests…
            </div>
          ) : inbox.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No questions or feedback have been sent to your account yet.
            </div>
          ) : (
            <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
              {inbox.map(item => (
                <article
                  key={item.id}
                  className={`rounded-2xl border p-4 ${
                    item.isRead
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                  }`}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <MessageSquareText className="h-4 w-4 text-emerald-600" />
                        <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.subject}</h3>
                        {!item.isRead && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        From {item.senderName} · {item.senderRole.replace('_', ' ')} · {new Date(item.createdAt.replace(' ', 'T')).toLocaleString()}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">
                        {item.body.length > 180 ? `${item.body.slice(0, 180)}…` : item.body}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenConversation(item.senderId)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                    >
                      <MessageCircleQuestion className="h-4 w-4" />
                      Open conversation
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Send to</span>
              <select
                value={recipientRole}
                onChange={event => {
                  setRecipientRole(event.target.value as RecipientRole);
                  setError('');
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="admin" disabled={!isLoading && !contacts.some(contact => contact.role === 'admin')}>Administrator</option>
                <option value="owner" disabled={!isLoading && !contacts.some(contact => contact.role === 'owner' || contact.role === 'super_admin')}>Owner / Super Admin</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Recipient account</span>
              <select
                value={recipientId}
                onChange={event => setRecipientId(event.target.value)}
                disabled={isLoading || recipients.length === 0}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {isLoading && <option value="">Loading recipients…</option>}
                {!isLoading && recipients.length === 0 && <option value="">No active recipient available</option>}
                {recipients.map(contact => (
                  <option key={contact.id} value={contact.id}>{contact.fullName}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Message type</span>
            <select
              value={category}
              onChange={event => setCategory(event.target.value as 'Question' | 'Feedback')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="Report">Share a report</option>
              <option value="Question">Ask a question</option>
              <option value="Feedback">Share feedback</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Subject</span>
            <input
              value={subject}
              onChange={event => setSubject(event.target.value)}
              maxLength={120}
              required
              placeholder="Briefly describe what this is about"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">Your message</span>
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              maxLength={2000}
              required
              rows={6}
              placeholder="Write your question or feedback…"
              className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <span className="mt-1 block text-right text-[11px] text-slate-400">{message.length}/2000</span>
          </label>

          <button
            type="submit"
            disabled={isSending || isLoading || !selectedRecipient || !subject.trim() || !message.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isSending ? 'Sending…' : 'Send message'}
          </button>
        </form>

        <aside className="h-fit rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="font-bold text-slate-900 dark:text-white">Private and direct</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Your message is delivered privately to the selected recipient and saved in Chat, where you can continue the conversation.
          </p>
        </aside>
      </div>
    </div>
  );
};
