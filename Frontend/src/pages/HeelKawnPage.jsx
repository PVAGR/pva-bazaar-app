import React, { useEffect, useMemo, useState } from 'react';

const RELEASES_URL = 'https://github.com/PVAGR/HeelKawn1/releases/latest';
const REPO_URL = 'https://github.com/PVAGR/HeelKawn1';

const mobileDownloadUrl = normalizeExternalUrl(
  import.meta.env.VITE_HEELKAWN_DOWNLOAD_URL,
  RELEASES_URL,
);
const pcDownloadUrl = normalizeExternalUrl(
  import.meta.env.VITE_HEELKAWN_PC_DOWNLOAD_URL,
  RELEASES_URL,
);
const repoUrl = normalizeExternalUrl(import.meta.env.VITE_HEELKAWN_REPO_URL, REPO_URL);

const GRID_SIZE = 16;
const tabs = [
  { id: 'profile', label: 'Live Profile' },
  { id: 'studio', label: 'Sprite Studio' },
  { id: 'social', label: 'Settlement Pulse' },
];

const WEATHER_POOL = ['Clear sky', 'Wind surge', 'Mist drift', 'Rain front', 'Solar haze'];
const STATUS_POOL = ['Building', 'Patrolling', 'Negotiating', 'Gathering', 'Repairing'];
const LOCATIONS = ['River Bastion', 'Northern Gate', 'Craft Hall', 'Signal Tower', 'Outer Farms'];
const TASK_POOL = [
  'reinforcing eastern wall supports',
  'routing caravan traffic through delta road',
  'assembling signal relays for night patrol',
  'negotiating timber exchange contracts',
  'surveying water-table stability near the moat',
];

const paletteOptions = {
  skin: [
    { id: 'sand', label: 'Sand', color: '#d8aa7a' },
    { id: 'bronze', label: 'Bronze', color: '#ba7e4e' },
    { id: 'deep', label: 'Deep', color: '#8b5836' },
  ],
  hair: [
    { id: 'obsidian', label: 'Obsidian', color: '#1f232c' },
    { id: 'umber', label: 'Umber', color: '#4b3327' },
    { id: 'sunfire', label: 'Sunfire', color: '#b88548' },
  ],
  top: [
    { id: 'druid', label: 'Druid Tunic', color: '#4c6e46' },
    { id: 'warden', label: 'Warden Coat', color: '#3c5578' },
    { id: 'raider', label: 'Raider Jerkin', color: '#7a4936' },
  ],
  bottom: [
    { id: 'field', label: 'Field Greaves', color: '#5f605b' },
    { id: 'nomad', label: 'Nomad Wraps', color: '#6c5644' },
    { id: 'plate', label: 'Plate Guard', color: '#575f73' },
  ],
  shoes: [
    { id: 'hide', label: 'Hide Boots', color: '#4a3a2f' },
    { id: 'trail', label: 'Trail Boots', color: '#3e4638' },
    { id: 'iron', label: 'Iron Sabatons', color: '#4e525b' },
  ],
  headgear: [
    { id: 'none', label: 'No Headgear', color: '#00000000' },
    { id: 'hood', label: 'Scout Hood', color: '#2f3f33' },
    { id: 'helm', label: 'Iron Helm', color: '#737983' },
    { id: 'crown', label: 'Signal Crown', color: '#b5934b' },
  ],
  gloves: [
    { id: 'cloth', label: 'Cloth Wraps', color: '#6b5b4a' },
    { id: 'leather', label: 'Leather Gloves', color: '#534131' },
    { id: 'gauntlet', label: 'Steel Gauntlets', color: '#68707d' },
  ],
};

const weaponOptions = {
  mainhand: [
    { id: 'spear', label: 'Mainhand: Warden Spear', color: '#8f714c' },
    { id: 'blade', label: 'Mainhand: Iron Blade', color: '#d0d7db' },
    { id: 'staff', label: 'Mainhand: Relay Staff', color: '#7a5a3f' },
  ],
  offhand: [
    { id: 'shield', label: 'Offhand: Kite Shield', color: '#6b7079' },
    { id: 'orb', label: 'Offhand: Scout Orb', color: '#57a9b1' },
    { id: 'lantern', label: 'Offhand: Signal Lantern', color: '#d5b35b' },
  ],
};

