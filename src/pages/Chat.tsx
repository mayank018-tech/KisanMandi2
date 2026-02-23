import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
// language not used in this page
import { supabase } from '../lib/supabase';
import { Send, ArrowLeft } from 'lucide-react';

export default function Chat() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    try {
      const { data } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversations(*)')
        .eq('user_id', profile?.id)
        .order('conversation_id', { ascending: false });

      if (data) {
        const convs = data.map((cp: any) => cp.conversations);
        setConversations(convs);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to load conversations', err);
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*, user_profiles:sender_id(user_profiles!inner(*))')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleSelectConv = (convId: string) => {
    setSelectedConv(convId);
    loadMessages(convId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !selectedConv || !messageText.trim()) return;

    const newMsg = { id: `temp-${Date.now()}`, content: messageText, sender_id: profile.id, created_at: 'now', user_profiles: { full_name: profile.full_name } };
    setMessages((s) => [...s, newMsg]);
    setMessageText('');

    try {
      const { data, error } = await supabase.from('messages').insert([
        { conversation_id: selectedConv, sender_id: profile.id, content: messageText },
      ]).select().single();

      if (error) throw error;
      setMessages((s) => s.map((m) => (m.id === newMsg.id ? data : m)));
    } catch (err) {
      console.error('Failed to send message', err);
      setMessages((s) => s.filter((m) => m.id !== newMsg.id));
      alert('Failed to send message');
    }
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center">Please login to access chat.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row pb-16 md:pb-20">
      <div className={`md:w-1/4 bg-white shadow-md md:border-r border-gray-200 ${selectedConv ? 'hidden md:flex' : 'flex'} flex-col`}>
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-gray-500">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-gray-500">No conversations yet</div>
          ) : (
            conversations.map((conv: any) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConv(conv.id)}
                className={`w-full text-left p-4 border-b hover:bg-gray-50 ${ selectedConv === conv.id ? 'bg-green-50' : ''}`}
              >
                <div className="font-semibold text-sm truncate">{conv.subject || 'Chat'}</div>
                <div className="text-xs text-gray-500 truncate">{conv.last_message || 'No messages'}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedConv && (
        <div className={`md:w-3/4 w-full flex flex-col`}>
          <div className="p-4 bg-white border-b flex items-center justify-between">
            <button onClick={() => setSelectedConv(null)} className="md:hidden">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="font-semibold">{conversations.find((c) => c.id === selectedConv)?.subject || 'Chat'}</h3>
            <div />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md px-4 py-3 rounded-2xl ${msg.sender_id === profile?.id ? 'bg-green-600 text-white' : 'bg-white border border-gray-200'}`}>
                  <div className="text-sm leading-relaxed">{msg.content}</div>
                  <div className="text-xs opacity-60 mt-2 text-right">{new Date(msg.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex gap-3 items-center">
            <input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-full focus:ring-2 focus:ring-green-400"
              placeholder="Type a message..."
            />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-full shadow-md">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
