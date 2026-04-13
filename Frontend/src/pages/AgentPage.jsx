import React from 'react';
import { Helmet } from 'react-helmet-async';
import AgentChat from '../components/AgentChat';
import './AgentPage.css';

export default function AgentPage() {
  return (
    <>
      <Helmet>
        <title>Creator's Agent - PVA Bazaar</title>
        <meta name="description" content="Chat with the Creator's AI agent inside PVA Bazaar" />
      </Helmet>

      <div className="agent-page">
        <section className="agent-page__header section-card">
          <h1>🤖 Creator's Agent</h1>
          <p className="agent-tagline">
            An AI guide representing the creator within the PVA Bazaar ecosystem
          </p>
          <div className="agent-features">
            <div className="feature">
              <span>💭</span>
              <p>Conversational guidance about the platform</p>
            </div>
            <div className="feature">
              <span>🧠</span>
              <p>Persistent memory of conversations</p>
            </div>
            <div className="feature">
              <span>📚</span>
              <p>Access to platform documentation</p>
            </div>
            <div className="feature">
              <span>🎯</span>
              <p>Real-time awareness of platform changes</p>
            </div>
          </div>
        </section>

        <section className="agent-page__chat section-card">
          <AgentChat />
        </section>

        <section className="agent-page__about section-card">
          <h2>About the Creator's Agent</h2>
          
          <div className="info-grid">
            <div className="info-block">
              <h3>🎭 Identity</h3>
              <p>
                The agent represents the creator's vision and values within PVA Bazaar.
                It acts as an intermediary between users and the creator, providing
                consistent guidance rooted in platform philosophy.
              </p>
            </div>

            <div className="info-block">
              <h3>🧠 Memory System</h3>
              <p>
                Conversations are stored in MongoDB with full history. The agent can
                recall previous interactions and context, enabling truly persistent
                relationships with users.
              </p>
            </div>

            <div className="info-block">
              <h3>⚡ AI Engine</h3>
              <p>
                Powered by Ollama with open-source language models. Runs locally,
                ensuring privacy and data sovereignty while maintaining low latency.
              </p>
            </div>

            <div className="info-block">
              <h3>🔗 Platform Integration</h3>
              <p>
                The agent has access to platform state, recent changes, and ecosystem
                information. It provides real-time, contextually-aware responses.
              </p>
            </div>
          </div>

          <div className="capabilities">
            <h3>What the Agent Can Help With</h3>
            <ul>
              <li>Understanding the marketplace and artifact trading</li>
              <li>Navigating citizen identity and passport systems</li>
              <li>Learning about governance and voting mechanisms</li>
              <li>Discovering archive and journal features</li>
              <li>Exploring blockchain integrations and provenance</li>
              <li>Getting help with platform navigation</li>
              <li>Discussing the creator's vision and values</li>
            </ul>
          </div>

          <div className="tech-stack">
            <h3>Technology Stack</h3>
            <div className="tech-grid">
              <div className="tech-item">
                <strong>AI Model:</strong> Ollama with llama3.1
              </div>
              <div className="tech-item">
                <strong>Memory:</strong> MongoDB (ConversationThread collection)
              </div>
              <div className="tech-item">
                <strong>API:</strong> Express.js with RESTful endpoints
              </div>
              <div className="tech-item">
                <strong>Frontend:</strong> React with real-time chat UI
              </div>
              <div className="tech-item">
                <strong>Context:</strong> Platform state from git, APIs, and database
              </div>
              <div className="tech-item">
                <strong>Privacy:</strong> Data stored locally, no external AI APIs
              </div>
            </div>
          </div>
        </section>

        <section className="agent-page__faq section-card">
          <h2>Frequently Asked Questions</h2>

          <div className="faq-item">
            <h4>How does the agent learn?</h4>
            <p>
              The agent learns through conversation context. Each interaction is stored,
              and the AI model uses recent conversation history to inform its responses,
              allowing it to adapt to user communication style over time.
            </p>
          </div>

          <div className="faq-item">
            <h4>Is my data private?</h4>
            <p>
              Yes. Conversations are stored in your local MongoDB instance. No data is
              sent to external AI services. The agent runs on your infrastructure,
              ensuring complete data sovereignty.
            </p>
          </div>

          <div className="faq-item">
            <h4>Can the agent make changes to the platform?</h4>
            <p>
              The agent is read-only and observational. It cannot directly modify
              platform data, artifacts, or settings. It provides guidance and
              information only.
            </p>
          </div>

          <div className="faq-item">
            <h4>How is the agent connected to platform changes?</h4>
            <p>
              The agent has access to OpenClaw memory logs, git commit history, and
              API endpoints to understand recent platform changes and ecosystem state.
              This allows it to provide current, contextual responses.
            </p>
          </div>

          <div className="faq-item">
            <h4>Can multiple people talk to the same agent?</h4>
            <p>
              Yes. The agent maintains separate conversation threads for different
              users, allowing it to provide personalized guidance to multiple people
              while maintaining distinct conversation histories.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
