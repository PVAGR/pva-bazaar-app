import React, { useState, useEffect, useRef } from 'react';
import './AgentChat.css';

export default function AgentChat() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState('loading');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check agent status on mount
  useEffect(() => {
    checkAgentStatus();
    loadInitialConversation();
  }, []);

  const checkAgentStatus = async () => {
    try {
      const response = await fetch('/api/agent/status');
      const data = await response.json();
      if (data.ok && data.ollama.status === 'online') {
        setAgentStatus('online');
      } else {
        setAgentStatus('offline');
        setError('Agent service is offline. Trying to connect...');
      }
    } catch (err) {
      setAgentStatus('offline');
      setError('Could not connect to agent service');
    }
  };

  const loadInitialConversation = async () => {
    try {
      const userId = localStorage.getItem('userId') || 'anonymous-' + Date.now();
      localStorage.setItem('userId', userId);

      // Try to load existing conversation
      const response = await fetch(
        `/api/agent/conversations?userId=${encodeURIComponent(userId)}&limit=1`
      );
      const data = await response.json();

      if (data.ok && data.conversations.length > 0) {
        const convo = data.conversations[0];
        setConversationId(convo._id);
        setMessages(convo.messages || []);
      } else {
        // Create new conversation
        const newResponse = await fetch('/api/agent/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: 'Chat with PVA Guardian',
          }),
        });
        const newData = await newResponse.json();
        if (newData.ok) {
          setConversationId(newData.conversation._id);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Load conversation error:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!input.trim() || !conversationId) {
      return;
    }

    if (agentStatus !== 'online') {
      setError('Agent is offline. Please try again later.');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const userId = localStorage.getItem('userId') || 'anonymous';

      // Add user message to UI optimistically
      const userMsg = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Send to API
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: userMessage,
          userId,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        // Add assistant message
        setMessages((prev) => [...prev, data.assistantMessage]);
      } else {
        setError(data.error || 'Failed to send message');
        // Remove optimistic user message on error
        setMessages((prev) => prev.slice(0, -1));
      }
    } catch (err) {
      console.error('Send message error:', err);
      setError('Network error. Please try again.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearConversation = async () => {
    if (!conversationId || !window.confirm('Clear all messages?')) {
      return;
    }

    try {
      const response = await fetch(`/api/agent/conversation/${conversationId}/clear`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.ok) {
        setMessages([]);
      } else {
        setError('Failed to clear conversation');
      }
    } catch (err) {
      setError('Error clearing conversation');
    }
  };

  return (
    <div className="agent-chat">
      <div className="agent-chat__header">
        <div>
          <h2>🤖 Creator's Agent</h2>
          <p className="agent-status">
            Status:{' '}
            <span className={`status-indicator status-${agentStatus}`}>
              {agentStatus === 'online' ? '● Online' : '● Offline'}
            </span>
          </p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearConversation} className="btn-clear" title="Clear conversation">
            ✕
          </button>
        )}
      </div>

      {error && <div className="agent-chat__error">{error}</div>}

      <div className="agent-chat__messages">
        {messages.length === 0 && (
          <div className="agent-chat__welcome">
            <h3>Welcome to Creator's Agent</h3>
            <p>
              I'm an AI guide representing the creator within PVA Bazaar. I can help you:
            </p>
            <ul>
              <li>Understand the platform and its features</li>
              <li>Navigate marketplace and governance</li>
              <li>Learn about artifacts and digital identity</li>
              <li>Follow recent platform developments</li>
            </ul>
            <p>Start a conversation below!</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`message message--${msg.role}`}>
            <div className="message__avatar">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="message__content">
              <p>{msg.content}</p>
              <small className="message__time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </small>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message message--assistant message--loading">
            <div className="message__avatar">🤖</div>
            <div className="message__content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="agent-chat__input-form">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            agentStatus === 'online'
              ? 'Ask me about the platform, features, or ecosystem...'
              : 'Agent is offline'
          }
          disabled={loading || agentStatus !== 'online'}
          className="agent-chat__input"
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || agentStatus !== 'online'}
          className="agent-chat__send"
        >
          {loading ? '⏳' : '✉️'}
        </button>
      </form>
    </div>
  );
}
