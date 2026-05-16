import React, { useMemo, useState } from 'react';

const mobileDownloadUrl =
  import.meta.env.VITE_HEELKAWN_DOWNLOAD_URL ||
  'https://github.com/PVAGR/HeelKawn1/releases/download/android-latest/HeelKawn-android.apk';
const pcDownloadUrl =
  import.meta.env.VITE_HEELKAWN_PC_DOWNLOAD_URL ||
  'https://github.com/PVAGR/HeelKawn1/releases/latest';
const repoUrl =
  import.meta.env.VITE_HEELKAWN_REPO_URL || 'https://github.com/PVAGR/HeelKawn1';

const spriteRows = [
  '0011111100',
  '0112222210',
  '0123333321',
  '0123333321',
  '0124444421',
  '0014444400',
  '0004555400',
  '0004555400',
  '0005000500',
  '0050000050',
];

const tabs = [
  { id: 'profile', label: 'Profile & Stats' },
  { id: 'studio', label: 'Customization Studio' },
  { id: 'social', label: 'Social Hub' },
];

const paletteOptions = {
  skin: [
    { id: 'sand', label: 'Sand', color: '#d7a673' },
    { id: 'bronze', label: 'Bronze', color: '#b87a4a' },
    { id: 'deep', label: 'Deep', color: '#8a5430' },
  ],
  hair: [
    { id: 'ember', label: 'Ember', color: '#3e281d' },
    { id: 'ash', label: 'Ash', color: '#2a2d37' },
    { id: 'sun', label: 'Sun', color: '#c79f5b' },
  ],
  armor: [
    { id: 'druid', label: 'Druid Cloth', color: '#476945' },
    { id: 'raider', label: 'Raider Mail', color: '#506c8a' },
    { id: 'warden', label: 'Warden Plate', color: '#7f4f39' },
  ],
  trim: [
    { id: 'gold', label: 'Gold', color: '#d5b24f' },
    { id: 'teal', label: 'Teal', color: '#43a8a1' },
    { id: 'ember', label: 'Ember', color: '#cc6e47' },
  ],
};

const threadsSeed = [
  {
    id: 'council',
    name: 'Settlement Council',
    members: 5,
    messages: [
      { from: 'Torin', text: 'Need two builders on river fort wall repairs.' },
      { from: 'You', text: 'Queued after wheat harvest. I can send one now.' },
    ],
  },
  {
    id: 'party',
    name: 'Wolfpack Squad',
    members: 4,
    messages: [
      { from: 'Vela', text: 'Hunting patrol at dusk. Bring torches.' },
      { from: 'You', text: 'Copy. Equipping spear and dried meat.' },
    ],
  },
];

