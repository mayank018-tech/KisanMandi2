import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  MessageCirclePlus,
  MoreVertical,
  Phone,
  Pin,
  PinOff,
  Search,
  Send,
  Smile,
  Trash2,
  UserRound,
  Video,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useAppUiStore } from '../stores/appUiStore';
import { useToastStore } from '../stores/toastStore';
import { buildUpiLink, getOfferById, recordPayment, updateOfferStatus } from '../features/offers/api';

type ChatUser = {
  id: string;
  full_name: string | null;
  role: string | null;
  mobile_number?: string | null;
  avatar_url?: string | null;
  district: string | null;
  state: string | null;
  is_online?: boolean | null;
  last_seen_at?: string | null;
};

type ConversationItem = {
  id: string;
  subject: string | null;
  last_message: string | null;
  last_activity_at: string | null;
  unread_count: number;
  is_pinned?: boolean;
  other_user: ChatUser | null;
};

type MessageItem = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  delivered_at?: string | null;
  seen_at?: string | null;
  message_type?: 'text' | 'offer' | 'system' | 'payment';
  offer_id?: string | null;
  offer?: any | null;
  client_status?: 'sending' | 'failed' | 'sent';
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  delivered_at?: string | null;
  seen_at?: string | null;
  message_type?: 'text' | 'offer' | 'system' | 'payment';
  offer_id?: string | null;
};

