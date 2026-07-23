import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, Trash2, History, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const STORAGE_KEY = 'kepsek_agent_date';
const todayStr = () => new Date().toLocaleDateString('id-ID');

export default function AgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Daily auto-clear: if stored date != today, start fresh
    const storedDate = localStorage.getItem(STORAGE_KEY);
    const today = todayStr();
    if (storedDate !== today) {
      setConversation(null);
      setMessages([]);
      localStorage.setItem(STORAGE_KEY, today);
    } else {
      loadActiveConversation();
    }
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadActiveConversation = async () => {
    try {
      const convs = await base44.agents.listConversations({ agent_name: "kepsek_assistant" });
      if (convs && convs.length > 0) {
        setConversation(convs[0]);
        setMessages(convs[0].messages || []);
      }
    } catch (e) { console.error('Load conversations error:', e); }
  };

  const handleClearChat = () => {
    setConversation(null);
    setMessages([]);
    localStorage.setItem(STORAGE_KEY, todayStr());
  };

  const loadHistory = async () => {
    try {
      const convs = await base44.agents.listConversations({ agent_name: "kepsek_assistant" });
      setHistoryList(convs || []);
      setShowHistory(true);
    } catch (e) { console.error('Load history error:', e); }
  };

  const handleSelectHistory = (conv) => {
    setConversation(conv);
    setMessages(conv.messages || []);
    setShowHistory(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    let conv = conversation;
    if (!conv) {
      try {
        conv = await base44.agents.createConversation({
          agent_name: "kepsek_assistant",
          metadata: { name: `Chat ${todayStr()}`, description: "Konsultasi Kepsek" }
        });
        setConversation(conv);
        localStorage.setItem(STORAGE_KEY, todayStr());
      } catch (e) {
        setLoading(false);
        return;
      }
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    try {
      await base44.agents.addMessage(conv, { role: "user", content: userMessage });
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/40 flex items-center justify-center text-white"
      >
        {isOpen ? <X className="w-7 h-7" /> : <Bot className="w-7 h-7" />}
        {!isOpen && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm">AI Assistant Kepsek</h3>
                <p className="text-white/70 text-xs">Tanya apapun tentang data sekolah</p>
              </div>
              <button onClick={loadHistory} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title="Riwayat Chat">
                <History className="w-4 h-4 text-white" />
              </button>
              <button onClick={handleClearChat} className="p-2 rounded-lg bg-white/10 hover:bg-red-500/30 transition-colors" title="Clear Chat">
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* History Panel */}
            {showHistory ? (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-800 rounded-lg">
                    <ArrowLeft className="w-4 h-4 text-slate-400" />
                  </button>
                  <p className="text-slate-300 font-medium text-sm">Riwayat Chat</p>
                </div>
                {historyList.length > 0 ? (
                  <div className="space-y-2">
                    {historyList.map((conv, i) => {
                      const firstMsg = conv.messages?.find(m => m.role === 'user');
                      return (
                        <button key={i} onClick={() => handleSelectHistory(conv)} className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
                          <p className="text-slate-200 text-sm font-medium truncate">
                            {firstMsg?.content || conv.metadata?.name || 'Chat'}
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5">
                            {conv.created_date ? new Date(conv.created_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Belum ada riwayat chat</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center py-8">
                      <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-300 text-sm font-medium">Halo! Saya AI Assistant Anda.</p>
                      <p className="text-slate-500 text-xs mt-1">Tanyakan apapun tentang data sekolah.</p>
                      <div className="mt-4 space-y-2">
                        {[
                          "Berapa persentase kehadiran hari ini?",
                          "Siapa siswa yang alfa 3 hari berturut-turut?",
                          "Berapa total pemasukan bulan ini?",
                          "Kegiatan apa saja minggu depan?"
                        ].map((s, i) => (
                          <button key={i} onClick={() => setInput(s)} className="block w-full text-left p-2.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors">
                            💬 {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 rounded-2xl px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-slate-700 flex gap-2 flex-shrink-0">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ketik pertanyaan..."
                    className="flex-1 bg-slate-800 text-white text-sm rounded-xl px-4 py-2.5 border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button onClick={handleSend} disabled={!input.trim() || loading} className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <ReactMarkdown className="text-sm prose prose-sm prose-invert max-w-none">{message.content}</ReactMarkdown>
        )}
        {message.tool_calls?.map((tc, i) => (
          <div key={i} className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Membaca data: {tc.name}
          </div>
        ))}
      </div>
    </div>
  );
}