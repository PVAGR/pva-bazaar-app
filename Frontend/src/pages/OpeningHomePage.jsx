import React from 'react';
import { Link } from 'react-router-dom';
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
            the soul of the work, and the platform is being shaped to outlast any single season or lifetime.
          </p>
          <div className="opening-home__actions">
            <Link className="opening-home__actionBtn opening-home__actionBtn--primary" to="/marketplace">Browse Marketplace</Link>
            <Link className="opening-home__actionBtn opening-home__actionBtn--secondary" to="/creator">Enter Supplier Portal</Link>
            <Link className="opening-home__actionBtn opening-home__actionBtn--ghost" to="/about">Read the Mission</Link>
          </div>
        </div>

        <aside className="opening-home__heroPanel" aria-label="Core value">
          <h2>Built for real trade</h2>
          <ul>
            <li>Direct pathways for suppliers, artisans, brokers, and buyers.</li>
            <li>Provenance, archive context, and product storytelling in one system.</li>
            <li>A clearer surface for sourcing now and a durable record for later.</li>
            <li>Designed to keep working as a bridge between people, goods, and memory.</li>
          </ul>
        </aside>
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
          <Link className="opening-home__card" to="/marketplace">
            <h3>For buyers and retailers</h3>
            <p>Browse goods, evaluate provenance, and move toward direct sourcing conversations.</p>
          </Link>
          <Link className="opening-home__card" to="/creator">
            <h3>For suppliers and artisans</h3>
            <p>Join the network, submit products, and present what you can reliably ship and stand behind.</p>
          </Link>
          <Link className="opening-home__card" to="/archive">
            <h3>For the archive and the soul</h3>
            <p>Read the writings, context, and memory that give the trade network deeper meaning.</p>
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
            <p>Use provenance, profile details, and archive context to understand who made the work and why it matters.</p>
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
        </div>
        <div className="opening-home__legacyActions">
          <Link className="opening-home__actionBtn opening-home__actionBtn--secondary" to="/showroom">View Showroom</Link>
          <Link className="opening-home__actionBtn opening-home__actionBtn--ghost" to="/about">Understand the platform</Link>
          <Link className="opening-home__actionBtn opening-home__actionBtn--ghost" to="/get-started">Create an account</Link>
        </div>
      </section>
    </div>
  );
}
