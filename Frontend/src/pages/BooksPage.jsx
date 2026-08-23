import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FEATURED_BOOKS } from '../data/books.js';
import SectionIntro from '../components/SectionIntro.jsx';
import './BooksPage.css';

export default function BooksPage() {
  return (
    <>
      <Helmet>
        <title>Books · PVA Bazaar</title>
        <meta
          name="description"
          content="Start with the two foundational PVA Bazaar books on pure life knowledge: The Infinite Jobs and Magnum Opus Guide."
        />
      </Helmet>

      <section className="books-page section-card">
        <SectionIntro
          badge="The reading path"
          title="Two books explain everything."
          promise="These are the clearest entrance into the larger work: the labor model, the philosophy, and the long-range blueprint behind PVA Bazaar - truthful living, meaningful labor, preserved memory."
          actions={(
            <>
              <Link className="pva-btn pva-btn--primary" to="/books/published">Open published shelf</Link>
              <Link className="pva-btn pva-btn--ghost" to="/books/publish">Publish a book</Link>
            </>
          )}
        />

        <div className="books-page__grid">
          {FEATURED_BOOKS.map((book) => (
            <article key={book.key} className="books-page__card">
              <div className="books-page__cardTop">
                <p className="books-page__order">{book.orderLabel}</p>
                <h2>{book.title}</h2>
                <p className="books-page__subtitle">{book.subtitle}</p>
              </div>

              <p className="books-page__description">{book.description}</p>
              <p className="books-page__excerpt">{book.excerpt}</p>

              <div className="books-page__themes">
                {book.themes.map((theme) => (
                  <span key={theme}>{theme}</span>
                ))}
              </div>

              <div className="books-page__actions">
                <a className="books-page__button books-page__button--primary" href={book.manuscriptPath} target="_blank" rel="noreferrer">
                  Open manuscript
                </a>
                <Link className="books-page__button" to={book.archiveCta}>
                  Enter archive
                </Link>
                {book.key === 'this-or-that' ? (
                  <Link className="books-page__button books-page__button--primary" to="/books/this-or-that">
                    Book page
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <section className="books-page__closing">
          <div>
            <p className="pill">What the books stand for</p>
            <h2>Truth first. Work with soul. Build what can last.</h2>
            <p>
              Read these books as the moral and practical spine of the site. They reject empty churn, false prestige,
              and disposable systems in favor of work that serves people, honors origin, and remains legible over time.
            </p>
          </div>
        </section>

        <section className="books-page__closing">
          <div>
            <p className="pill">Published shelf</p>
            <h2>Read the editions that are already live.</h2>
            <p>
              The public bookshelf collects published books in one clean place so readers can open the web edition or
              download the formatted files without searching through the editor.
            </p>
          </div>
          <div className="books-page__actions">
            <Link className="books-page__button books-page__button--primary" to="/books/published">
              Open published bookshelf
            </Link>
            <Link className="books-page__button" to="/books/publish">
              Publish a new book
            </Link>
          </div>
        </section>

        <section className="books-page__closing">
          <div>
            <p className="pill">After the books</p>
            <h2>Then return to the broader platform.</h2>
            <p>
              Once a reader understands these two books, the marketplace, supplier portal, archive, and governance
              surfaces become much easier to read as one cohesive system instead of disconnected tools.
            </p>
          </div>
          <div className="books-page__actions">
            <Link className="books-page__button books-page__button--primary" to="/">
              Return to home
            </Link>
            <Link className="books-page__button" to="/about">
              Read the mission
            </Link>
          </div>
        </section>
      </section>
    </>
  );
}
