import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import styles from './AIHelpChat.module.css';

/**
 * AI Help Chat Component - Interactive AI assistant for sellers
 */
const AIHelpChat = ({ userId, defaultTopic = 'general' }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      message: '👋 Hi! I\'m your PVA Assistant. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [topic, setTopic] = useState(defaultTopic);
  const [showGuides, setShowGuides] = useState(false);
  const messagesEndRef = useRef(null);

  const topics = ['pricing', 'registration', 'shipping', 'compliance', 'marketing', 'onboarding'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = { role: 'user', message: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiFetch('/api/ai-help/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          question: input,
          topic,
          sessionId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSessionId(data.sessionId);
        const assistantMessage = {
          role: 'assistant',
          message: data.response,
          suggestions: data.suggestions,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMsg = {
          role: 'assistant',
          message: '❌ Sorry, I encountered an error. Please try again.',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMsg = {
        role: 'assistant',
        message: '❌ Connection error. Please check your internet and try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuide = async (selectedTopic) => {
    try {
      const response = await apiFetch(`/api/ai-help/guides/${selectedTopic}`);
      const guide = await response.json();

      const message = {
        role: 'assistant',
        message: `📚 **${guide.title}**\n\n${guide.sections.map((s) => `**${s.heading}**\n${s.content}`).join('\n\n')}`,
      };
      setMessages((prev) => [...prev, message]);
    } catch (err) {
      console.error('Error fetching guide:', err);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <h3>🤖 PVA AI Assistant</h3>
        <button
          className={styles.guideBtn}
          onClick={() => setShowGuides(!showGuides)}
        >
          📖 Guides
        </button>
      </div>

      {showGuides && (
        <div className={styles.guidesMenu}>
          {topics.map((t) => (
            <button
              key={t}
              className={styles.guideOption}
              onClick={() => {
                fetchGuide(t);
                setTopic(t);
                setShowGuides(false);
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className={styles.messages}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`${styles.message} ${styles[msg.role]}`}>
            <p>{msg.message}</p>
            {msg.suggestions && (
              <div className={styles.suggestions}>
                {msg.suggestions.map((suggestion, sidx) => (
                  <button
                    key={sidx}
                    className={styles.suggestionBtn}
                    onClick={() => {
                      setInput(suggestion);
                    }}
                  >
                    💡 {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <div className={styles.loading}>AI typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask me anything..."
          disabled={loading}
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>

      <div className={styles.footer}>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className={styles.topicSelect}
        >
          {topics.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AIHelpChat;
