import { useEffect, useMemo, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../../src/lib/api';
import { clearToken, getToken, setToken } from '../../src/lib/auth';

const EMPTY_FORM = {
  name: '',
  title: '',
  description: '',
  category: '',
  artisan: '',
  price: '',
  salePrice: '',
  stockQty: '0',
  status: 'published',
  materials: '',
  tags: '',
  imageUrls: '',
  isUnlimited: false,
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg,var(--site-bg-primary) 0%,var(--site-bg-secondary) 100%)',
    padding: '24px 16px',
    boxSizing: 'border-box',
  },
  shell: {
    maxWidth: '1100px',
    margin: '0 auto',
    background: 'var(--site-panel)',
    border: '1px solid var(--site-border)',
    borderRadius: '16px',
    padding: '20px',
  },
  heading: {
    margin: 0,
    color: 'var(--site-accent)',
    fontFamily: 'Merriweather, serif',
    fontSize: '1.5rem',
  },
  sub: {
    margin: '4px 0 0',
    color: 'var(--site-text-muted)',
    fontSize: '.9rem',
  },
  row: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  input: {
    background: 'rgba(0,0,0,.35)',
    color: 'var(--site-text)',
    border: '1px solid var(--site-border)',
    borderRadius: '10px',
    padding: '10px 12px',
    outline: 'none',
    fontSize: '.9rem',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    background: 'rgba(0,0,0,.35)',
    color: 'var(--site-text)',
    border: '1px solid var(--site-border)',
    borderRadius: '10px',
    padding: '10px 12px',
    outline: 'none',
    fontSize: '.9rem',
    width: '100%',
    minHeight: '82px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  primary: {
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    background: 'var(--site-accent)',
    color: '#05252c',
    fontWeight: 700,
    cursor: 'pointer',
  },
  ghost: {
    border: '1px solid var(--site-border)',
    borderRadius: '10px',
    padding: '10px 14px',
    background: 'transparent',
    color: 'var(--site-text)',
    cursor: 'pointer',
  },
  danger: {
    border: '1px solid var(--site-danger-text)',
    borderRadius: '10px',
    padding: '8px 12px',
    background: 'var(--site-danger-bg)',
    color: 'var(--site-danger-text)',
    cursor: 'pointer',
  },
  section: {
    marginTop: '18px',
    border: '1px solid var(--site-border)',
    borderRadius: '12px',
    padding: '14px',
    background: 'var(--site-panel-soft)',
  },
  alertError: {
    marginTop: '12px',
    border: '1px solid var(--site-danger-text)',
    background: 'var(--site-danger-bg)',
    color: 'var(--site-danger-text)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '.88rem',
  },
  alertOk: {
    marginTop: '12px',
    border: '1px solid var(--site-success-text)',
    background: 'var(--site-success-bg)',
    color: 'var(--site-success-text)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '.88rem',
  },
  tableWrap: {
    overflowX: 'auto',
    marginTop: '12px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '.88rem',
  },
  th: {
    textAlign: 'left',
    color: 'var(--site-text-muted)',
    borderBottom: '1px solid var(--site-border)',
    padding: '8px',
    fontWeight: 600,
  },
  td: {
    color: 'var(--site-text)',
    borderBottom: '1px solid rgba(0, 105, 92, .24)',
    padding: '9px 8px',
    verticalAlign: 'middle',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '10px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '10px',
  },
};

function parseError(err) {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    'Request failed'
  );
}

function authConfig() {
  const token = getToken();
  return token ? { headers: { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } } : {};
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    artisan: form.artisan.trim(),
    price: Number(form.price),
    salePrice: form.salePrice ? Number(form.salePrice) : undefined,
    stockQty: Number(form.stockQty || 0),
    status: form.status,
    materials: form.materials.split(',').map((v) => v.trim()).filter(Boolean),
    tags: form.tags.split(',').map((v) => v.trim()).filter(Boolean),
    imageUrls: form.imageUrls.split('\n').map((v) => v.trim()).filter(Boolean),
    isUnlimited: !!form.isUnlimited,
  };
}

function fromArtifact(item) {
  return {
    name: item?.name || '',
    title: item?.title || '',
    description: item?.description || '',
    category: item?.category || '',
    artisan: item?.artisan || '',
    price: item?.price != null ? String(item.price) : '',
    salePrice: item?.salePrice != null ? String(item.salePrice) : '',
    stockQty: item?.stockQty != null ? String(item.stockQty) : '0',
    status: item?.status || 'published',
    materials: (item?.materials || []).join(', '),
    tags: (item?.tags || []).join(', '),
    imageUrls: (item?.imageUrls || []).join('\n'),
    isUnlimited: !!item?.isUnlimited,
  };
}

