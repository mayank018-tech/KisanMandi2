import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCheck, Filter, Search, Send, User, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
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
  const { t } = useLanguage();
  const selectedConv = useAppUiStore((s) => s.selectedConversationId);
  const setSelectedConv = useAppUiStore((s) => s.setSelectedConversationId);
  const search = useAppUiStore((s) => s.chatSearch);
  const setSearch = useAppUiStore((s) => s.setChatSearch);

  const [newChatSearch, setNewChatSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'fav'>('all');
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [networkSuggestions, setNetworkSuggestions] = useState<any[]>([]);
  const [traderSuggestions, setTraderSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile?.id) return;
    void loadConversations();
    void loadSuggestions();
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
    let list = conversations;
    if (filter === 'unread') list = list.filter((c) => c.unread_count > 0);
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((c) => (c.subject || t('chat', 'Chat')).toLowerCase().includes(q));
  }, [conversations, search, filter, t]);

  const combinedSuggestions = useMemo(() => {
    const all = [...networkSuggestions, ...traderSuggestions];
    if (!newChatSearch.trim()) return all.slice(0, 8);
    const q = newChatSearch.trim().toLowerCase();
    return all.filter((u) => (u.full_name || '').toLowerCase().includes(q)).slice(0, 8);
  }, [networkSuggestions, traderSuggestions, newChatSearch]);

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
          return { ...conv, unread_count: count || 0 };
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
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)));
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleSelectConversation = async (convId: string) => {
    setSelectedConv(convId);
    await loadMessages(convId);
  };

  const loadSuggestions = async () => {
    if (!profile?.id) return;
    try {
      setLoadingSuggestions(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, district, state')
        .neq('id', profile.id)
        .limit(20);
      if (error) throw error;
      const network = (data || []).filter((u) => u.role === 'farmer').slice(0, 8);
      const traders = (data || []).filter((u) => u.role === 'buyer').slice(0, 8);
      setNetworkSuggestions(network);
      setTraderSuggestions(traders);
    } catch (err) {
      console.error('Failed loading suggestions', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const startConversationWith = async (target: { id: string; full_name?: string | null }) => {
    if (!profile?.id || !target?.id) return;
    setStartingChatId(target.id);
    try {
      const subject = target.full_name || t('chat', 'Chat');
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({ subject })
        .select('id, subject, last_message, last_activity_at')
        .single();
      if (convError) throw convError;
      const participants = [
        { conversation_id: conv.id, user_id: profile.id },
        { conversation_id: conv.id, user_id: target.id },
      ];
      const { error: partError } = await supabase.from('conversation_participants').insert(participants);
      if (partError) throw partError;
      await loadConversations();
      setSelectedConv(conv.id);
      await loadMessages(conv.id);
    } catch (err) {
      console.error('Failed to start conversation', err);
    } finally {
      setStartingChatId(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !selectedConv || !messageText.trim()) return;
    const content = messageText.trim();
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, conversation_id: selectedConv, sender_id: profile.id, content, created_at: new Date().toISOString() },
    ]);
    setMessageText('');
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ conversation_id: selectedConv, sender_id: profile.id, content }])
        .select('id, conversation_id, sender_id, content, created_at')
        .single();
      if (error) throw error;
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      await loadConversations();
    } catch (err) {
      console.error('Failed to send message', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  if (!user) {
    return <div className="flex min-h-screen items-center justify-center">{t('login', 'Login')}</div>;
  }

  return (
    <div className="km-page">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left panel: chats + start chat */}
        <section className={`overflow-hidden rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] shadow-[var(--km-shadow-sm)] ${selectedConv ? 'hidden lg:block' : ''}`}>
          <div className="border-b border-[var(--km-border)] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--km-text)]">{t('messages', 'Messages')}</h2>
              <div className="flex gap-1">
                {(['all', 'unread', 'fav'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                      filter === f
                        ? 'bg-[var(--km-primary-soft)] text-[var(--km-primary)] border-transparent'
                        : 'border-[var(--km-border)] text-[var(--km-muted)]'
                    }`}
                  >
                    {f === 'all' ? t('all', 'All') : f === 'unread' ? t('unread', 'Unread') : t('favourites', 'Favourites')}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--km-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('search', 'Search')}
                className="h-10 w-full rounded-lg border border-[var(--km-border)] pl-9 pr-3 text-sm outline-none focus:border-[var(--km-primary)]"
              />
            </div>
            <div className="rounded-lg border border-[var(--km-border)] bg-white/60 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--km-text)]">{t('startChat', 'Start a chat')}</p>
                <span className="text-[11px] text-[var(--km-muted)]">{t('myNetwork', 'My Network')}</span>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--km-muted)]" />
                <input
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  placeholder={t('search', 'Search')}
                  className="h-9 w-full rounded-lg border border-[var(--km-border)] pl-9 pr-3 text-xs outline-none focus:border-[var(--km-primary)]"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {loadingSuggestions ? (
                  <span className="text-xs text-[var(--km-muted)]">{t('loading', 'Loading...')}</span>
                ) : combinedSuggestions.length === 0 ? (
                  <span className="text-xs text-[var(--km-muted)]">{t('noData', 'No data found')}</span>
                ) : (
                  combinedSuggestions.map((u) => (
                    <button
                      key={u.id}
                      className={`km-pill ${startingChatId === u.id ? 'opacity-60' : ''}`}
                      onClick={() => void startConversationWith(u)}
                      disabled={startingChatId === u.id}
                    >
                      {u.full_name || t('chat', 'Chat')}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-sm text-[var(--km-muted)]">{t('loading', 'Loading...')}</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-sm text-[var(--km-muted)]">{t('noData', 'No data found')}</div>
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
                      <div className="truncate text-sm font-semibold text-[var(--km-text)]">{conv.subject || t('chat', 'Chat')}</div>
                      <div className="truncate text-xs text-[var(--km-muted)]">{conv.last_message || t('noData', 'No data found')}</div>
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

        {/* Right panel: conversation */}
        <section className={`flex min-h-[70vh] flex-col overflow-hidden rounded-xl border border-[var(--km-border)] bg-[var(--km-surface)] shadow-[var(--km-shadow-sm)] ${!selectedConv ? 'hidden lg:flex' : ''}`}>
          {selectedConv ? (
            <>
              <header className="flex items-center gap-3 border-b border-[var(--km-border)] p-4">
                <button type="button" onClick={() => setSelectedConv(null)} className="inline-flex lg:hidden">
                  <ArrowLeft className="h-5 w-5 text-[var(--km-muted)]" />
                </button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--km-primary-soft)] text-[var(--km-primary)]">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--km-text)]">
                    {conversations.find((c) => c.id === selectedConv)?.subject || t('chat', 'Chat')}
                  </h3>
                  <p className="text-xs text-[var(--km-muted)]">{t('messages', 'Messages')}</p>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--km-bg)] px-4 py-4">
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-[var(--km-muted)]">{t('noData', 'No messages yet')}</div>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.sender_id === profile?.id;
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                            mine
                              ? 'bg-[var(--km-primary)] text-white rounded-tr-sm'
                              : 'bg-white border border-[var(--km-border)] text-[var(--km-text)] rounded-tl-sm'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                          <div className="mt-1 flex items-center gap-1 text-[10px] opacity-75">
                            {formatTimeLabel(msg.created_at)}
                            {mine && <CheckCheck className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t border-[var(--km-border)] bg-white px-4 py-3">
                <button type="button" className="hidden items-center gap-1 rounded-lg border border-[var(--km-border)] px-3 py-2 text-sm font-semibold text-[var(--km-text)] lg:flex">
                  <Filter className="h-4 w-4" />
                  {t('attachments', 'Attach')}
                </button>
                <div className="relative flex-1">
                  <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={t('writeComment', 'Write a comment...')}
                    className="h-11 w-full rounded-full border border-[var(--km-border)] px-4 pr-12 text-sm outline-none focus:border-[var(--km-primary)]"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-[var(--km-primary)] p-2 text-white shadow-sm hover:brightness-95"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[var(--km-muted)]">{t('selectConversation', 'Select a conversation')}</div>
          )}
        </section>
      </div>
    </div>
  );
}
