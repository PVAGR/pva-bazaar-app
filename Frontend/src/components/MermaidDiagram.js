import React, { useEffect, useRef } from 'react';

// Example Mermaid diagram (can be replaced with dynamic content)
const diagram = `graph TD\n  A[Start] --> B{Is it working?}\n  B -- Yes --> C[Celebrate]\n  B -- No --> D[Fix it]\n  D --> B`;

export default function MermaidDiagram() {
  const ref = useRef();
  useEffect(() => {
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({ startOnLoad: false });
      if (ref.current) {
        mermaid.default.render('mermaid-diagram', diagram, (svgCode) => {
          ref.current.innerHTML = svgCode;
        });
      }
    });
  }, []);
  return (
    <section>
      <h2>Diagrams</h2>
      <div ref={ref} />
    </section>
  );
}