const NAME_PREFIX = [
  'Arin',
  'Vela',
  'Torin',
  'Sefa',
  'Kael',
  'Nira',
  'Yorin',
  'Mira',
  'Dren',
  'Ashen',
];
const NAME_SUFFIX = ['of Taur', 'Ridgeborn', 'Ironwake', 'Lowland', 'Stonepath', 'Windhold'];
const ROLE_POOL = ['Builder', 'Quartermaster', 'Pathfinder', 'Sentry', 'Craftmaster', 'Diplomat'];

const initialCitizens = createCitizens(8);
const initialThreads = [
  {
    id: 'council',
    name: 'Settlement Council',
    members: 8,
    messages: [
      { from: 'Dispatch', text: 'Council queue initialized. Build requests syncing every cycle.' },
      {
        from: 'Tower Relay',
        text: 'Weather relay online. Wind drift acceptable for caravan movement.',
      },
    ],
  },
  {
    id: 'party',
    name: 'Wolfpack Patrol',
    members: 5,
    messages: [
      {
        from: 'Scout Node',
        text: 'Patrol route expanded to the eastern channel. No hostiles detected.',
      },
      {
        from: 'Supply Relay',
        text: 'Torch stock replenished. Night shift can begin without delay.',
      },
    ],
  },
];