function getInitials(name: string | null | undefined) {
  const safe = (name || '').trim();
  if (!safe) return 'KM';
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatConversationTimestamp(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function formatMessageTimestamp(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function offerStatusClass(status: string | null | undefined) {
  if (status === 'accepted') return 'bg-emerald-50 text-emerald-700';
  if (status === 'rejected') return 'bg-rose-50 text-rose-700';
  if (status === 'expired') return 'bg-amber-50 text-amber-700';
  if (status === 'completed') return 'bg-sky-50 text-sky-700';
  return 'bg-slate-100 text-slate-600';
}

function formatLastSeen(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function UserAvatar({
  name,
  online,
  size = 'md',
}: {
  name: string | null;
  online: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass = size === 'lg' ? 'h-11 w-11 text-sm' : size === 'sm' ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm';
  const dotClass = size === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5';
  return (
    <div className={`relative flex ${sizeClass} items-center justify-center rounded-full bg-[#d9f2e1] font-semibold text-[#1f7a3e]`}>
      {getInitials(name)}
      <span
        className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white ${dotClass} ${
          online ? 'bg-emerald-500' : 'bg-slate-300'
        }`}
      />
    </div>
  );
}

export default function Chat() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const pushToast = useToastStore((state) => state.pushToast);

  const selectedConversationId = useAppUiStore((s) => s.selectedConversationId);
  const setSelectedConversationId = useAppUiStore((s) => s.setSelectedConversationId);
  const search = useAppUiStore((s) => s.chatSearch);
  const setSearch = useAppUiStore((s) => s.setChatSearch);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [foundUsers, setFoundUsers] = useState<ChatUser[]>([]);
  const [creatingConversationFor, setCreatingConversationFor] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [typingByConversation, setTypingByConversation] = useState<Record<string, boolean>>({});
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [confirmDeleteChatOpen, setConfirmDeleteChatOpen] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [userInfoStats, setUserInfoStats] = useState<{ totalListings: number; averageRating: number; totalReviews: number } | null>(null);
  const [payingOffer, setPayingOffer] = useState<any | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const selectedConversationRef = useRef<string | null>(selectedConversationId);
  const messageBottomRef = useRef<HTMLDivElement | null>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingSentRef = useRef(false);

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
    setChatMenuOpen(false);
    setConfirmDeleteChatOpen(false);
    setShowUserInfo(false);
  }, [selectedConversationId]);

  const isUserOnline = useCallback(
    (chatUser: ChatUser | null | undefined) => {
      if (!chatUser) return false;
      if (onlineUserIds.has(chatUser.id)) return true;
      if (!chatUser.is_online) return false;
      if (!chatUser.last_seen_at) return true;
      return Date.now() - new Date(chatUser.last_seen_at).getTime() < 2 * 60 * 1000;
    },
    [onlineUserIds]
  );

  const touchPresence = useCallback(
    async (isOnline: boolean) => {
      if (!profile?.id) return;

      const nowIso = new Date().toISOString();
      const { error } = await supabase.rpc('touch_presence', { p_is_online: isOnline });
      if (!error) return;

      const profileTable = supabase.from('user_profiles') as any;
      const { error: fallbackError } = await profileTable
        .update({ is_online: isOnline, last_seen_at: nowIso })
        .eq('id', profile.id);
      if (fallbackError) {
        console.warn('Failed to update presence', fallbackError.message);
      }
    },
    [profile?.id]
  );

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      if (!profile?.id) return;

      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString(), seen_at: new Date().toISOString() } as any)
        .eq('conversation_id', conversationId)
        .neq('sender_id', profile.id)
        .is('read_at', null);

      setConversations((prev) => prev.map((item) => (item.id === conversationId ? { ...item, unread_count: 0 } : item)));
    },
    [profile?.id]
  );

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return;
      setLoadingMessages(true);
      try {
        let rows: any[] = [];

        const withOffer = await supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            read_at,
            delivered_at,
            seen_at,
            message_type,
            offer_id,
            offer:offers(
              id,
              listing_id,
              buyer_id,
              farmer_id,
              offer_price,
              quantity,
              message,
              status,
              created_at,
              updated_at
            )
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(300);

        if (!withOffer.error) {
          rows = (withOffer.data || []) as any[];
        } else {
          const fallback = await supabase
            .from('messages')
            .select('id, conversation_id, sender_id, content, created_at, read_at, delivered_at, seen_at, message_type, offer_id')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(300);
          if (fallback.error) throw fallback.error;
          rows = (fallback.data || []) as any[];
        }

        const nextMessages: MessageItem[] = rows.map((row) => ({
          id: row.id,
          conversation_id: row.conversation_id,
          sender_id: row.sender_id,
          content: row.content || '',
          created_at: row.created_at,
          read_at: row.read_at,
          delivered_at: row.delivered_at,
          seen_at: row.seen_at,
          message_type: row.message_type || 'text',
          offer_id: row.offer_id,
          offer: row.offer || null,
          client_status: 'sent',
        }));

        setMessages(nextMessages);
        await markConversationRead(conversationId);
      } catch (err) {
        console.error('Failed to load messages', err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [markConversationRead]
  );

  const loadConversations = useCallback(async () => {
    if (!profile?.id) return;
    setLoadingConversations(true);
    try {
      let mineRows: any[] = [];
      const mineWithFlags = await supabase
        .from('conversation_participants')
        .select('conversation_id, is_pinned, hidden_at')
        .eq('user_id', profile.id);

      if (mineWithFlags.error) {
        const mineFallback = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', profile.id);
        if (mineFallback.error) throw mineFallback.error;
        mineRows = (mineFallback.data || []) as any[];
      } else {
        mineRows = (mineWithFlags.data || []) as any[];
      }

      const visibleMine = mineRows.filter((row) => !row.hidden_at);
      const conversationIds = visibleMine.map((row) => row.conversation_id as string);
      if (conversationIds.length === 0) {
        setConversations([]);
        if (selectedConversationRef.current) setSelectedConversationId(null);
        return;
      }

      const pinMap = new Map<string, boolean>();
      visibleMine.forEach((row) => {
        pinMap.set(row.conversation_id as string, Boolean(row.is_pinned));
      });

      const [conversationRes, participantsRes, unreadRes] = await Promise.all([
        supabase
          .from('conversations')
          .select('id, subject, last_message, last_activity_at')
          .in('id', conversationIds),
        supabase
          .from('conversation_participants')
          .select('conversation_id, user_id, user_profiles!conversation_participants_user_id_fkey(id, full_name, role, mobile_number, avatar_url, district, state, is_online, last_seen_at)')
          .in('conversation_id', conversationIds)
          .neq('user_id', profile.id),
        supabase
          .from('messages')
          .select('id, conversation_id')
          .in('conversation_id', conversationIds)
          .is('read_at', null)
          .neq('sender_id', profile.id),
      ]);

      if (conversationRes.error) throw conversationRes.error;
      if (unreadRes.error) throw unreadRes.error;

      let participantRows: any[] = [];
      if (participantsRes.error) {
        const participantsFallback = await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id, user_profiles!conversation_participants_user_id_fkey(id, full_name, role, district, state, is_online, last_seen_at)')
          .in('conversation_id', conversationIds)
          .neq('user_id', profile.id);
        if (participantsFallback.error) throw participantsFallback.error;
        participantRows = (participantsFallback.data || []) as any[];
      } else {
        participantRows = (participantsRes.data || []) as any[];
      }

      const otherUserMap = new Map<string, ChatUser>();
      for (const row of participantRows) {
        const userProfile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
        if (!userProfile) continue;
        otherUserMap.set(row.conversation_id, {
          id: userProfile.id,
          full_name: userProfile.full_name,
          role: userProfile.role,
          mobile_number: userProfile.mobile_number || null,
          avatar_url: userProfile.avatar_url || null,
          district: userProfile.district,
          state: userProfile.state,
          is_online: userProfile.is_online,
          last_seen_at: userProfile.last_seen_at,
        });
      }

      const unreadMap = new Map<string, number>();
      for (const row of (unreadRes.data || []) as any[]) {
        const conversationId = row.conversation_id as string;
        unreadMap.set(conversationId, (unreadMap.get(conversationId) || 0) + 1);
      }

      const nextConversations: ConversationItem[] = ((conversationRes.data || []) as any[]).map((conv) => ({
        id: conv.id,
        subject: conv.subject,
        last_message: conv.last_message,
        last_activity_at: conv.last_activity_at,
        unread_count: unreadMap.get(conv.id) || 0,
        is_pinned: pinMap.get(conv.id) || false,
        other_user: otherUserMap.get(conv.id) || null,
      }));

      nextConversations.sort((a, b) => {
        if ((a.is_pinned ? 1 : 0) !== (b.is_pinned ? 1 : 0)) {
          return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
        }
        const timeA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const timeB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return timeB - timeA;
      });

      setConversations(nextConversations);

      const selected = selectedConversationRef.current;
      if (!selected && nextConversations.length > 0) {
        setSelectedConversationId(nextConversations[0].id);
        return;
      }

      if (selected && !nextConversations.some((item) => item.id === selected)) {
        setSelectedConversationId(nextConversations[0]?.id || null);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [profile?.id, setSelectedConversationId]);

  const startConversationWith = useCallback(
    async (targetUser: ChatUser) => {
      if (!profile?.id || !targetUser?.id) return;

      setCreatingConversationFor(targetUser.id);
      try {
        let conversationId: string | null = null;

        // Preferred path: atomic RPC that is robust against RLS/order issues.
        const { data: rpcConversationId, error: rpcError } = await supabase.rpc('create_or_get_private_conversation', {
          p_target_user: targetUser.id,
        });
        if (!rpcError && rpcConversationId) {
          conversationId = rpcConversationId as string;
        }

        // Fallback path for environments where RPC migration is not applied yet.
        if (rpcError) {
          console.warn('RPC create_or_get_private_conversation failed, using fallback path:', rpcError.message);
        }

        if (!conversationId) {
          const { data: mine, error: mineError } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', profile.id);
          if (mineError) throw mineError;

          const myConversationIds = ((mine || []) as any[]).map((row) => row.conversation_id as string);

          if (myConversationIds.length > 0) {
            const { data: shared, error: sharedError } = await supabase
              .from('conversation_participants')
              .select('conversation_id')
              .eq('user_id', targetUser.id)
              .in('conversation_id', myConversationIds)
              .limit(1);
            if (sharedError) throw sharedError;
            if (shared && shared.length > 0) {
              conversationId = shared[0].conversation_id;
            }
          }
        }

        if (!conversationId) {
          const conversationKey = [profile.id, targetUser.id].sort().join(':');
          const { data: created, error: createError } = await supabase
            .from('conversations')
            .insert({
              subject: targetUser.full_name || t('chat', 'Chat'),
              conversation_key: conversationKey,
            } as any)
            .select('id')
            .single();

          if (createError) {
            if (createError.code === '23505') {
              const { data: existingByKey, error: existingByKeyError } = await supabase
                .from('conversations')
                .select('id')
                .eq('conversation_key', conversationKey)
                .single();
              if (existingByKeyError) throw existingByKeyError;
              conversationId = existingByKey.id;
            } else if (String(createError.message || '').toLowerCase().includes('conversation_key')) {
              const { data: fallback, error: fallbackError } = await supabase
                .from('conversations')
                .insert({ subject: targetUser.full_name || t('chat', 'Chat') })
                .select('id')
                .single();
              if (fallbackError) throw fallbackError;
              conversationId = fallback.id;
            } else {
              throw createError;
            }
          } else {
            conversationId = created.id;
          }
        }

        const { error: selfError } = await supabase
          .from('conversation_participants')
          .upsert(
            {
              conversation_id: conversationId,
              user_id: profile.id,
            },
            {
              onConflict: 'conversation_id,user_id',
              ignoreDuplicates: true,
            }
          );
        if (selfError) throw selfError;

        await supabase
          .from('conversation_participants')
          .update({ hidden_at: null })
          .eq('conversation_id', conversationId)
          .eq('user_id', profile.id);

        const { error: otherError } = await supabase
          .from('conversation_participants')
          .upsert(
            {
              conversation_id: conversationId,
              user_id: targetUser.id,
            },
            {
              onConflict: 'conversation_id,user_id',
              ignoreDuplicates: true,
            }
          );
        if (otherError) throw otherError;
        if (!conversationId) throw new Error('Conversation creation failed');

        setConversations((prev) => {
          const exists = prev.some((item) => item.id === conversationId);
          if (exists) return prev;
          const optimisticConversation: ConversationItem = {
            id: conversationId,
            subject: targetUser.full_name || t('chat', 'Chat'),
            last_message: null,
            last_activity_at: new Date().toISOString(),
            unread_count: 0,
            other_user: targetUser,
          };
          return [optimisticConversation, ...prev];
        });

        setSelectedConversationId(conversationId);
        setSearch('');
        await loadMessages(conversationId);
        await loadConversations();
      } catch (err) {
        const e: any = err;
        const code = e?.code ? ` [${e.code}]` : '';
        const detail = e?.details || e?.hint || '';
        const message = e?.message || String(err);
        console.error('Failed to start conversation', { code: e?.code, message: e?.message, details: e?.details, hint: e?.hint, raw: err });
        window.alert(`${t('chatStartFailed', 'Unable to open chat. Please refresh and try again.')}${code}\n${message}${detail ? `\n${detail}` : ''}`);
      } finally {
        setCreatingConversationFor(null);
      }
    },
    [loadConversations, loadMessages, profile?.id, setSearch, setSelectedConversationId, t]
  );

  const sendMessage = useCallback(
    async (content: string, existingId?: string) => {
      if (!profile?.id || !selectedConversationId || !content.trim()) return;

      const text = content.trim();
      const optimisticId = existingId || `tmp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      const optimisticCreatedAt = new Date().toISOString();

      const optimistic: MessageItem = {
        id: optimisticId,
        conversation_id: selectedConversationId,
        sender_id: profile.id,
        content: text,
        created_at: optimisticCreatedAt,
        read_at: null,
        client_status: 'sending',
      };

      setMessages((prev) => {
        if (existingId) {
          return prev.map((item) => (item.id === existingId ? optimistic : item));
        }
        return [...prev, optimistic];
      });

      setConversations((prev) =>
        prev.map((item) =>
          item.id === selectedConversationId ? { ...item, last_message: text, last_activity_at: optimisticCreatedAt } : item
        )
      );

      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: selectedConversationId,
            sender_id: profile.id,
            content: text,
            message_type: 'text',
          })
          .select('id, conversation_id, sender_id, content, created_at, read_at, delivered_at, seen_at, message_type, offer_id')
          .single();

        if (error) throw error;

        const committed: MessageItem = {
          id: data.id,
          conversation_id: data.conversation_id,
          sender_id: data.sender_id,
          content: data.content || '',
          created_at: data.created_at,
          read_at: data.read_at,
          delivered_at: (data as any).delivered_at,
          seen_at: (data as any).seen_at,
          message_type: ((data as any).message_type || 'text') as any,
          offer_id: (data as any).offer_id,
          client_status: 'sent',
        };

        setMessages((prev) => {
          const withoutOld = prev.filter((item) => item.id !== optimisticId && item.id !== committed.id);
          return [...withoutOld, committed].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });

        setConversations((prev) =>
          prev.map((item) =>
            item.id === selectedConversationId
              ? { ...item, last_message: committed.content, last_activity_at: committed.created_at }
              : item
          )
        );
      } catch (err) {
        console.error('Failed to send message', err);
        setMessages((prev) =>
          prev.map((item) => (item.id === optimisticId ? { ...item, client_status: 'failed' } : item))
        );
      }
    },
    [profile?.id, selectedConversationId]
  );

  const sendTypingStatus = useCallback(
    (isTyping: boolean) => {
      if (!profile?.id || !selectedConversationId) return;
      const channel = typingChannelRef.current;
      if (!channel) return;
      void channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          conversation_id: selectedConversationId,
          user_id: profile.id,
          is_typing: isTyping,
          at: new Date().toISOString(),
        },
      });
    },
    [profile?.id, selectedConversationId]
  );

  const handleMessageInputChange = useCallback(
    (nextValue: string) => {
      setMessageText(nextValue);
      if (!selectedConversationId) return;

      const isTyping = nextValue.trim().length > 0;

      if (isTyping && !isTypingSentRef.current) {
        sendTypingStatus(true);
        isTypingSentRef.current = true;
      }

      if (!isTyping && isTypingSentRef.current) {
        sendTypingStatus(false);
        isTypingSentRef.current = false;
      }

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = window.setTimeout(() => {
        if (isTypingSentRef.current) {
          sendTypingStatus(false);
          isTypingSentRef.current = false;
        }
      }, 1400);
    },
    [selectedConversationId, sendTypingStatus]
  );

  const handleRetry = useCallback(
    (messageId: string) => {
      const failed = messages.find((item) => item.id === messageId && item.client_status === 'failed');
      if (!failed || !failed.content) return;
      void sendMessage(failed.content, messageId);
    },
    [messages, sendMessage]
  );

  const handleTogglePin = useCallback(async () => {
    if (!profile?.id || !selectedConversationId) return;
    const current = conversations.find((item) => item.id === selectedConversationId);
    const nextPinned = !current?.is_pinned;
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_pinned: nextPinned })
        .eq('conversation_id', selectedConversationId)
        .eq('user_id', profile.id);
      if (error) throw error;
      setConversations((prev) =>
        [...prev]
          .map((item) => (item.id === selectedConversationId ? { ...item, is_pinned: nextPinned } : item))
          .sort((a, b) => {
            if ((a.is_pinned ? 1 : 0) !== (b.is_pinned ? 1 : 0)) {
              return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
            }
            const timeA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
            const timeB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
            return timeB - timeA;
          })
      );
      setChatMenuOpen(false);
      pushToast(nextPinned ? 'Chat pinned' : 'Chat unpinned', 'success');
    } catch (err) {
      console.error('Failed to pin chat', err);
      pushToast('Unable to update pin status', 'error');
    }
  }, [conversations, profile?.id, pushToast, selectedConversationId]);

  const handleSoftDeleteChat = useCallback(async () => {
    if (!profile?.id || !selectedConversationId) return;
    setDeletingChat(true);
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ hidden_at: new Date().toISOString() })
        .eq('conversation_id', selectedConversationId)
        .eq('user_id', profile.id);
      if (error) throw error;
      setConversations((prev) => prev.filter((item) => item.id !== selectedConversationId));
      setSelectedConversationId(null);
      setMessages([]);
      setChatMenuOpen(false);
      setConfirmDeleteChatOpen(false);
      pushToast(t('deleteChat', 'Delete Chat'), 'success');
    } catch (err) {
      console.error('Failed to delete chat', err);
      pushToast('Unable to delete chat', 'error');
    } finally {
      setDeletingChat(false);
    }
  }, [profile?.id, pushToast, selectedConversationId, setSelectedConversationId, t]);

  const handleOpenUserInfo = useCallback(async () => {
    const active = conversations.find((item) => item.id === selectedConversationId)?.other_user;
    if (!active?.id) return;
    setChatMenuOpen(false);
    setShowUserInfo(true);
    try {
      const [listingsRes, ratingsRes] = await Promise.all([
        supabase
          .from('crop_listings')
          .select('id', { count: 'exact', head: true })
          .eq('farmer_id', active.id),
        supabase
          .from('ratings')
          .select('score')
          .eq('rated_user_id', active.id)
          .limit(500),
      ]);
      const totalListings = listingsRes.count || 0;
      const scores = ((ratingsRes.data || []) as any[]).map((row) => Number(row.score || 0)).filter((value) => value > 0);
      const totalReviews = scores.length;
      const averageRating = totalReviews ? scores.reduce((acc, value) => acc + value, 0) / totalReviews : 0;
      setUserInfoStats({ totalListings, averageRating, totalReviews });
    } catch (err) {
      console.error('Failed to load user info', err);
      setUserInfoStats({ totalListings: 0, averageRating: 0, totalReviews: 0 });
    }
  }, [conversations, selectedConversationId]);

  const handleOfferAction = useCallback(
    async (offerId: string, status: 'accepted' | 'rejected' | 'completed') => {
      if (!profile?.id || !selectedConversationId) return;
      try {
        const offer = await getOfferById(offerId);
        if (!offer) return;
        await updateOfferStatus(offerId, status);
        await supabase.from('messages').insert({
          conversation_id: selectedConversationId,
          sender_id: profile.id,
          content: `Offer ${status}`,
          message_type: 'system',
          offer_id: offerId,
        } as any);

        const notifyUserId = profile.id === offer.farmer_id ? offer.buyer_id : offer.farmer_id;
        await supabase.from('notifications').insert({
          user_id: notifyUserId,
          type: 'offer',
          entity_type: 'offer',
          entity_id: offerId,
          title: status === 'accepted' ? 'Offer accepted' : status === 'rejected' ? 'Offer rejected' : 'Offer completed',
          body: `Offer update: ${status}`,
        } as any);

        pushToast(`Offer ${status}`, 'success');
        await loadMessages(selectedConversationId);
        await loadConversations();
      } catch (err) {
        console.error('Failed to update offer', err);
        pushToast('Unable to update offer status', 'error');
      }
    },
    [loadConversations, loadMessages, profile?.id, pushToast, selectedConversationId]
  );

  const handleOpenPayment = useCallback((offer: any) => {
    setPayingOffer(offer);
    setTransactionRef('');
    setPaymentScreenshot('');
  }, []);

  const handleSubmitPayment = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!payingOffer || !profile?.id || !selectedConversationId) return;
      setProcessingPayment(true);
      try {
        const totalAmount = Number(payingOffer.offer_price || 0) * Number(payingOffer.quantity || 1);
        const upiLink = buildUpiLink(totalAmount, `Offer ${payingOffer.id}`);
        window.location.href = upiLink;

        await recordPayment({
          offerId: payingOffer.id,
          payerId: profile.id,
          amount: totalAmount,
          transactionRef: transactionRef || undefined,
          screenshotUrl: paymentScreenshot || undefined,
        });

        await updateOfferStatus(payingOffer.id, 'completed');

        await supabase.from('messages').insert({
          conversation_id: selectedConversationId,
          sender_id: profile.id,
          content: `Payment submitted for offer ${payingOffer.id}`,
          message_type: 'payment',
          offer_id: payingOffer.id,
        } as any);

        await supabase.from('notifications').insert({
          user_id: payingOffer.farmer_id,
          type: 'offer',
          entity_type: 'offer',
          entity_id: payingOffer.id,
          title: 'Payment completed',
          body: 'Buyer has submitted payment and marked the offer completed.',
        } as any);

        setPayingOffer(null);
        pushToast('Payment submitted successfully', 'success');
        await loadMessages(selectedConversationId);
        await loadConversations();
      } catch (err) {
        console.error('Failed to process payment', err);
        pushToast('Unable to process payment', 'error');
      } finally {
        setProcessingPayment(false);
      }
    },
    [
      loadConversations,
      loadMessages,
      payingOffer,
      paymentScreenshot,
      profile?.id,
      pushToast,
      selectedConversationId,
      transactionRef,
    ]
  );

  useEffect(() => {
    if (!profile?.id) return;
    void loadConversations();
  }, [profile?.id, loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedConversationId);
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    if (!profile?.id) return;

    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setFoundUsers([]);
      setSearchingUsers(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const query = trimmed.replace(/[,%]/g, '');
        let rows: any[] = [];
        const withAvatar = await supabase
          .from('user_profiles')
          .select('id, full_name, role, mobile_number, avatar_url, district, state, is_online, last_seen_at')
          .neq('id', profile.id)
          .or(`full_name.ilike.%${query}%,mobile_number.ilike.%${query}%,district.ilike.%${query}%,state.ilike.%${query}%`)
          .order('full_name', { ascending: true })
          .limit(20);

        if (!withAvatar.error) {
          rows = (withAvatar.data || []) as any[];
        } else {
          const fallback = await supabase
            .from('user_profiles')
            .select('id, full_name, role, district, state, is_online, last_seen_at')
            .neq('id', profile.id)
            .or(`full_name.ilike.%${query}%,district.ilike.%${query}%,state.ilike.%${query}%`)
            .order('full_name', { ascending: true })
            .limit(20);
          if (fallback.error) throw fallback.error;
          rows = (fallback.data || []) as any[];
        }
        if (cancelled) return;

        const users: ChatUser[] = rows.map((item) => ({
          id: item.id,
          full_name: item.full_name,
          role: item.role,
          mobile_number: item.mobile_number,
          avatar_url: item.avatar_url,
          district: item.district,
          state: item.state,
          is_online: item.is_online,
          last_seen_at: item.last_seen_at,
        }));

        setFoundUsers(users);
      } catch (err) {
        console.error('Failed to search users', err);
      } finally {
        if (!cancelled) setSearchingUsers(false);
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [profile?.id, search]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`chat-message-events:${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        const incoming = payload.new as MessageRow;

        const activeConversationId = selectedConversationRef.current;
        if (activeConversationId === incoming.conversation_id) {
          if (incoming.message_type === 'offer' || incoming.message_type === 'payment') {
            void loadMessages(incoming.conversation_id);
          } else {
            setMessages((prev) => {
              if (prev.some((item) => item.id === incoming.id)) return prev;
              const normalized: MessageItem = {
                id: incoming.id,
                conversation_id: incoming.conversation_id,
                sender_id: incoming.sender_id,
                content: incoming.content || '',
                created_at: incoming.created_at,
                read_at: incoming.read_at,
                delivered_at: incoming.delivered_at,
                seen_at: incoming.seen_at,
                message_type: incoming.message_type || 'text',
                offer_id: incoming.offer_id,
                client_status: 'sent',
              };
              return [...prev, normalized].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
          }

          if (incoming.sender_id !== profile.id) {
            void markConversationRead(incoming.conversation_id);
          }
        }

        void loadConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload: any) => {
        const updated = payload.new as MessageRow;
        if (selectedConversationRef.current !== updated.conversation_id) return;
        setMessages((prev) =>
          prev.map((item) =>
            item.id === updated.id
              ? {
                  ...item,
                  read_at: updated.read_at,
                  seen_at: updated.seen_at,
                  delivered_at: updated.delivered_at,
                }
              : item
          )
        );
      })
      .subscribe((status: any) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      setRealtimeConnected(false);
      void channel.unsubscribe();
    };
  }, [loadConversations, loadMessages, markConversationRead, profile?.id]);

  useEffect(() => {
    if (!profile?.id || !selectedConversationId) return;

    const channel = supabase
      .channel(`chat-typing:${selectedConversationId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (!payload || payload.user_id === profile.id) return;
        if (payload.conversation_id !== selectedConversationId) return;
        setTypingByConversation((prev) => ({
          ...prev,
          [selectedConversationId]: Boolean(payload.is_typing),
        }));
      })
      .subscribe();

    typingChannelRef.current = channel;
    setTypingByConversation((prev) => ({
      ...prev,
      [selectedConversationId]: false,
    }));

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingSentRef.current) {
        sendTypingStatus(false);
        isTypingSentRef.current = false;
      }
      typingChannelRef.current = null;
      void channel.unsubscribe();
    };
  }, [profile?.id, selectedConversationId, sendTypingStatus]);

  useEffect(() => {
    if (!profile?.id) return;

    const presenceChannel = supabase
      .channel('chat-global-presence', {
        config: {
          presence: { key: profile.id },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState() as Record<string, Array<{ user_id?: string }>>;
        const nextIds = new Set<string>();
        Object.values(state).forEach((entries) => {
          entries.forEach((entry) => {
            if (entry?.user_id) nextIds.add(entry.user_id);
          });
        });
        setOnlineUserIds(nextIds);
      })
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          void presenceChannel.track({
            user_id: profile.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    void touchPresence(true);

    const heartbeatTimer = window.setInterval(() => {
      const online = !document.hidden;
      void touchPresence(online);
      if (online) {
        void presenceChannel.track({
          user_id: profile.id,
          online_at: new Date().toISOString(),
        });
      }
    }, 45000);

    const visibilityHandler = () => {
      const online = !document.hidden;
      void touchPresence(online);
      if (online) {
        void presenceChannel.track({
          user_id: profile.id,
          online_at: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);

    return () => {
      window.clearInterval(heartbeatTimer);
      document.removeEventListener('visibilitychange', visibilityHandler);
      void touchPresence(false);
      void presenceChannel.untrack();
      void presenceChannel.unsubscribe();
    };
  }, [profile?.id, touchPresence]);

  useEffect(() => {
    if (!profile?.id) return;

    const refreshTimer = window.setInterval(() => {
      void loadConversations();
      const current = selectedConversationRef.current;
      if (current) void loadMessages(current);
    }, 65000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [loadConversations, loadMessages, profile?.id]);

  useEffect(() => {
    messageBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) => {
      const title = (item.other_user?.full_name || item.subject || t('chat', 'Chat')).toLowerCase();
      const preview = (item.last_message || '').toLowerCase();
      return title.includes(query) || preview.includes(query);
    });
  }, [conversations, search, t]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const activeUser = activeConversation?.other_user || null;
  const activeUserOnline = isUserOnline(activeUser);
  const activeLocation = [
    activeUser?.district ? `${t('district', 'District')}: ${activeUser.district}` : '',
    activeUser?.state ? `${t('state', 'State')}: ${activeUser.state}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
  const activeTyping = selectedConversationId ? Boolean(typingByConversation[selectedConversationId]) : false;
  const activeTitle = activeUser?.full_name || activeConversation?.subject || t('chat', 'Chat');
  const activePinned = Boolean(activeConversation?.is_pinned);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!text) return;
    if (isTypingSentRef.current) {
      sendTypingStatus(false);
      isTypingSentRef.current = false;
    }
    setMessageText('');
    void sendMessage(text);
  };

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">{t('login', 'Login')}</div>;
  }

  return (
    <div className="km-page">
      <div className="mx-auto w-full max-w-7xl px-0 py-0 sm:px-4 sm:py-5">
        <div className="grid min-h-[calc(100vh-156px)] grid-cols-1 overflow-hidden border border-[var(--km-border)] bg-white shadow-[var(--km-shadow-sm)] sm:min-h-[70vh] sm:rounded-2xl lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside
            className={`flex flex-col border-r border-[var(--km-border)] bg-white ${
              selectedConversationId ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="border-b border-[var(--km-border)] px-4 pb-3 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[var(--km-text)]">{t('messages', 'Messages')}</h2>
                  <p className="text-xs text-[var(--km-muted)]">
                    {realtimeConnected ? t('connectedLive', 'Live') : t('syncing', 'Syncing...')}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--km-border)] text-[var(--km-muted)] transition hover:bg-slate-50"
                  onClick={() => setSearch('')}
                  aria-label={t('newChat', 'New chat')}
                >
                  <MessageCirclePlus className="h-4 w-4" />
                </button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--km-muted)]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('searchUsersOrChats', 'Search users or chats')}
                  className="h-11 w-full rounded-full border border-[var(--km-border)] bg-[#f7faf8] pl-9 pr-4 text-sm outline-none transition focus:border-[var(--km-primary)] focus:bg-white"
                />
              </div>
            </div>

            {search.trim().length >= 2 && (
              <div className="border-b border-[var(--km-border)] px-3 py-3">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--km-muted)]">
                  {t('people', 'People')}
                </p>
                <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                  {searchingUsers ? (
                    <p className="px-2 py-1 text-xs text-[var(--km-muted)]">{t('loading', 'Loading...')}</p>
                  ) : foundUsers.length === 0 ? (
                    <p className="px-2 py-1 text-xs text-[var(--km-muted)]">{t('noData', 'No data found')}</p>
                  ) : (
                    foundUsers.map((person) => {
                      const online = isUserOnline(person);
                      const location = [
                        person.district ? `${t('district', 'District')}: ${person.district}` : '',
                        person.state ? `${t('state', 'State')}: ${person.state}` : '',
                      ]
                        .filter(Boolean)
                        .join(' | ');
                      return (
                        <button
                          key={person.id}
                          type="button"
                          className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-50 ${
                            creatingConversationFor === person.id ? 'opacity-60' : ''
                          }`}
                          onClick={() => void startConversationWith(person)}
                          disabled={creatingConversationFor === person.id}
                        >
                          <UserAvatar name={person.full_name} online={online} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[var(--km-text)]">
                              {person.full_name || t('chat', 'Chat')}
                            </p>
                            <p className="truncate text-xs text-[var(--km-muted)]">
                              {location || t('member', 'Member')}
                              {person.role ? ` | ${t(person.role, person.role)}` : ''}
                            </p>
                          </div>
                          <span className={`text-[10px] font-semibold ${online ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {online ? t('online', 'Online') : t('offline', 'Offline')}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {loadingConversations ? (
                <p className="p-4 text-sm text-[var(--km-muted)]">{t('loading', 'Loading...')}</p>
              ) : filteredConversations.length === 0 ? (
                <p className="p-4 text-sm text-[var(--km-muted)]">{t('noConversationsYet', 'No conversations yet')}</p>
              ) : (
                filteredConversations.map((item) => {
                  const chatUser = item.other_user;
                  const online = isUserOnline(chatUser);
                  const title = chatUser?.full_name || item.subject || t('chat', 'Chat');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedConversationId(item.id)}
                      className={`w-full border-b border-[var(--km-border)] px-4 py-3 text-left transition hover:bg-slate-50 ${
                        selectedConversationId === item.id ? 'bg-[#f4f9f6]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <UserAvatar name={chatUser?.full_name || title} online={online} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-[var(--km-text)]">
                              {title}
                              {item.is_pinned ? <Pin className="ml-1 inline h-3.5 w-3.5 text-[var(--km-primary)]" /> : null}
                            </p>
                            <span className="whitespace-nowrap text-[11px] text-[var(--km-muted)]">
                              {formatConversationTimestamp(item.last_activity_at)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className="truncate text-xs text-[var(--km-muted)]">
                              {item.last_message || t('startConversation', 'Start a conversation')}
                            </p>
                            {item.unread_count > 0 && (
                              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--km-primary)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                {item.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className={`flex flex-col ${!selectedConversationId ? 'hidden lg:flex' : 'flex'}`}>
            {selectedConversationId ? (
              <>
                <header className="relative flex items-center gap-3 border-b border-[var(--km-border)] bg-white px-3 py-3 sm:px-4">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--km-muted)] transition hover:bg-slate-100 lg:hidden"
                    onClick={() => setSelectedConversationId(null)}
                    aria-label={t('back', 'Back')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <UserAvatar name={activeTitle} online={activeUserOnline} size="lg" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--km-text)]">
                      {activeTitle}
                    </p>
                    <p className="truncate text-xs text-[var(--km-muted)]">
                      {activeTyping
                        ? t('typing', 'Typing...')
                        : activeUserOnline
                          ? t('online', 'Online')
                          : `${t('lastSeen', 'Last seen')} ${formatLastSeen(activeUser?.last_seen_at) || t('offline', 'Offline')}`}
                      {activeLocation ? ` | ${activeLocation}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={t('call', 'Call')}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--km-muted)] transition hover:bg-slate-100"
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('videoCall', 'Video call')}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--km-muted)] transition hover:bg-slate-100"
                    >
                      <Video className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('moreOptions', 'More options')}
                      onClick={() => setChatMenuOpen((prev) => !prev)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--km-muted)] transition hover:bg-slate-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  {chatMenuOpen && (
                    <div className="absolute right-3 top-12 z-20 w-48 rounded-xl border border-[var(--km-border)] bg-white p-1 shadow-[var(--km-shadow-md)] sm:right-4">
                      <button
                        type="button"
                        onClick={() => void handleTogglePin()}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        {activePinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        {activePinned ? t('unpinChat', 'Unpin Chat') : t('pinChat', 'Pin Chat')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleOpenUserInfo()}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <UserRound className="h-4 w-4" />
                        {t('viewUserInformation', 'View User Information')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChatMenuOpen(false);
                          setConfirmDeleteChatOpen(true);
                        }}
                        disabled={deletingChat}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingChat ? t('loading', 'Deleting...') : t('deleteChat', 'Delete Chat')}
                      </button>
                    </div>
                  )}
                </header>

                <div
                  className="flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5"
                  style={{
                    backgroundColor: '#f2f7f3',
                    backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(31,122,62,0.06), transparent 35%), radial-gradient(circle at 80% 10%, rgba(31,122,62,0.05), transparent 28%)',
                  }}
                >
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8 text-sm text-[var(--km-muted)]">
                      <Clock3 className="mr-2 h-4 w-4 animate-pulse" />
                      {t('loading', 'Loading...')}
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[var(--km-muted)]">{t('noMessagesYet', 'No messages yet')}</p>
                  ) : (
                    messages.map((item) => {
                      const mine = item.sender_id === profile?.id;
                      return (
                        <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[72%] ${
                              mine ? 'rounded-br-md bg-[#dcf8c6] text-[#143219]' : 'rounded-bl-md bg-white text-[var(--km-text)]'
                            }`}
                          >
                            {item.message_type === 'offer' && item.offer ? (
                              <div className="space-y-2">
                                <div className="rounded-lg border border-[var(--km-border)] bg-white/80 p-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--km-muted)]">{t('offer', 'Offer')}</p>
                                  <div className="mt-1 text-sm">
                                    <div>{t('offerPrice', 'Offer Price')}: Rs {item.offer.offer_price}</div>
                                    <div>{t('quantity', 'Quantity')}: {item.offer.quantity}</div>
                                  </div>
                                  <div className="mt-2">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${offerStatusClass(item.offer.status)}`}>
                                      {item.offer.status}
                                    </span>
                                  </div>
                                  {profile?.id === item.offer.farmer_id && item.offer.status === 'pending' && (
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => void handleOfferAction(item.offer.id, 'accepted')}
                                        className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                                      >
                                        {t('accepted', 'Accept')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleOfferAction(item.offer.id, 'rejected')}
                                        className="rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white"
                                      >
                                        {t('rejected', 'Reject')}
                                      </button>
                                    </div>
                                  )}
                                  {profile?.id === item.offer.buyer_id && item.offer.status === 'accepted' && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPayment(item.offer)}
                                      className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md bg-[var(--km-primary)] px-2 py-1 text-xs font-semibold text-white"
                                    >
                                      <Wallet className="h-3.5 w-3.5" />
                                      {t('proceedToPay', 'Proceed to Pay')}
                                    </button>
                                  )}
                                  {profile?.id === item.offer.farmer_id && item.offer.status === 'accepted' && (
                                    <button
                                      type="button"
                                      onClick={() => void handleOfferAction(item.offer.id, 'completed')}
                                      className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-sky-600 px-2 py-1 text-xs font-semibold text-white"
                                    >
                                      {t('completed', 'Mark Completed')}
                                    </button>
                                  )}
                                </div>
                                {item.content ? <p className="whitespace-pre-wrap break-words text-sm">{item.content}</p> : null}
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words text-sm">{item.content}</p>
                            )}
                            <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? 'justify-end text-[#2f4f38]/75' : 'text-slate-500'}`}>
                              <span>{formatMessageTimestamp(item.created_at)}</span>
                              {mine && item.client_status === 'sending' && <Clock3 className="h-3 w-3 animate-pulse" />}
                              {mine && item.client_status !== 'failed' && item.client_status !== 'sending' && !item.delivered_at && (
                                <Check className="h-3 w-3" />
                              )}
                              {mine && item.client_status !== 'failed' && item.client_status !== 'sending' && item.delivered_at && !item.read_at && (
                                <CheckCheck className="h-3 w-3" />
                              )}
                              {mine && item.client_status !== 'failed' && item.read_at && (
                                <CheckCheck className="h-3 w-3 text-emerald-700" />
                              )}
                            </div>
                            {mine && item.client_status === 'failed' && (
                              <button
                                type="button"
                                className="mt-1 text-[10px] font-semibold text-red-600 underline"
                                onClick={() => handleRetry(item.id)}
                              >
                                {t('tapToRetry', 'Tap to retry')}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messageBottomRef} />
                </div>

                <form onSubmit={handleSubmit} className="border-t border-[var(--km-border)] bg-white p-2 sm:p-3">
                  <div className="flex items-center gap-2 rounded-full border border-[var(--km-border)] bg-[#f8faf8] px-2 py-1.5">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--km-muted)] transition hover:bg-slate-100"
                      aria-label={t('emoji', 'Emoji')}
                    >
                      <Smile className="h-4 w-4" />
                    </button>
                    <input
                      value={messageText}
                      onChange={(event) => handleMessageInputChange(event.target.value)}
                      placeholder={t('typeMessage', 'Type a message')}
                      className="h-8 flex-1 border-none bg-transparent px-1 text-sm outline-none"
                    />
                    <button
                      type="submit"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--km-primary)] text-white transition hover:brightness-95 disabled:opacity-60"
                      disabled={!messageText.trim()}
                      aria-label={t('send', 'Send')}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="hidden flex-1 items-center justify-center bg-[#f7faf8] lg:flex">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f5ec] text-[#1f7a3e]">
                    <MessageCirclePlus className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--km-text)]">{t('selectConversation', 'Select a conversation')}</p>
                  <p className="mt-1 text-xs text-[var(--km-muted)]">{t('searchUsersToStart', 'Search farmers and traders to start chatting')}</p>
                </div>
              </div>
            )}
          </section>
        </div>

        {showUserInfo && activeUser && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-[var(--km-shadow-lg)]">
              <div className="mb-3 flex items-center gap-3">
                <UserAvatar name={activeUser.full_name} online={activeUserOnline} size="lg" />
                <div>
                  <h3 className="text-lg font-semibold text-[var(--km-text)]">{activeUser.full_name || t('profile', 'Profile')}</h3>
                  <p className="text-xs text-[var(--km-muted)]">
                    {activeUser.role ? t(activeUser.role, activeUser.role) : t('member', 'Member')}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-[var(--km-muted)]">
                <p>{t('mobileNumber', 'Mobile Number')}: {activeUser.mobile_number || '-'}</p>
                <p>{t('district', 'District')}: {activeUser.district || '-'} | {t('state', 'State')}: {activeUser.state || '-'}</p>
                <p>{t('listings', 'Listings')}: {userInfoStats?.totalListings ?? '-'}</p>
                <p>
                  {t('rating', 'Rating')}:{' '}
                  {userInfoStats ? `${userInfoStats.averageRating.toFixed(1)} (${userInfoStats.totalReviews})` : '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUserInfo(false)}
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--km-border)] text-sm font-semibold"
              >
                {t('cancel', 'Close')}
              </button>
            </div>
          </div>
        )}

        {payingOffer && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-[var(--km-shadow-lg)]">
              <h3 className="text-lg font-semibold text-[var(--km-text)]">{t('proceedToPay', 'Proceed to Pay')}</h3>
              <p className="mt-1 text-sm text-[var(--km-muted)]">
                {t('offerPrice', 'Amount')}: Rs {(Number(payingOffer.offer_price || 0) * Number(payingOffer.quantity || 1)).toFixed(2)}
              </p>
              <form className="mt-4 space-y-3" onSubmit={handleSubmitPayment}>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--km-muted)]">Transaction Reference</label>
                  <input
                    className="km-input"
                    value={transactionRef}
                    onChange={(event) => setTransactionRef(event.target.value)}
                    placeholder="UPI transaction id"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[var(--km-muted)]">Payment Screenshot URL (optional)</label>
                  <input
                    className="km-input"
                    value={paymentScreenshot}
                    onChange={(event) => setPaymentScreenshot(event.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPayingOffer(null)}
                    className="km-btn km-btn-neutral flex-1"
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={processingPayment}
                    className="km-btn km-btn-green flex-1 disabled:opacity-60"
                  >
                    {processingPayment ? t('loading', 'Processing...') : t('proceedToPay', 'Pay Now')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmDeleteChatOpen && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-[var(--km-shadow-lg)]">
              <h3 className="text-lg font-semibold text-[var(--km-text)]">{t('deleteChat', 'Delete Chat')}?</h3>
              <p className="mt-2 text-sm text-[var(--km-muted)]">This action will hide the chat from your inbox.</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteChatOpen(false)}
                  className="km-btn km-btn-neutral flex-1"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSoftDeleteChat()}
                  disabled={deletingChat}
                  className="km-btn flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
                >
                  {deletingChat ? t('loading', 'Deleting...') : t('delete', 'Delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
