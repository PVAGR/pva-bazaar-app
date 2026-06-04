import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FEATURED_BOOKS } from '../data/books.js';
import './BooksPage.css';

export default function BooksPage() {
  return (
    <>
      <Helmet>
        <title>Books · PVA Bazaar</title>
        <meta
          name="description"
          content="Start with the two foundational PVA Bazaar books: The Infinite Jobs and Magnum Opus Guide."
        />
      </Helmet>

      <section className="books-page section-card">
        <header className="books-page__hero">
          <div>
            <p className="pill">Books</p>
            <h1>Start here first.</h1>
            <p className="books-page__lead">
              These two books are the clearest entrance into the larger work. They explain the labor model, the
              philosophy, and the long-range blueprint behind PVA Bazaar.
            </p>
          </div>

          <aside className="books-page__heroPanel">
            <h2>Reading order</h2>
            <ol>
              <li><strong>The Infinite Jobs</strong> explains the human work worth preserving forever.</li>
              <li><strong>Magnum Opus Guide</strong> turns that vision into a civilization-scale blueprint.</li>
            </ol>
            <p>
              If someone wants to understand the heart of this project before the marketplace, archive, or governance
              layers, send them here.
            </p>
          </aside>
        </header>

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
              </div>
            </article>
          ))}
        </div>

        <section className="books-page__closing">
          <div>
            <p className="pill">After the books</p>
            <h2>Then return to the broader platform.</h2>
            <p>
              Once a reader understands these two books, the marketplace, supplier portal, archive, and governance
              surfaces become much easier to read as one cohesive system.
            </p>
          </div>
          <div className="books-page__actions">
            <Link className="books-page__button books-page__button--primary" to="/">
              Return to home
            </Link>
            <Link className="books-page__button" to="/marketplace">
              Browse marketplace
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
