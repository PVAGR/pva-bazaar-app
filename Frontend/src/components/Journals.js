import React from 'react';

const entries = [
  {
    date: '2025-12-31',
    title: 'Reflections on Eternal Renewal',
    content: `The close of the year invites a meditation on cycles—of time, of self, of the world. In the quiet, I find renewal not in grand resolutions, but in the gentle return to what matters most. Each ending is a beginning, and in the turning, I am made new.`,
  },
  {
    date: '2025-12-30',
    title: 'On Quiet Progress',
    content: `Progress is not always loud. Sometimes it is the silent, steady movement forward that shapes a life.`,
  },
  {
    date: '2025-12-29',
    title: 'A Note on Simplicity',
    content: `Simplicity is not the absence of complexity, but the clarity that emerges from it.`,
  },
];

export default function Journals() {
  return (
    <section>
      <h2>Journals</h2>
      <div>
        {entries.map((e) => (
          <article key={e.date} className="journal-entry">
            <h3>{e.date}: {e.title}</h3>
            <p>{e.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
