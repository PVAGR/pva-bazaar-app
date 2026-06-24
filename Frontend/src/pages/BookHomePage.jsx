import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './BookHomePage.css';

const BOOK_DATA = {
  title: 'This or That',
  subtitle: 'A Book of Teachings',
  author: 'Richard Torres',
  publisher: 'PVA Bazaar',
  description: `A profound exploration of human purpose, choice, and the architecture of civilization. "This or That" traverses the fundamental questions of existence—why we are here, what makes life worth living, the nature of choice between false binaries, and the path toward a restored world under divine law.`,
  longDescription: `This book is a complete civilizational framework disguised as a teaching. It moves through nine parts: Purpose, This or That, The Self, God, Humanity, The Age of Deception, The New Human, Satya Yuga, and The Future. Each chapter builds toward a comprehensive vision of human flourishing—from the individual soul to the universal civilization.`,
  chapters: [
    { part: 'I', title: 'Purpose', chapters: ['Why Are We Here?', 'Purpose vs Occupation', 'The Search for Meaning', 'Human Potential', 'What Makes Life Worth Living?'] },
    { part: 'II', title: 'This or That', chapters: ['The Nature of Choice', 'Cause and Effect', 'The Grey Door', 'The Third Door', 'Balance'] },
    { part: 'III', title: 'The Self', chapters: ['Mind', 'Body', 'Trauma', 'Memory', 'Consciousness', 'The Biological Computer', 'The Infinite Potential Within'] },
    { part: 'IV', title: 'God', chapters: ['The Question of God', 'Religion and Civilization', 'The Prophets', "God's Law, Asha, and Druj", 'The Soul', 'Faith and Doubt', 'Death and Return'] },
    { part: 'V', title: 'Humanity', chapters: ['Family', 'Clan', 'Community', 'Nation', 'Civilization', 'Humanity'] },
    { part: 'VI', title: 'The Age of Deception', chapters: ['Money', 'Empire', 'Labor', 'Education', 'Technology', 'Media', 'Power', 'Politics', 'Manufactured Division', 'The Rat Race'] },
    { part: 'VII', title: 'The New Human', chapters: ['The Education of the New Human', 'Profession', 'Service', 'Love', 'Family: The First Commonwealth', 'Mastery: The Discipline of the Gift', 'Responsibility: The Weight of Receiving'] },
    { part: 'VIII', title: 'Satya Yuga', chapters: ['The End of the Old World', 'The Sovereign Bazaar', 'The Community Commonwealth', 'Free Homes', 'New Governance', 'The Three Vote System', 'Technology as Tool', 'Living With Nature'] },
    { part: 'IX', title: 'The Future', chapters: ['Aether-Zamin', 'The Universal Civilization: The Ordered Family of Peoples', 'The Return of Purpose', 'The Restoration of Asha', "God's World and Its Children", 'Live Well'] },
  ],
  themes: ['Purpose', 'Civilization', 'Truth', 'Divine Law', 'Human Potential', 'Sacred Economics', 'Restoration'],
  format: 'PDF',
  pages: 400,
  language: 'English',
  isbn: '978-0-9999999-0-0',
};

