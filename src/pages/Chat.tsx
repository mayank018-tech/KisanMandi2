import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Send, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useAppUiStore } from '../stores/appUiStore';

type ConversationItem = {
  id: string;
  subject: string | null;
  last_message: string | null;
  last_activity_at: string | null;
  unread_count: number;
};

function formatTimeLabel(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const { user, profile } = useAuth();
  const selectedConv = useAppUiStore((state) => state.selectedConversationId);
  const setSelectedConv = useAppUiStore((state) => state.setSelectedConversationId);
  const search = useAppUiStore((state) => state.chatSearch);
  const setSearch = useAppUiStore((state) => state.setChatSearch);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);

  useEffect(() => {
    if (!user || !profile?.id) return;
    void loadConversations();
  }, [user, profile?.id]);

  useEffect(() => {
    if (!selectedConv) return;

    const channel = supabase
      .channel(`messages:${selectedConv}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConv}` },
        () => {
          void loadMessages(selectedConv);
          void loadConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedConv]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const query = search.trim().toLowerCase();
    return conversations.filter((conv) => (conv.subject || 'Chat').toLowerCase().includes(query));
  }, [conversations, search]);

  const loadConversations = async () => {
    if (!profile?.id) return;

    try {
      setLoadingConversations(true);

      const { data, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversations(id, subject, last_message, last_activity_at)')
        .eq('user_id', profile.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const convs = ((data || []).map((row: any) => row.conversations).filter(Boolean) as any[]).map((conv) => ({
        id: conv.id,
        subject: conv.subject,
        last_message: conv.last_message,
        last_activity_at: conv.last_activity_at,
        unread_count: 0,
      }));

      const withUnread = await Promise.all(
        convs.map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .is('read_at', null)
            .neq('sender_id', profile.id);

          return {
            ...conv,
            unread_count: count || 0,
          };
        })
      );

      withUnread.sort((a, b) => {
        const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return tb - ta;
      });

      setConversations(withUnread);

      if (!selectedConv && withUnread.length > 0) {
        setSelectedConv(withUnread[0].id);
        await loadMessages(withUnread[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, created_at')
        .eq('conversation_id', convId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      if (profile?.id) {
        await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', convId)
          .neq('sender_id', profile.id)
          .is('read_at', null);
      }

      setConversations((prev) => prev.map((conv) => (conv.id === convId ? { ...conv, unread_count: 0 } : conv)));
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleSelectConversation = async (convId: string) => {
    setSelectedConv(convId);
    await loadMessages(convId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !selectedConv || !messageText.trim()) return;

    const content = messageText.trim();
    const tempId = `temp-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        conversation_id: selectedConv,
        sender_id: profile.id,
        content,
        created_at: new Date().toISOString(),
      },
    ]);
    setMessageText('');

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ conversation_id: selectedConv, sender_id: profile.id, content }])
        .select('id, conversation_id, sender_id, content, created_at')
        .single();

      if (error) throw error;

      setMessages((prev) => prev.map((msg) => (msg.id === tempId ? data : msg)));
      await loadConversations();
    } catch (err) {
      console.error('Failed to send message', err);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">Please login to access messaging.</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--km-bg)] pb-16 md:pb-20">
      <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 gap-4 px-4 py-5 md:px-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className={`overflow-hidden rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] shadow-[var(--km-shadow-sm)] ${selectedConv ? 'hidden lg:block' : ''}`}>
          <div className="border-b border-[var(--km-border)] p-4">
            <h2 className="mb-3 text-lg font-semibold text-[var(--km-text)]">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--km-muted)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="h-10 w-full rounded-lg border border-[var(--km-border)] pl-9 pr-3 text-sm outline-none focus:border-[var(--km-primary)]"
              />
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-sm text-[var(--km-muted)]">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-sm text-[var(--km-muted)]">No conversations found.</div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => void handleSelectConversation(conv.id)}
                  className={`w-full border-b border-[var(--km-border)] px-4 py-3 text-left transition hover:bg-slate-50 ${
                    selectedConv === conv.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--km-text)]">{conv.subject || 'Chat'}</div>
                      <div className="truncate text-xs text-[var(--km-muted)]">{conv.last_message || 'No messages yet'}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] text-[var(--km-muted)]">{formatTimeLabel(conv.last_activity_at)}</span>
                      {conv.unread_count > 0 && (
                        <span className="min-w-5 rounded-full bg-[var(--km-primary)] px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className={`flex min-h-[70vh] flex-col overflow-hidden rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] shadow-[var(--km-shadow-sm)] ${!selectedConv ? 'hidden lg:flex' : ''}`}>
          {selectedConv ? (
            <>
              <header className="flex items-center gap-3 border-b border-[var(--km-border)] p-4">
                <button type="button" onClick={() => setSelectedConv(null)} className="inline-flex lg:hidden">
                  <ArrowLeft className="h-5 w-5 text-[var(--km-muted)]" />
                </button>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--km-text)]">
                    {conversations.find((conv) => conv.id === selectedConv)?.subject || 'Chat'}
                  </h3>
                  <p className="text-xs text-[var(--km-muted)]">Secure conversation</p>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {messages.map((msg) => {
                  const mine = msg.sender_id === profile?.id;
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                          mine ? 'bg-[var(--km-primary)] text-white' : 'bg-white text-[var(--km-text)]'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-blue-100' : 'text-[var(--km-muted)]'}`}>
                          {formatTimeLabel(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-[var(--km-border)] p-3">
                <input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="h-10 flex-1 rounded-lg border border-[var(--km-border)] px-3 text-sm outline-none focus:border-[var(--km-primary)]"
                  placeholder="Write a message"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--km-primary)] text-white transition hover:brightness-95"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-[var(--km-muted)]">
              Select a conversation to start chatting.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