export default function HeelKawnPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [linked, setLinked] = useState(false);
  const [skin, setSkin] = useState(paletteOptions.skin[0]);
  const [hair, setHair] = useState(paletteOptions.hair[0]);
  const [armor, setArmor] = useState(paletteOptions.armor[1]);
  const [trim, setTrim] = useState(paletteOptions.trim[0]);
  const [threads, setThreads] = useState(threadsSeed);
  const [activeThreadId, setActiveThreadId] = useState(threadsSeed[0].id);
  const [draft, setDraft] = useState('');

  const activeThread = threads.find((thread) => thread.id === activeThreadId) || threads[0];

  const spritePalette = useMemo(
    () => ({
      '1': hair.color,
      '2': skin.color,
      '3': armor.color,
      '4': trim.color,
      '5': '#e6dcc8',
    }),
    [armor.color, hair.color, skin.color, trim.color],
  );

  const sendMessage = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !activeThread) return;
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id
          ? { ...thread, messages: [...thread.messages, { from: 'You', text }] }
          : thread,
      ),
    );
    setDraft('');
  };

  return (
    <section className="section-card download-app-card heelkawn-armory">
      <header className="heelkawn-armory__header">
        <div>
          <h2>HeelKawn Armory</h2>
          <p>
            Character identity hub for HeelKawn. Inspect your build, customize your sprite, and manage social
            coordination in one place.
          </p>
        </div>
        <div className="download-status">
          <strong>Account link:</strong>{' '}
          {linked ? 'Connected to HeelKawn profile node' : 'Not linked yet'}
        </div>
      </header>

      <div className="download-actions">
        <a className="button" href={mobileDownloadUrl} target="_blank" rel="noopener noreferrer">
          Download for Android
        </a>
        <a className="button" href={pcDownloadUrl} target="_blank" rel="noopener noreferrer">
          Download for PC
        </a>
        <a className="button secondary" href={repoUrl} target="_blank" rel="noopener noreferrer">
          Open HeelKawn Repo
        </a>
        <button className="button secondary" type="button" onClick={() => setLinked((value) => !value)}>
          {linked ? 'Disconnect Account' : 'Link Game Account'}
        </button>
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
                <div className="heelkawn-sprite" aria-label="HeelKawn character sprite">
                  {spriteRows.join('').split('').map((cell, index) => (
                    <span
                      key={`sprite-cell-${index}`}
                      className="heelkawn-sprite__cell"
                      style={{ background: cell === '0' ? 'transparent' : spritePalette[cell] }}
                    />
                  ))}
                </div>
                <ul className="heelkawn-sheet">
                  <li>
                    <strong>Name:</strong> Arin of Taur
                  </li>
                  <li>
                    <strong>Class:</strong> Warden Builder
                  </li>
                  <li>
                    <strong>Level:</strong> 27
                  </li>
                  <li>
                    <strong>Profession:</strong> Engineer / Quartermaster
                  </li>
                  <li>
                    <strong>Settlement:</strong> River Bastion
                  </li>
                </ul>
              </div>
            </article>

            <article className="heelkawn-panel">
              <h3>Build, Skills, and Inventory</h3>
              <div className="heelkawn-stats">
                <div className="heelkawn-stat">
                  <span>Strength</span>
                  <strong>18</strong>
                </div>
                <div className="heelkawn-stat">
                  <span>Intellect</span>
                  <strong>14</strong>
                </div>
                <div className="heelkawn-stat">
                  <span>Spirit</span>
                  <strong>19</strong>
                </div>
                <div className="heelkawn-stat">
                  <span>Leadership</span>
                  <strong>16</strong>
                </div>
              </div>
              <div className="heelkawn-badges">
                <span>Stone Masonry V</span>
                <span>Advanced Pathing IV</span>
                <span>Diplomacy III</span>
                <span>Spearcraft IV</span>
              </div>
              <ul className="heelkawn-inventory">
                <li>Warden Spear +2</li>
                <li>Reinforced Field Cloak</li>
                <li>Signal Flare Kit ×3</li>
                <li>Dried Meat Pack ×6</li>
                <li>Workbench Tokens ×12</li>
              </ul>
            </article>
          </div>
        </section>
      )}

      {activeTab === 'studio' && (
        <section className="heelkawn-armory__panel">
          <div className="heelkawn-armory__grid">
            <article className="heelkawn-panel">
              <h3>Customization Studio</h3>
              <p>Live sprite style editor for your HeelKawn identity loadout.</p>
              <div className="heelkawn-sprite heelkawn-sprite--large" aria-label="Customization preview sprite">
                {spriteRows.join('').split('').map((cell, index) => (
                  <span
                    key={`editor-cell-${index}`}
                    className="heelkawn-sprite__cell"
                    style={{ background: cell === '0' ? 'transparent' : spritePalette[cell] }}
                  />
                ))}
              </div>
            </article>

            <article className="heelkawn-panel">
              <h3>Equipment & Style Palette</h3>
              <PaletteGroup title="Skin Tone" options={paletteOptions.skin} selected={skin.id} onSelect={setSkin} />
              <PaletteGroup title="Hair" options={paletteOptions.hair} selected={hair.id} onSelect={setHair} />
              <PaletteGroup title="Armor" options={paletteOptions.armor} selected={armor.id} onSelect={setArmor} />
              <PaletteGroup title="Trim" options={paletteOptions.trim} selected={trim.id} onSelect={setTrim} />
              <div className="download-status">
                Tip: this connects directly to your Armory profile style state once account sync is active.
              </div>
            </article>
          </div>
        </section>
      )}

      {activeTab === 'social' && (
        <section className="heelkawn-armory__panel">
          <div className="heelkawn-armory__grid">
            <article className="heelkawn-panel">
              <h3>Message Threads</h3>
              <div className="heelkawn-threads">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className={`heelkawn-thread ${thread.id === activeThread.id ? 'is-active' : ''}`}
                    onClick={() => setActiveThreadId(thread.id)}
                  >
                    <strong>{thread.name}</strong>
                    <span>{thread.members} members</span>
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
                  placeholder="Send to web + in-game mailbox..."
                  maxLength={180}
                />
                <button className="button" type="submit">
                  Send
                </button>
              </form>
            </article>
          </div>
        </section>
      )}
    </section>
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