export default function BookHomePage() {
  const [showChapters, setShowChapters] = useState(false);
  const [downloadModal, setDownloadModal] = useState(false);
  const [downloadType, setDownloadType] = useState('free');

  return (
    <>
      <Helmet>
        <title>This or That — A Book of Teachings by Richard Torres | PVA Bazaar</title>
        <meta name="description" content="Read 'This or That' by Richard Torres — A profound book of teachings on purpose, choice, civilization, and the restoration of divine order. Free download available." />
        <meta property="og:title" content="This or That — A Book of Teachings" />
        <meta property="og:description" content="A profound exploration of human purpose, choice, and the architecture of civilization by Richard Torres." />
        <meta property="og:type" content="book" />
        <meta property="og:image" content="/book-cover.jpg" />
      </Helmet>

      <div className="book-home">
        <header className="book-home__hero">
          <div className="book-home__heroContent">
            <p className="pill book-home__tagline">PVA Bazaar Publications</p>
            <h1 className="book-home__title">This or That</h1>
            <p className="book-home__subtitle">A Book of Teachings</p>
            <p className="book-home__author">By Richard Torres</p>
            <p className="book-home__publisher">Published by PVA Bazaar · pvabazaar.org</p>

            <div className="book-home__heroActions">
              <button 
                className="book-home__btn book-home__btn--primary"
                onClick={() => { setDownloadType('free'); setDownloadModal(true); }}
              >
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download Free PDF
              </button>
              <button 
                className="book-home__btn book-home__btn--secondary"
                onClick={() => { setDownloadType('supported'); setDownloadModal(true); }}
              >
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21C17 21 21 17 21 12A9 9 0 0 0 12 3 9 9 0 0 0 3 12a9 9 0 0 0 9 9z" />
                  <path d="M12 7v10M7 12h10" />
                </svg>
                Support the Work
              </button>
              <Link className="book-home__btn book-home__btn--ghost" to="/books">
                View All Books
              </Link>
            </div>

            <div className="book-home__meta">
              <span>{BOOK_DATA.pages} pages</span>
              <span>·</span>
              <span>{BOOK_DATA.format}</span>
              <span>·</span>
              <span>{BOOK_DATA.language}</span>
              <span>·</span>
              <span>ISBN: {BOOK_DATA.isbn}</span>
            </div>
          </div>

          <aside className="book-home__cover" aria-label="Book cover">
            <div className="book-cover">
              <div className="book-cover__spine"></div>
              <div className="book-cover__front">
                <h2>This or That</h2>
                <p className="book-cover__subtitle">A Book of Teachings</p>
                <p className="book-cover__author">Richard Torres</p>
                <div className="book-cover__publisher">PVA Bazaar</div>
              </div>
            </div>
          </aside>
        </header>

        <section className="section-card book-home__description">
          <div className="book-home__descContent">
            <h2>About This Book</h2>
            <p>{BOOK_DATA.description}</p>
            <p>{BOOK_DATA.longDescription}</p>
            
            <div className="book-home__themes">
              {BOOK_DATA.themes.map((theme) => (
                <span key={theme} className="theme-tag">{theme}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="section-card book-home__chapters">
          <div className="book-home__sectionHead">
            <div>
              <p className="pill">Contents</p>
              <h2>Nine Parts · Sixty Chapters</h2>
            </div>
            <button 
              className="book-home__toggle"
              onClick={() => setShowChapters(!showChapters)}
            >
              {showChapters ? 'Collapse' : 'Expand'} Table of Contents
              <svg className={`icon ${showChapters ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {showChapters && (
            <div className="book-home__toc">
              {BOOK_DATA.chapters.map((part) => (
                <div key={part.part} className="book-home__part">
                  <h3 className="book-home__partLabel">Part {part.part} — {part.title}</h3>
                  <ul>
                    {part.chapters.map((ch, i) => (
                      <li key={i}>{ch}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section-card book-home__support">
          <h2>Support This Work</h2>
          <p>This book and the PVA Bazaar platform are sustained by readers like you. Every contribution keeps the work free, the platform sovereign, and the mission alive.</p>
          
          <div className="book-home__supportTiers">
            <article className="support-tier">
              <h3>Free Reader</h3>
              <p className="tier-price">$0</p>
              <ul>
                <li>Full PDF download</li>
                <li>Access to all chapters online</li>
                <li>Community forum access</li>
              </ul>
              <button className="tier-btn" onClick={() => { setDownloadType('free'); setDownloadModal(true); }}>Download Free</button>
            </article>

            <article className="support-tier featured">
              <h3>Supporter</h3>
              <p className="tier-price">$15 <span>/ once</span></p>
              <ul>
                <li>Everything in Free</li>
                <li>Early access to new chapters</li>
                <li>Supporter badge on profile</li>
                <li>Monthly behind-the-scenes updates</li>
              </ul>
              <button className="tier-btn tier-btn--primary" onClick={() => { setDownloadType('supported'); setDownloadModal(true); }}>Support & Download</button>
            </article>

            <article className="support-tier">
              <h3>Patron</h3>
              <p className="tier-price">$50 <span>/ once</span></p>
              <ul>
                <li>Everything in Supporter</li>
                <li>Signed digital certificate</li>
                <li>Quarterly live Q&A with author</li>
                <li>Name in acknowledgments (future editions)</li>
              </ul>
              <button className="tier-btn" onClick={() => { setDownloadType('patron'); setDownloadModal(true); }}>Become a Patron</button>
            </article>
          </div>
        </section>

        <section className="section-card book-home__marketplace">
          <h2>Also Available in the Marketplace</h2>
          <p>Purchase a physical edition, merchandise, or gift a copy through the sovereign bazaar.</p>
          <Link className="book-home__marketplaceBtn" to="/marketplace?category=Books">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Browse Marketplace
          </Link>
        </section>

        <footer className="book-home__footer">
          <p>Published by <strong>PVA Bazaar</strong> — A civilization platform for memory, trade, and accountable decisions.</p>
          <p><a href="https://pvabazaar.org" target="_blank" rel="noreferrer">pvabazaar.org</a></p>
          <div className="book-home__footerLinks">
            <Link to="/about">About PVA Bazaar</Link>
            <Link to="/books">All Books</Link>
            <Link to="/marketplace">Marketplace</Link>
            <Link to="/creator">Supplier Portal</Link>
          </div>
        </footer>

        {downloadModal && (
          <div className="modal-overlay" onClick={() => setDownloadModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setDownloadModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <h2>{downloadType === 'free' ? 'Free Download' : downloadType === 'supported' ? 'Support & Download' : 'Become a Patron'}</h2>
              
              {downloadType === 'free' && (
                <div className="modal-free">
                  <p>Your download will begin immediately. No email required.</p>
                  <a 
                    href="/books/This_or_That_CLEAN_WORKING_MASTER.pdf" 
                    download="This_or_That_by_Richard_Torres.pdf"
                    className="modal-downloadBtn"
                    onClick={() => setDownloadModal(false)}
                  >
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    Download PDF (Free)
                  </a>
                  <p className="modal-note">If you value this work, consider supporting the mission.</p>
                </div>
              )}

              {downloadType !== 'free' && (
                <div className="modal-support">
                  <p>Support tier: <strong>{downloadType === 'supported' ? 'Supporter ($15)' : 'Patron ($50)'}</strong></p>
                  <p>Payment integration coming soon. For now, download free and support via:</p>
                  <div className="modal-paymentOptions">
                    <a href="https://pvabazaar.org/donate" target="_blank" rel="noreferrer" className="payment-option">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21C17 21 21 17 21 12A9 9 0 0 0 12 3 9 9 0 0 0 3 12a9 9 0 0 0 9 9z"/><path d="M12 7v10M7 12h10"/></svg>
                      Donate on PVA Bazaar
                    </a>
                    <a href="https://github.com/sponsors" target="_blank" rel="noreferrer" className="payment-option">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21C17 21 21 17 21 12A9 9 0 0 0 12 3 9 9 0 0 0 3 12a9 9 0 0 0 9 9z"/><path d="M12 7v10M7 12h10"/></svg>
                      GitHub Sponsors
                    </a>
                  </div>
                  <a 
                    href="/books/This_or_That_CLEAN_WORKING_MASTER.pdf" 
                    download="This_or_That_by_Richard_Torres.pdf"
                    className="modal-downloadBtn"
                    onClick={() => setDownloadModal(false)}
                  >
                    Download PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}