import React from 'react';

const writings = [
  {
    title: 'On the Nature of Change',
    content: `Change is the only constant. To resist is to suffer; to accept is to grow. The archive is a living testament to the flux of thought and being.`,
  },
  {
    title: 'Fragments on Identity',
    content: `Identity is not a fixed point, but a constellation of moments, choices, and memories. Each entry is a star in the night sky of the self.`,
  },
  {
    title: 'Notes on Belonging',
    content: `To belong is not to fit, but to be accepted in one's wholeness. The archive is a home for every fragment.`,
  },
];

export default function Writings() {
  return (
    <section>
      <h2>Writings</h2>
      <div>
        {writings.map((w, i) => (
          <article key={i} className="writing-entry">
            <h3>{w.title}</h3>
            <p>{w.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
