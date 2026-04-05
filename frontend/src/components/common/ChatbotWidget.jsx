import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import api from '../../utils/api';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';

const SUGGESTIONS = [
  'What are my recent test scores?',
  'Explain Binary Search with code',
  'How do I improve my aptitude score?',
  'What is my leaderboard rank?',
  'Explain Dynamic Programming',
  'Tips for technical interviews',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-[#4F7CF3]"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm **Swarna**, your AI assistant 🎓\n\nI can help you with your scores, explain topics, track your progress, and answer any questions about the platform. What would you like to know?",
      id: 'init',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const bottomRef = useRef(null);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  };

  const sendMessage = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: trimmed, id: Date.now() };
    const historyForApi = messages
      .filter((m) => m.id !== 'init')
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await api.post('/chatbot/chat', {
        message: trimmed,
        history: historyForApi,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, id: Date.now() + 1 },
      ]);
    } catch (err) {
      const errMsg =
        err?.response?.data?.detail ||
        'Sorry, I encountered an error. Please try again.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errMsg}`, id: Date.now() + 1 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    try {
      await api.delete('/chatbot/history');
    } catch {}
    setMessages([
      {
        role: 'assistant',
        content: "Chat cleared! I'm here to help. What would you like to know?",
        id: Date.now(),
      },
    ]);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl shadow-[0_8px_32px_rgba(79,124,243,0.4)] flex items-center justify-center text-white"
        style={{ background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' }}
        aria-label="Open chatbot"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <CloseRoundedIcon />
            </motion.span>
          ) : (
            <motion.span key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <SmartToyRoundedIcon />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring */}
        {!open && (
          <motion.span
            className="absolute inset-0 rounded-2xl border-2 border-[#4F7CF3]"
            animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] flex flex-col rounded-3xl border border-theme bg-surface-card shadow-[0_24px_64px_rgba(15,23,42,0.2)] overflow-hidden"
            style={{ height: '520px' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-theme" style={{ background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' }}>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <AutoAwesomeRoundedIcon className="text-white" sx={{ fontSize: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Swarna AI</p>
                <p className="text-white/70 text-xs">Your academic assistant</p>
              </div>
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                title="Clear chat"
              >
                <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={bodyRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
              data-lenis-prevent
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-white mt-1" style={{ background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' }}>
                      <SmartToyRoundedIcon sx={{ fontSize: 14 }} />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-white rounded-tr-sm'
                        : 'bg-surface-lighter text-primary rounded-tl-sm border border-theme'
                    }`}
                    style={msg.role === 'user' ? { background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' } : {}}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-xs max-w-none dark:prose-invert [&_code]:bg-black/10 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-black/10 [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_p]:mb-1 [&_ul]:mb-1 [&_li]:mb-0.5">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span>{msg.content}</span>
                    )}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' }}>
                    <SmartToyRoundedIcon sx={{ fontSize: 14 }} />
                  </div>
                  <div className="bg-surface-lighter border border-theme rounded-2xl rounded-tl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {showScrollBtn && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-20 right-4 w-8 h-8 rounded-full bg-surface-card border border-theme shadow-soft flex items-center justify-center text-secondary hover:text-primary"
                >
                  <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Suggestions */}
            {messages.length <= 2 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-2.5 py-1 rounded-full border border-theme bg-surface hover:border-[#4F7CF3] hover:text-[#4F7CF3] transition-colors text-secondary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-theme">
              <div className="flex items-end gap-2 rounded-2xl border border-theme bg-surface px-3 py-2 focus-within:border-[#4F7CF3] focus-within:shadow-[0_0_0_3px_rgba(79,124,243,0.1)] transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything…"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted resize-none outline-none min-h-[20px] max-h-24"
                  style={{ lineHeight: '1.4' }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#4F7CF3,#7C8CFF)' }}
                >
                  <SendRoundedIcon sx={{ fontSize: 16 }} />
                </button>
              </div>
              <p className="text-center text-muted text-[10px] mt-1.5">Powered by Groq · Llama 3</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
