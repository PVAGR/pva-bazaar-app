import React, { useState } from 'react';
import Journals from './Journals';
import Writings from './Writings';
import Blogs from './Blogs';
import PVAFood from './PVAFood';
import BusinessModel from './BusinessModel';
import Novel from './Novel';
import Biography from './Biography';
import Research from './Research';
import MermaidDiagram from './MermaidDiagram';

const tabs = [
  { label: 'Journals', component: Journals },
  { label: 'Writings', component: Writings },
  { label: 'Blogs', component: Blogs },
  { label: 'PVA Food', component: PVAFood },
  { label: 'Business Model', component: BusinessModel },
  { label: 'Novel', component: Novel },
  { label: 'Biography', component: Biography },
  { label: 'Research', component: Research },
  { label: 'Diagrams', component: MermaidDiagram },
];

export default function HomeTabs() {
  const [active, setActive] = useState(0);
  const ActiveComponent = tabs[active].component;
  return (
    <div>
      <nav className="pva-tabs">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            className={i === active ? 'active' : ''}
            onClick={() => setActive(i)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="pva-tab-content">
        <ActiveComponent />
      </div>
    </div>
  );
}
