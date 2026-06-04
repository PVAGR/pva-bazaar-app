import React from 'react';
import { Link } from 'react-router-dom';
import { FEATURED_BOOKS } from '../data/books.js';
import './OpeningHomePage.css';

export default function OpeningHomePage() {
  return (
    <div className="opening-home" aria-label="PVA Bazaar opening homepage">
      <section className="section-card opening-home__hero">
        <div className="opening-home__heroCopy">
          <p className="pill">PVA Bazaar · Global trade and living archive</p>
          <h1>A bridge between global makers and American buyers.</h1>
          <p className="opening-home__lead">
            PVA Bazaar connects people you meet around the world who have something real to sell with buyers,
            retailers, and partners in America who want trustworthy goods with story, context, and provenance.
          </p>
          <p className="opening-home__lead opening-home__lead--secondary">
            It is both a trade network and a long-memory system: the marketplace handles movement, the archive keeps
            the soul of the work, and the books explain the deeper discipline behind it all—truth over drift,
            meaningful labor over hollow churn, and continuity that can outlast one lifetime.
          </p>
          <div className="opening-home__actions">
            <Link className="opening-home__actionBtn opening-home__actionBtn--primary" to="/books">Read the Books</Link>
            <Link className="opening-home__actionBtn opening-home__actionBtn--secondary" to="/marketplace">Browse Marketplace</Link>
            <Link className="opening-home__actionBtn opening-home__actionBtn--ghost" to="/about">Read the Mission</Link>
          </div>
        </div>

        <aside className="opening-home__heroPanel" aria-label="Core value">
          <h2>Begin with the books</h2>
          <ul>
            <li>Read the books first if you want the clearest understanding of why this platform exists.</li>
            <li>They explain the commitment to truthful living, useful work, and systems that preserve memory instead of severing it.</li>
            <li>Then use the marketplace, supplier portal, and archive as practical expressions of that vision.</li>
            <li>Everything else on the site becomes easier to read once that foundation is clear.</li>
          </ul>
        </aside>
      </section>

      <section className="section-card opening-home__booksSection" aria-label="Featured books">
        <div className="opening-home__sectionHead">
          <div>
            <p className="pill">Featured books</p>
            <h2>The two books every first-time visitor should see</h2>
          </div>
          <p>
            These are the most concentrated explanation of the work: truth, meaningful labor, preservation, and the
            long-range continuity the rest of the platform is trying to serve.
          </p>
        </div>

        <div className="opening-home__bookGrid">
          {FEATURED_BOOKS.map((book) => (
            <article key={book.key} className="opening-home__bookCard">
              <p className="opening-home__bookOrder">{book.orderLabel}</p>
              <h3>{book.title}</h3>
              <p className="opening-home__bookSubtitle">{book.subtitle}</p>
              <p>{book.excerpt}</p>
              <div className="opening-home__bookActions">
                <Link className="opening-home__actionBtn opening-home__actionBtn--secondary" to="/books">
                  Open books page
                </Link>
                <a className="opening-home__actionBtn opening-home__actionBtn--ghost" href={book.manuscriptPath} target="_blank" rel="noreferrer">
                  Open manuscript
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card opening-home__firstSection" aria-label="Primary pathways">
        <div className="opening-home__sectionHead">
          <div>
            <p className="pill">Choose your path</p>
            <h2>Enter through the door that matches your role</h2>
          </div>
          <p>
            The same network serves different intents. Buyers can source. Suppliers can submit. The archive preserves
            the why behind the work.
          </p>
        </div>

        <div className="opening-home__grid">
          <Link className="opening-home__card" to="/books">
            <h3>For readers and first-time visitors</h3>
            <p>Start with the books to understand the labor vision, the blueprint, and the long-memory mission.</p>
          </Link>
          <Link className="opening-home__card" to="/archive">
            <h3>For the archive and the soul</h3>
            <p>Read the writings, testimony, and first principles that keep the trade network tied to truth and memory.</p>
          </Link>
          <Link className="opening-home__card" to="/marketplace">
            <h3>For buyers and retailers</h3>
            <p>Browse goods, evaluate provenance, and move toward direct sourcing conversations.</p>
          </Link>
          <Link className="opening-home__card" to="/creator">
            <h3>For suppliers and artisans</h3>
            <p>Join the network, submit products, and present what you can reliably ship and stand behind.</p>
          </Link>
        </div>
      </section>

      <section className="section-card opening-home__firstSection" aria-label="How the bridge works">
        <div className="opening-home__sectionHead">
          <div>
            <p className="pill">How it works</p>
            <h2>Source, verify, and carry the story forward</h2>
          </div>
          <p>
            PVA Bazaar is meant to make commerce clearer without stripping away the human reality behind the object.
          </p>
        </div>

        <div className="opening-home__grid">
          <article className="opening-home__card opening-home__cardStatic">
            <h3>1. Discover supply</h3>
            <p>Find products, suppliers, and brokered opportunities gathered across relationships on the ground.</p>
          </article>
          <article className="opening-home__card opening-home__cardStatic">
            <h3>2. Verify trust</h3>
            <p>Use provenance, profile details, and archive context to understand who made the work, how it was carried, and why it matters.</p>
          </article>
          <article className="opening-home__card opening-home__cardStatic">
            <h3>3. Move the goods</h3>
            <p>Turn relationships into repeatable supply chains that can keep functioning beyond any one person.</p>
          </article>
        </div>
      </section>

      <section className="section-card opening-home__legacy" aria-label="Legacy statement">
        <div className="opening-home__legacyCopy">
          <p className="pill">Why this exists</p>
          <h2>This is a marketplace with a memory.</h2>
          <p>
            The commercial side matters because it feeds people and keeps goods moving. The archive matters because it
            preserves the spirit, testimony, and intent behind the network. Both belong together.
          </p>
          <p>
            The deeper claim is simple: trade should not require the loss of soul. The platform is meant to help people
            work, source, and build relationships without cutting story, truth, and human dignity out of the process.
          </p>
        </div>
        <div className="opening-home__legacyActions">
          <Link className="opening-home__actionBtn opening-home__actionBtn--primary" to="/books">Enter the books</Link>
          <Link className="opening-home__actionBtn opening-home__actionBtn--secondary" to="/showroom">View Showroom</Link>
          <Link className="opening-home__actionBtn opening-home__actionBtn--ghost" to="/about">Understand the platform</Link>
          <Link className="opening-home__actionBtn opening-home__actionBtn--ghost" to="/creator">Enter supplier portal</Link>
        </div>
      </section>
    </div>
  );
}
