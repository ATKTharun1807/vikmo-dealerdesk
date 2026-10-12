import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  User,
  Sparkles,
  Wrench,
  CheckCircle,
  FileText,
  RotateCcw,
  Tag,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { AssistantMessage, Dealer } from '../types';
import { ApiService } from '../api';

interface AssistantChatViewProps {
  selectedDealer: Dealer | undefined;
  onViewOrder: (orderNumber: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AssistantChatView: React.FC<AssistantChatViewProps> = ({
  selectedDealer,
  onViewOrder,
  showToast,
}) => {
  const [sessionId, setSessionId] = useState<string>(() => `sess-${Date.now().toString(36)}`);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: "Hello! I am your AI DealerDesk Assistant. I can search catalogue parts by vehicle fitment, check live warehouse stock, or generate draft orders for you. What are you looking for today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Do you have brake pads for a Duke 390?',
    'Check live stock for BRK-1044',
    'Order 5 units of BRK-1044',
    'What chain lubricants fit the Pulsar 220?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;
    if (!selectedDealer) {
      showToast('Please select an active dealer first.', 'error');
      return;
    }

    const userMsg: AssistantMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await ApiService.chatWithAssistant(sessionId, selectedDealer.id, userMsg.text);

      const assistantMsg: AssistantMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cited_skus: res.cited_skus,
        tool_calls: res.tool_calls,
        actions: res.actions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errObj = err?.error || {};
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Error: ${errObj.message || 'Could not reach assistant service.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = () => {
    const newSession = `sess-${Date.now().toString(36)}`;
    setSessionId(newSession);
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'assistant',
        text: `Started new session (${newSession}). Conversation memory has been cleared. How can I assist you?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    showToast('Started new assistant session.', 'info');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '20px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Dealer Assistant
            </h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '6px',
            }}>
              GenAI Agent
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
            Powered by tool calling (`search_parts`, `check_stock`, `create_draft_order`) with database grounding.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--bg-surface)',
            padding: '4px 8px',
            borderRadius: '6px',
            color: 'var(--text-dim)',
          }}>
            Session: {sessionId}
          </span>
          <button
            onClick={handleResetSession}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
            }}
          >
            <RotateCcw size={14} />
            <span>Reset Session</span>
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="glass-panel" style={{
        height: '620px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#111827',
        overflow: 'hidden',
      }}>
        {/* Messages Body */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}>
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: isUser ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: `1px solid ${isUser ? 'rgba(59, 130, 246, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                }}>
                  {isUser ? <User size={18} color="#60a5fa" /> : <Bot size={18} color="var(--primary)" />}
                </div>

                {/* Bubble Content */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    backgroundColor: isUser ? '#1e3a8a' : 'var(--bg-surface)',
                    color: '#fff',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: `1px solid ${isUser ? 'rgba(59, 130, 246, 0.3)' : 'var(--border-color)'}`,
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {m.text}
                  </div>

                  {/* Cited SKUs Pills */}
                  {m.cited_skus && m.cited_skus.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', alignSelf: 'center' }}>
                        Cited Parts:
                      </span>
                      {m.cited_skus.map((sku) => (
                        <span
                          key={sku}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: 'var(--primary)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                          }}
                        >
                          {sku}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Tool Calls Inspector */}
                  {m.tool_calls && m.tool_calls.length > 0 && (
                    <div style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a78bfa' }}>
                        <Wrench size={13} />
                        <strong>Tool Calls Executed ({m.tool_calls.length}):</strong>
                      </div>
                      {m.tool_calls.map((t, i) => (
                        <div key={i} style={{ paddingLeft: '8px' }}>
                          <span style={{ color: '#38bdf8' }}>{t.name}</span>
                          <span style={{ color: 'var(--text-dim)' }}>({JSON.stringify(t.arguments)})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Order Created Action Button */}
                  {m.actions && m.actions.map((act, i) => {
                    if (act.type === 'draft_order_created' && act.order_number) {
                      return (
                        <button
                          key={i}
                          onClick={() => onViewOrder(act.order_number!)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle size={14} />
                          <span>View Created Order #{act.order_number}</span>
                          <ExternalLink size={12} />
                        </button>
                      );
                    }
                    return null;
                  })}

                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: '0 4px' }}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <div className="pulse-dot" style={{ backgroundColor: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }} />
              <span>Dealer Assistant is querying parts and checking live stock...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}>
          {quickPrompts.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(q)}
              disabled={loading}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                whiteSpace: 'nowrap',
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder={selectedDealer ? `Ask about parts or place orders for ${selectedDealer.name}...` : 'Select a dealer first...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={loading}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '12px 16px',
              color: '#fff',
              fontSize: '0.92rem',
            }}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            style={{
              backgroundColor: input.trim() ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
              color: input.trim() ? '#000' : 'var(--text-dim)',
              border: 'none',
              padding: '12px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
