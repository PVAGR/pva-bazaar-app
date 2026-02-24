import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../lib/api';
import { getToken } from '../lib/auth';
import '../styles/admin-common.css';
import './ChatPage.css';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    const el = messagesEndRef.current;
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => scrollToBottom(), [messages]);

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await apiPost('/chat', { messages: history });
      if (!res?.ok) throw new Error(res?.error || 'Failed to get reply');
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Chat failed');
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  const isLoggedIn = !!getToken();

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="chat-header-links">
          <Link to="/" className="chat-back-link">← pvabazaar.org</Link>
          {isLoggedIn ? <Link to="/broker" className="chat-back-link">Broker Hub</Link> : null}
        </div>
        <h1>Chat with Richard</h1>
        <p className="muted">
          Direct supply chain sourcer — Kenyan coffee, Congolese malachite, Kenyan soapstone, Afghan/Pakistani gemstones.
          Reach Richard at pvaglobalreach@gmail.com or pvabazaar.com.
        </p>
        {isLoggedIn ? <span className="chat-badge">Your data used for context</span> : null}
      </header>

      <main className="chat-main">
        {error ? (
          <div className="chat-error">
            {error}
            <button type="button" className="btn ghost" onClick={() => setError('')}>Dismiss</button>
          </div>
        ) : null}

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <p>Ask Richard about sourcing, vetting suppliers, or partnership opportunities.</p>
              <p className="muted small">e.g. &quot;What should I look for when vetting a coffee supplier?&quot;</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                <div className="chat-bubble-label">{m.role === 'user' ? 'You' : 'Richard'}</div>
                <div className="chat-bubble-content">{m.content}</div>
              </div>
            ))
          )}
          {loading ? (
            <div className="chat-bubble assistant">
              <div className="chat-bubble-label">Richard</div>
              <div className="chat-bubble-content typing">...</div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={sendMessage}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Richard..."
            disabled={loading}
          />
          <button type="submit" className="btn primary" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