export default function HeelKawnPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [linked, setLinked] = useState(true);
  const [skin, setSkin] = useState(paletteOptions.skin[0]);
  const [hair, setHair] = useState(paletteOptions.hair[0]);
  const [top, setTop] = useState(paletteOptions.top[0]);
  const [bottom, setBottom] = useState(paletteOptions.bottom[0]);
  const [shoes, setShoes] = useState(paletteOptions.shoes[0]);
  const [headgear, setHeadgear] = useState(paletteOptions.headgear[1]);
  const [gloves, setGloves] = useState(paletteOptions.gloves[0]);
  const [mainhand, setMainhand] = useState(weaponOptions.mainhand[0]);
  const [offhand, setOffhand] = useState(weaponOptions.offhand[0]);
  const [citizens, setCitizens] = useState(initialCitizens);
  const [activityLog, setActivityLog] = useState([
    'Settlement clock online. Autonomous routines are running.',
    'Resource convoy has reached River Bastion.',
    'Signal tower completed daily calibration.',
  ]);
  const [threads, setThreads] = useState(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0].id);
  const [draft, setDraft] = useState('');
  const [world, setWorld] = useState(() => ({
    tick: 0,
    weather: WEATHER_POOL[0],
    cycle: getCycleLabel(),
    pulse: 76,
    danger: 18,
    tradeFlow: 62,
    syncedAt: new Date().toLocaleTimeString(),
  }));

  const activeThread = threads.find((thread) => thread.id === activeThreadId) || threads[0];
  const spriteCells = useMemo(
    () => buildSprite({ skin, hair, top, bottom, shoes, headgear, gloves, mainhand, offhand }),
    [skin, hair, top, bottom, shoes, headgear, gloves, mainhand, offhand],
  );

  const totalStamina = useMemo(() => {
    if (!citizens.length) return 0;
    return Math.round(
      citizens.reduce((sum, citizen) => sum + citizen.stamina, 0) / citizens.length,
    );
  }, [citizens]);

  const totalFocus = useMemo(() => {
    if (!citizens.length) return 0;
    return Math.round(citizens.reduce((sum, citizen) => sum + citizen.focus, 0) / citizens.length);
  }, [citizens]);

  useEffect(() => {
    const intervalId = globalThis?.window?.setInterval(() => {
      setWorld((current) => ({
        tick: current.tick + 1,
        weather: current.tick % 3 === 0 ? pick(WEATHER_POOL) : current.weather,
        cycle: getCycleLabel(),
        pulse: clamp(current.pulse + randomDrift(6), 30, 99),
        danger: clamp(current.danger + randomDrift(7), 2, 95),
        tradeFlow: clamp(current.tradeFlow + randomDrift(9), 10, 98),
        syncedAt: new Date().toLocaleTimeString(),
      }));

      setCitizens((current) => {
        const actorIndex = Math.floor(Math.random() * current.length);
        const nextCitizens = current.map((citizen, index) => {
          const isActor = index === actorIndex;
          return {
            ...citizen,
            stamina: clamp(citizen.stamina + randomDrift(9), 28, 100),
            focus: clamp(citizen.focus + randomDrift(11), 24, 100),
            status: isActor ? pick(STATUS_POOL) : citizen.status,
            location: isActor ? pick(LOCATIONS) : citizen.location,
            task: isActor ? pick(TASK_POOL) : citizen.task,
          };
        });

        const actor = nextCitizens[actorIndex];
        const eventLine = `${actor.name} is ${actor.task} at ${actor.location}.`;

        setActivityLog((currentLog) => [eventLine, ...currentLog].slice(0, 9));
        setThreads((currentThreads) => appendSystemMessage(currentThreads, actor));
        return nextCitizens;
      });
    }, 3800);

    return () => {
      if (intervalId) {
        globalThis.window.clearInterval(intervalId);
      }
    };
  }, []);

  const sendMessage = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeThread) return;
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id
          ? { ...thread, messages: [...thread.messages, { from: 'You', text }].slice(-20) }
          : thread,
      ),
    );
    setDraft('');
  };

  const inventory = useMemo(
    () => [
      `${mainhand.label.replace('Mainhand: ', '')}`,
      `${offhand.label.replace('Offhand: ', '')}`,
      `${headgear.label}`,
      `${top.label}`,
      `${bottom.label}`,
      `${shoes.label}`,
      `${gloves.label}`,
      'Field Rations x8',
      'Repair Kit x3',
      'Settlement Sigils x14',
    ],
    [
      bottom.label,
      gloves.label,
      headgear.label,
      mainhand.label,
      offhand.label,
      shoes.label,
      top.label,
    ],
  );

  return (
    <section className="section-card download-app-card heelkawn-armory">
      <header className="heelkawn-armory__header">
        <div>
          <h2>HeelKawn Armory</h2>
          <p>
            Live settlement simulation with active HeelKawnians, continuous world ticks, and
            equipment-driven sprite identity.
          </p>
        </div>
        <div className="download-status">
          <strong>Account link:</strong> {linked ? 'Synced and live' : 'Offline mirror mode'}
          <br />
          <strong>Last sync:</strong> {world.syncedAt}
        </div>
      </header>

      <div className="download-actions">
        <a className="button" href={mobileDownloadUrl} target="_blank" rel="noopener noreferrer">
          Android Build
        </a>
        <a className="button" href={pcDownloadUrl} target="_blank" rel="noopener noreferrer">
          PC Build
        </a>
        <a className="button secondary" href={repoUrl} target="_blank" rel="noopener noreferrer">
          Source Repository
        </a>
        <button
          className="button secondary"
          type="button"
          onClick={() => setLinked((value) => !value)}
        >
          {linked ? 'Switch to Offline Mirror' : 'Reconnect Live Sync'}
        </button>
      </div>

      <div className="heelkawn-runtime">
        <Metric label="World Cycle" value={world.cycle} />
        <Metric label="Weather" value={world.weather} />
        <Metric label="Pulse" value={`${world.pulse}%`} />
        <Metric label="Threat" value={`${world.danger}%`} />
        <Metric label="Trade Flow" value={`${world.tradeFlow}%`} />
        <Metric label="Population Focus" value={`${totalFocus}%`} />
      </div>

      <nav className="heelkawn-armory__tabs" aria-label="HeelKawn Armory Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`heelkawn-armory__tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'profile' && (
        <section className="heelkawn-armory__panel">
          <div className="heelkawn-armory__grid">
            <article className="heelkawn-panel">
              <h3>Character Sheet</h3>
              <div className="heelkawn-armory__spriteCard">
                <SpriteGrid cells={spriteCells} label="HeelKawn character sprite" size="normal" />
                <ul className="heelkawn-sheet">
                  <li>
                    <strong>Name:</strong> Arin of Taur
                  </li>
                  <li>
                    <strong>Class:</strong> Warden Engineer
                  </li>
                  <li>
                    <strong>Live Tick:</strong> {world.tick}
                  </li>
                  <li>
                    <strong>Settlement:</strong> River Bastion
                  </li>
                  <li>
                    <strong>Team Stamina:</strong> {totalStamina}%
                  </li>
                </ul>
              </div>
            </article>

            <article className="heelkawn-panel">
              <h3>Equipped Slots</h3>
              <div className="heelkawn-equipmentGrid">
                <Slot label="Headgear" value={headgear.label} />
                <Slot label="Top" value={top.label} />
                <Slot label="Bottom" value={bottom.label} />
                <Slot label="Shoes" value={shoes.label} />
                <Slot label="Hands" value={gloves.label} />
                <Slot label="Mainhand" value={mainhand.label.replace('Mainhand: ', '')} />
                <Slot label="Offhand" value={offhand.label.replace('Offhand: ', '')} />
              </div>
              <h4>Inventory</h4>
              <ul className="heelkawn-inventory">
                {inventory.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>

          <article className="heelkawn-panel">
            <h3>Active HeelKawnians</h3>
            <div className="heelkawn-citizens">
              {citizens.map((citizen) => (
                <div className="heelkawn-citizen" key={citizen.id}>
                  <SpriteGrid
                    cells={buildSprite(citizen.loadout)}
                    label={`${citizen.name} sprite`}
                    size="tiny"
                  />
                  <div>
                    <strong>{citizen.name}</strong>
                    <p>
                      {citizen.role} · {citizen.status}
                    </p>
                    <p>
                      {citizen.location} · Stamina {citizen.stamina}% · Focus {citizen.focus}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {activeTab === 'studio' && (
        <section className="heelkawn-armory__panel">
          <div className="heelkawn-armory__grid">
            <article className="heelkawn-panel">
              <h3>Live Sprite Builder</h3>
              <p>Every body section and equipment slot updates immediately.</p>
              <SpriteGrid cells={spriteCells} label="Customization preview sprite" size="large" />
            </article>

            <article className="heelkawn-panel">
              <h3>Body + Clothing</h3>
              <PaletteGroup
                title="Skin"
                options={paletteOptions.skin}
                selected={skin.id}
                onSelect={setSkin}
              />
              <PaletteGroup
                title="Hair"
                options={paletteOptions.hair}
                selected={hair.id}
                onSelect={setHair}
              />
              <PaletteGroup
                title="Top"
                options={paletteOptions.top}
                selected={top.id}
                onSelect={setTop}
              />
              <PaletteGroup
                title="Bottom"
                options={paletteOptions.bottom}
                selected={bottom.id}
                onSelect={setBottom}
              />
              <PaletteGroup
                title="Shoes"
                options={paletteOptions.shoes}
                selected={shoes.id}
                onSelect={setShoes}
              />
              <PaletteGroup
                title="Headgear"
                options={paletteOptions.headgear}
                selected={headgear.id}
                onSelect={setHeadgear}
              />
              <PaletteGroup
                title="Hands"
                options={paletteOptions.gloves}
                selected={gloves.id}
                onSelect={setGloves}
              />
              <PaletteGroup
                title="Mainhand"
                options={weaponOptions.mainhand}
                selected={mainhand.id}
                onSelect={setMainhand}
              />
              <PaletteGroup
                title="Offhand"
                options={weaponOptions.offhand}
                selected={offhand.id}
                onSelect={setOffhand}
              />
            </article>
          </div>
        </section>
      )}

      {activeTab === 'social' && (
        <section className="heelkawn-armory__panel">
          <div className="heelkawn-armory__grid">
            <article className="heelkawn-panel">
              <h3>Settlement Threads</h3>
              <div className="heelkawn-threads">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className={`heelkawn-thread ${thread.id === activeThread.id ? 'is-active' : ''}`}
                    onClick={() => setActiveThreadId(thread.id)}
                  >
                    <strong>{thread.name}</strong>
                    <span>{thread.members} active members</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="heelkawn-panel">
              <h3>{activeThread.name}</h3>
              <div className="heelkawn-chatlog">
                {activeThread.messages.map((message, index) => (
                  <p key={`${activeThread.id}-msg-${index}`}>
                    <strong>{message.from}:</strong> {message.text}
                  </p>
                ))}
              </div>
              <form className="heelkawn-chatbox" onSubmit={sendMessage}>
                <input
                  type="text"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Transmit to settlement relay..."
                  maxLength={180}
                />
                <button className="button" type="submit">
                  Send
                </button>
              </form>
            </article>
          </div>

          <article className="heelkawn-panel">
            <h3>Emergent Activity Feed</h3>
            <div className="heelkawn-activityFeed">
              {activityLog.map((entry, index) => (
                <p key={`activity-${index}`}>{entry}</p>
              ))}
            </div>
          </article>
        </section>
      )}
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="heelkawn-runtime__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Slot({ label, value }) {
  return (
    <div className="heelkawn-slot">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SpriteGrid({ cells, label, size }) {
  const className = `heelkawn-sprite ${size ? `heelkawn-sprite--${size}` : ''}`.trim();
  return (
    <div className={className} aria-label={label}>
      {cells.map((cell) => (
        <span
          key={cell.key}
          className="heelkawn-sprite__cell"
          style={{
            background: cell.color,
            boxShadow: cell.color === 'transparent' ? 'none' : undefined,
          }}
        />
      ))}
    </div>
  );
}

function PaletteGroup({ title, options, selected, onSelect }) {
  return (
    <div className="heelkawn-paletteGroup">
      <h4>{title}</h4>
      <div className="heelkawn-paletteRow">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`heelkawn-paletteBtn ${selected === option.id ? 'is-active' : ''}`}
            onClick={() => onSelect(option)}
          >
            <span className="heelkawn-paletteSwatch" style={{ background: option.color }} />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function createCitizens(count) {
  return Array.from({ length: count }, (_, index) => {
    const name = `${NAME_PREFIX[index % NAME_PREFIX.length]} ${NAME_SUFFIX[index % NAME_SUFFIX.length]}`;
    const role = ROLE_POOL[index % ROLE_POOL.length];
    const status = STATUS_POOL[index % STATUS_POOL.length];
    const location = LOCATIONS[index % LOCATIONS.length];
    return {
      id: `citizen-${index + 1}`,
      name,
      role,
      status,
      location,
      stamina: 62 + ((index * 7) % 30),
      focus: 58 + ((index * 11) % 34),
      task: TASK_POOL[index % TASK_POOL.length],
      loadout: {
        skin: paletteOptions.skin[index % paletteOptions.skin.length],
        hair: paletteOptions.hair[index % paletteOptions.hair.length],
        top: paletteOptions.top[index % paletteOptions.top.length],
        bottom: paletteOptions.bottom[index % paletteOptions.bottom.length],
        shoes: paletteOptions.shoes[index % paletteOptions.shoes.length],
        headgear: paletteOptions.headgear[(index + 1) % paletteOptions.headgear.length],
        gloves: paletteOptions.gloves[index % paletteOptions.gloves.length],
        mainhand: weaponOptions.mainhand[index % weaponOptions.mainhand.length],
        offhand: weaponOptions.offhand[index % weaponOptions.offhand.length],
      },
    };
  });
}

function appendSystemMessage(threads, actor) {
  const line = `${actor.name} is ${actor.task}.`;
  return threads.map((thread, index) => {
    if (index > 0 && Math.random() > 0.5) return thread;
    return {
      ...thread,
      messages: [...thread.messages, { from: actor.name, text: line }].slice(-20),
    };
  });
}

function buildSprite(loadout) {
  const colors = {
    outline: '#162024',
    skin: loadout.skin.color,
    hair: loadout.hair.color,
    top: loadout.top.color,
    bottom: loadout.bottom.color,
    shoes: loadout.shoes.color,
    headgear: loadout.headgear.color,
    hands: loadout.gloves.color,
    line: darken(loadout.top.color, 0.25),
    mainhand: loadout.mainhand.color,
    offhand: loadout.offhand.color,
    accent: '#d8c48c',
  };

  const tokens = new Array(GRID_SIZE * GRID_SIZE).fill(null);
  const paint = (points, token) => {
    points.forEach(([x, y]) => {
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        tokens[y * GRID_SIZE + x] = token;
      }
    });
  };

  paint(pointsRect(5, 1, 10, 4), 'outline');
  paint(pointsRect(6, 5, 9, 13), 'outline');
  paint(
    [
      ...pointsRect(4, 6, 4, 10),
      ...pointsRect(11, 6, 11, 10),
      [6, 14],
      [7, 14],
      [8, 14],
      [9, 14],
      [6, 15],
      [9, 15],
    ],
    'outline',
  );

  paint(pointsRect(6, 2, 9, 4), 'skin');
  paint(pointsRect(6, 1, 9, 2), 'hair');
  paint(pointsRect(6, 5, 9, 9), 'top');
  paint(pointsRect(6, 10, 9, 13), 'bottom');
  paint(
    [
      [6, 14],
      [7, 14],
      [8, 14],
      [9, 14],
      [6, 15],
      [7, 15],
      [8, 15],
      [9, 15],
    ],
    'shoes',
  );
  paint(
    [
      [4, 8],
      [4, 9],
      [11, 8],
      [11, 9],
    ],
    'hands',
  );
  paint(
    [
      [6, 6],
      [7, 6],
      [8, 6],
      [9, 6],
      [7, 8],
      [8, 8],
      [7, 11],
      [8, 11],
    ],
    'line',
  );

  if (loadout.headgear.id !== 'none') {
    paint(pointsRect(5, 0, 10, 1), 'headgear');
    paint(
      [
        [5, 2],
        [10, 2],
      ],
      'headgear',
    );
  }

  paint(mainhandPattern(loadout.mainhand.id), 'mainhand');
  paint(offhandPattern(loadout.offhand.id), 'offhand');
  paint(
    [
      [7, 3],
      [8, 3],
    ],
    'accent',
  );

  return tokens.map((token, index) => ({
    key: `cell-${index}`,
    color: token ? colors[token] || 'transparent' : 'transparent',
  }));
}

function mainhandPattern(type) {
  if (type === 'blade') {
    return [
      [11, 7],
      [12, 7],
      [11, 8],
      [11, 9],
      [11, 10],
      [11, 11],
      [12, 6],
      [12, 8],
    ];
  }
  if (type === 'staff') {
    return [
      [11, 6],
      [11, 7],
      [11, 8],
      [11, 9],
      [11, 10],
      [11, 11],
      [11, 12],
      [11, 13],
      [12, 5],
    ];
  }
  return [
    [11, 6],
    [11, 7],
    [11, 8],
    [11, 9],
    [11, 10],
    [11, 11],
    [11, 12],
    [12, 5],
    [12, 6],
  ];
}

function offhandPattern(type) {
  if (type === 'orb') {
    return [
      [3, 8],
      [4, 7],
      [4, 8],
      [4, 9],
      [5, 8],
    ];
  }
  if (type === 'lantern') {
    return [
      [3, 8],
      [4, 8],
      [5, 8],
      [4, 9],
      [4, 10],
      [4, 7],
    ];
  }
  return [
    [3, 8],
    [3, 9],
    [3, 10],
    [4, 8],
    [4, 9],
    [4, 10],
    [5, 8],
    [5, 9],
    [5, 10],
  ];
}

function pointsRect(x1, y1, x2, y2) {
  const points = [];
  for (let y = y1; y <= y2; y += 1) {
    for (let x = x1; x <= x2; x += 1) {
      points.push([x, y]);
    }
  }
  return points;
}

function randomDrift(maxMagnitude) {
  const half = Math.floor(maxMagnitude / 2);
  return Math.floor(Math.random() * (maxMagnitude + 1)) - half;
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getCycleLabel() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Deep night watch';
  if (hour < 11) return 'Morning build cycle';
  if (hour < 17) return 'Daylight operations';
  if (hour < 21) return 'Dusk patrol cycle';
  return 'Night relay cycle';
}

function normalizeExternalUrl(candidate, fallback) {
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function darken(hexColor, amount) {
  if (!hexColor || !hexColor.startsWith('#') || (hexColor.length !== 7 && hexColor.length !== 9)) {
    return '#1f2a2f';
  }
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const next = (value) => clamp(Math.round(value * (1 - amount)), 0, 255);
  return `#${toHex(next(r))}${toHex(next(g))}${toHex(next(b))}`;
}

function toHex(value) {
  return value.toString(16).padStart(2, '0');
}