function LoginPanel({ onLoggedIn }) {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiPost('/admin/token', { secret });
      setToken(data.token);
      onLoggedIn();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={{ ...styles.shell, maxWidth: 420, marginTop: '100px' }}>
        <h1 style={styles.heading}>Admin Sign In</h1>
        <p style={styles.sub}>Use your admin secret code.</p>
        {error && <div style={styles.alertError}>{error}</div>}
        <form onSubmit={submit} style={{ marginTop: '12px' }}>
          <input
            style={styles.input}
            type="password"
            placeholder="Secret code"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
          />
          <button type="submit" style={{ ...styles.primary, width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Editor({ draft, setDraft, saving, onSave, onCancel }) {
  return (
    <section style={styles.section}>
      <h2 style={{ ...styles.heading, fontSize: '1.15rem' }}>Artifact Editor</h2>
      <p style={styles.sub}>Focused form with only core listing fields.</p>

      <div style={styles.grid2}>
        <input style={styles.input} placeholder="Name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        <input style={styles.input} placeholder="Title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
      </div>

      <textarea style={{ ...styles.textarea, marginTop: '10px' }} placeholder="Description" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />

      <div style={{ ...styles.grid3, marginTop: '10px' }}>
        <input style={styles.input} placeholder="Category" value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} />
        <input style={styles.input} placeholder="Artisan" value={draft.artisan} onChange={(e) => setDraft((d) => ({ ...d, artisan: e.target.value }))} />
        <select style={styles.input} value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div style={{ ...styles.grid3, marginTop: '10px' }}>
        <input style={styles.input} type="number" min="0" step="0.01" placeholder="Price" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} />
        <input style={styles.input} type="number" min="0" step="0.01" placeholder="Sale price (optional)" value={draft.salePrice} onChange={(e) => setDraft((d) => ({ ...d, salePrice: e.target.value }))} />
        <input style={styles.input} type="number" min="0" placeholder="Stock quantity" value={draft.stockQty} onChange={(e) => setDraft((d) => ({ ...d, stockQty: e.target.value }))} disabled={draft.isUnlimited} />
      </div>

      <div style={{ ...styles.grid2, marginTop: '10px' }}>
        <input style={styles.input} placeholder="Materials (comma separated)" value={draft.materials} onChange={(e) => setDraft((d) => ({ ...d, materials: e.target.value }))} />
        <input style={styles.input} placeholder="Tags (comma separated)" value={draft.tags} onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))} />
      </div>

      <textarea style={{ ...styles.textarea, marginTop: '10px' }} placeholder="Image URLs (one per line)" value={draft.imageUrls} onChange={(e) => setDraft((d) => ({ ...d, imageUrls: e.target.value }))} />

      <label style={{ ...styles.sub, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="checkbox"
          checked={draft.isUnlimited}
          onChange={(e) => setDraft((d) => ({ ...d, isUnlimited: e.target.checked }))}
          style={{ accentColor: 'var(--site-accent)' }}
        />
        Unlimited stock
      </label>

      <div style={{ ...styles.row, marginTop: '10px' }}>
        <button type="button" style={styles.primary} onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Artifact'}
        </button>
        <button type="button" style={styles.ghost} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function AdminDashboard({ onLogout }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_FORM);

  const isEditing = useMemo(() => !!editingId, [editingId]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (query) params.set('search', query);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '100');
      const data = await apiGet(`/admin/artifacts?${params.toString()}`, authConfig());
      setItems(data.artifacts || []);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditingId('new');
    setDraft(EMPTY_FORM);
    setError('');
    setSuccess('');
  }

  function startEdit(item) {
    setEditingId(item._id);
    setDraft(fromArtifact(item));
    setError('');
    setSuccess('');
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_FORM);
  }

  async function saveArtifact() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = toPayload(draft);
      if (!payload.name || !payload.title || !payload.description || !payload.category || !payload.artisan || !payload.price) {
        throw new Error('Name, title, description, category, artisan, and price are required.');
      }

      if (editingId === 'new') {
        await apiPost('/admin/artifacts', payload, authConfig());
        setSuccess('Artifact created.');
      } else {
        await apiPut(`/admin/artifacts/${editingId}`, payload, authConfig());
        setSuccess('Artifact updated.');
      }

      cancelEdit();
      await load();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setSaving(false);
    }
  }

  async function removeArtifact(id) {
    const confirmed = window.confirm('Delete this artifact permanently?');
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await apiDelete(`/admin/artifacts/${id}`, authConfig());
      setSuccess('Artifact deleted.');
      await load();
    } catch (err) {
      setError(parseError(err));
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={{ ...styles.row, justifyContent: 'space-between' }}>
          <div>
            <h1 style={styles.heading}>Artifact Administration</h1>
            <p style={styles.sub}>Clean and focused management workspace.</p>
          </div>
          <div style={styles.row}>
            <button type="button" style={styles.primary} onClick={startCreate}>New Artifact</button>
            <button type="button" style={styles.ghost} onClick={onLogout}>Sign Out</button>
          </div>
        </div>

        {error ? <div style={styles.alertError}>{error}</div> : null}
        {success ? <div style={styles.alertOk}>{success}</div> : null}

        <section style={styles.section}>
          <div style={styles.row}>
            <input
              style={{ ...styles.input, flex: 1, minWidth: '240px' }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, name, artisan, category"
            />
            <select style={{ ...styles.input, width: '170px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <button type="button" style={styles.ghost} onClick={load} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Artisan</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Price</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!items.length && (
                  <tr>
                    <td style={styles.td} colSpan={6}>No artifacts found.</td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr key={item._id}>
                    <td style={styles.td}>{item.title || item.name}</td>
                    <td style={styles.td}>{item.artisan}</td>
                    <td style={styles.td}>{item.category}</td>
                    <td style={styles.td}>${item.salePrice || item.price}</td>
                    <td style={styles.td}>{item.status || 'published'}</td>
                    <td style={styles.td}>
                      <div style={styles.row}>
                        <button type="button" style={styles.ghost} onClick={() => startEdit(item)}>Edit</button>
                        <button type="button" style={styles.danger} onClick={() => removeArtifact(item._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {editingId ? (
          <Editor
            draft={draft}
            setDraft={setDraft}
            saving={saving}
            onSave={saveArtifact}
            onCancel={cancelEdit}
          />
        ) : null}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(!!getToken());
    setReady(true);
  }, []);

  if (!ready) return <div style={{ minHeight: '100vh', background: 'var(--site-bg-primary)' }} />;

  if (!authenticated) {
    return <LoginPanel onLoggedIn={() => setAuthenticated(true)} />;
  }

  return (
    <AdminDashboard
      onLogout={() => {
        clearToken();
        setAuthenticated(false);
      }}
    />
  );
}
