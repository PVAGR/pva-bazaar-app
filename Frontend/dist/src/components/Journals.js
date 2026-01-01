import React from 'react';

// Example: authentic dated journal entry for 2025-12-31
const entries = [
  {
    date: '2025-12-31',
    title: 'Reflections on Eternal Renewal',
    content: `The close of the year invites a meditation on cycles—of time, of self, of the world. In the quiet, I find renewal not in grand resolutions, but in the gentle return to what matters most. Each ending is a beginning, and in the turning, I am made new.`,
  },
  // Add more entries as needed
];

export default function Journals() {
  return (
    <section>
      <h2>Journals</h2>
      {entries.map((e) => (
        <article key={e.date} className="journal-entry">
          <h3>{e.date}: {e.title}</h3>
          <p>{e.content}</p>
        </article>
      ))}
    </section>
  );
}
