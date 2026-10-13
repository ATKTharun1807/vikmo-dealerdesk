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
  Mic,
  MicOff,
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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Do you have brake pads for a Duke 390?',
    'Check live stock for BRK-1044',
    'Are there any out of stock parts?',
    'Order 5 units of BRK-1044',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Initialize SpeechRecognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Microphone active. Speak your question...', 'info');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          showToast(`Voice error: ${event.error}`, 'error');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      showToast('Voice speech recognition is not supported in this browser. Please use Chrome/Edge.', 'error');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (err) {}
        }, 150);
      }
    }
  };

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
    <div style={{ width: '100%' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Operations Copilot
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--tab-active-bg)',
              color: 'var(--tab-active-text)',
              border: '1px solid var(--tab-active-border)',
              padding: '3px 9px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.02em',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 6px var(--primary)' }} />
              Live ERP Grounding · Gemini AI
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Enterprise assistant for real-time parts lookup, vehicle fitment intelligence, and automated dealer orders.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--surface-1)',
            padding: '5px 10px',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}>
            Session: {sessionId}
          </span>
          <button
            onClick={handleResetSession}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--surface-1)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              padding: '6px 12px',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <RotateCcw size={13} />
            <span>Reset Session</span>
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div style={{
        height: '620px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--chat-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
      }}>
        {/* Messages Body */}
        <div style={{
          flex: 1,
          padding: '20px 24px',
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
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  backgroundColor: isUser ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: isUser ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border)',
                }}>
                  {isUser ? <User size={16} color="var(--primary)" /> : <Bot size={16} color="var(--primary)" />}
                </div>

                {/* Bubble Content */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    backgroundColor: isUser ? 'var(--chat-user-bg)' : 'var(--chat-assistant-bg)',
                    color: isUser ? 'var(--chat-user-text)' : 'var(--chat-assistant-text)',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: `1px solid ${isUser ? 'var(--chat-user-border)' : 'var(--chat-assistant-border)'}`,
                    fontSize: '13.5px',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}>
                    {m.text}
                  </div>

                  {/* Cited SKUs Pills */}
                  {m.cited_skus && m.cited_skus.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Verified Stock SKUs:
                      </span>
                      {m.cited_skus.map((sku) => (
                        <span
                          key={sku}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--primary)',
                            padding: '2px 7px',
                            borderRadius: '5px',
                            border: '1px solid rgba(16, 185, 129, 0.28)',
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
                      backgroundColor: 'var(--surface-0)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                        <Sparkles size={12} />
                        <strong>Live ERP Trace ({m.tool_calls.length} queries executed):</strong>
                      </div>
                      {m.tool_calls.map((t, i) => (
                        <div key={i} style={{ paddingLeft: '8px' }}>
                          <span style={{ color: '#0284c7' }}>{t.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>({JSON.stringify(t.arguments)})</span>
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
                            gap: '7px',
                            backgroundColor: 'var(--badge-ok-bg)',
                            color: 'var(--badge-ok-text)',
                            border: '1px solid var(--badge-ok-border)',
                            padding: '7px 14px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                          }}
                        >
                          <CheckCircle size={15} />
                          <span>View Created Order #{act.order_number}</span>
                          <ExternalLink size={13} />
                        </button>
                      );
                    }
                    return null;
                  })}

                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: '0 4px' }}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />
              <span>Operations Copilot is querying catalogue database & checking stock...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface-0)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
            Quick Prompts:
          </span>
          {quickPrompts.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(q)}
              disabled={loading}
              style={{
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '4px 11px',
                borderRadius: '6px',
                fontSize: '11.5px',
                whiteSpace: 'nowrap',
                fontWeight: 500,
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--surface-1)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder={selectedDealer ? `Ask about parts, stock, or draft orders for ${selectedDealer.name}...` : 'Select a dealer first...'}
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
              backgroundColor: 'var(--surface-0)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />

          {/* Voice Microphone Input Button */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            title={isListening ? "Listening... Click to stop recording" : "Click to speak with voice"}
            style={{
              backgroundColor: isListening ? 'rgba(239, 68, 68, 0.2)' : 'var(--surface-0)',
              color: isListening ? '#f87171' : 'var(--text-secondary)',
              border: isListening ? '1px solid #ef4444' : '1px solid var(--border)',
              padding: '10px 13px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isListening ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none',
            }}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !input.trim()}
            className="btn"
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              opacity: (!input.trim() || loading) ? 0.45 : 1,
              cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
            }}
          >
            <Send size={15} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
