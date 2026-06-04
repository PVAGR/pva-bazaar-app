import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import AdminNav from '../components/AdminNav.jsx';
import { apiFetch, apiGet } from '../lib/api.js';
import { addLocalEntry } from '../lib/entries.js';
import { createArchiveEntry, requestAdminToken } from '../lib/archiveApi.js';
import './WritingStudioPage.css';

const NOTES_KEY = 'pva-writing-studio-notes';
const NOTE_DRAFT_KEY = 'pva-writing-studio-note-draft';
const BLOG_DRAFT_KEY = 'pva-writing-studio-blog-draft';
const SOCIAL_KEY = 'pva-writing-studio-social';
const PUBLICATIONS_KEY = 'pva-writing-studio-publications';

const SOCIAL_FIELDS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'x', label: 'X / Twitter', placeholder: 'https://x.com/yourhandle' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourname' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'telegram', label: 'Telegram', placeholder: 'https://t.me/yourchannel' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/yournumber' },
  { key: 'reddit', label: 'Reddit', placeholder: 'https://reddit.com/user/yourname' },
  { key: 'threads', label: 'Threads', placeholder: 'https://threads.net/@yourhandle' },
];

function loadJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `post-${Date.now()}`;
}

function buildHashUrl(path) {
  if (typeof window === 'undefined') return `https://pvabazaar.org/#/${path.replace(/^\/+/, '')}`;
  return `${window.location.origin}${window.location.pathname}#/${path.replace(/^\/+/, '')}`;
}

async function apiJson(path, { method = 'GET', token = '', body } = {}) {
  const response = await apiFetch(path, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || json?.error || `Request failed (${response.status})`);
  }
  return json;
}

async function ensureAdminToken() {
  if (typeof window === 'undefined') throw new Error('Admin token can only be requested in the browser');
  const existing = window.localStorage.getItem('admin:token');
  if (existing) return existing;

  const secret = window.prompt('Enter your admin secret to publish directly');
  if (!secret) {
    throw new Error('Admin secret was not provided');
  }

  const token = await requestAdminToken(secret);
  window.localStorage.setItem('admin:token', token);
  return token;
}

function buildShareLinks({ title, text, url }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text);
  return [
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { key: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { key: 'reddit', label: 'Reddit', href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}` },
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodedText}%20${encodedUrl}` },
    { key: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { key: 'email', label: 'Email', href: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}` },
  ];
}

export default function WritingStudioPage() {
  const [activeTab, setActiveTab] = useState('notes');
  const [notes, setNotes] = useState(() => loadJson(NOTES_KEY, []));
  const [noteDraft, setNoteDraft] = useState(() =>
    loadJson(NOTE_DRAFT_KEY, { id: '', title: '', body: '', tags: '' })
  );
  const [blogDraft, setBlogDraft] = useState(() =>
    loadJson(BLOG_DRAFT_KEY, {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      tags: '',
      category: 'blog',
      location: '',
      authorName: 'Richard Torres',
      socialCaption: '',
      publishToArchive: true,
      publishToBlog: true,
      directBlogPublish: true,
    })
  );
  const [socialProfiles, setSocialProfiles] = useState(() =>
    loadJson(SOCIAL_KEY, { signature: '' })
  );
  const [recentPublications, setRecentPublications] = useState(() => loadJson(PUBLICATIONS_KEY, []));
  const [publishStatus, setPublishStatus] = useState({ kind: 'idle', message: '' });
  const [publishing, setPublishing] = useState(false);
  const [remoteBlogs, setRemoteBlogs] = useState([]);
  const [remoteBlogsLoading, setRemoteBlogsLoading] = useState(true);
  const [remoteBlogsError, setRemoteBlogsError] = useState('');

  useEffect(() => {
    saveJson(NOTES_KEY, notes);
  }, [notes]);

  useEffect(() => {
    saveJson(NOTE_DRAFT_KEY, noteDraft);
  }, [noteDraft]);

  useEffect(() => {
    saveJson(BLOG_DRAFT_KEY, blogDraft);
  }, [blogDraft]);

  useEffect(() => {
    saveJson(SOCIAL_KEY, socialProfiles);
  }, [socialProfiles]);

  useEffect(() => {
    saveJson(PUBLICATIONS_KEY, recentPublications);
  }, [recentPublications]);

  useEffect(() => {
    let cancelled = false;
    const loadBlogs = async () => {
      setRemoteBlogsLoading(true);
      setRemoteBlogsError('');
      try {
        const result = await apiGet('/blogs');
        if (!cancelled) {
          setRemoteBlogs(Array.isArray(result?.blogs) ? result.blogs : []);
        }
      } catch (error) {
        if (!cancelled) {
          setRemoteBlogs([]);
          setRemoteBlogsError(error?.message || 'Unable to load published blogs');
        }
      } finally {
        if (!cancelled) {
          setRemoteBlogsLoading(false);
        }
      }
    };

    loadBlogs();
    return () => {
      cancelled = true;
    };
  }, []);

  const draftSlug = useMemo(
    () => slugify(blogDraft.slug || blogDraft.title),
    [blogDraft.slug, blogDraft.title]
  );

  const shareText = useMemo(() => {
    const base = blogDraft.socialCaption || blogDraft.excerpt || blogDraft.title || 'New post from PVA Bazaar';
    const signature = socialProfiles.signature ? ` ${socialProfiles.signature}` : '';
    return `${base}${signature}`.trim();
  }, [blogDraft.excerpt, blogDraft.socialCaption, blogDraft.title, socialProfiles.signature]);

  const shareReadyPublication = recentPublications.find((item) => item.shareReady !== false);
  const latestPublicationUrl = shareReadyPublication?.url || buildHashUrl('studio');

  const shareLinks = useMemo(
    () => buildShareLinks({ title: blogDraft.title || 'PVA Bazaar post', text: shareText, url: latestPublicationUrl }),
    [blogDraft.title, latestPublicationUrl, shareText]
  );

  const saveNote = () => {
    if (!noteDraft.title.trim() && !noteDraft.body.trim()) {
      setPublishStatus({ kind: 'error', message: 'Write something first before saving a note.' });
      return;
    }

    const nextNote = {
      id: noteDraft.id || `note-${Date.now()}`,
      title: noteDraft.title.trim() || `Untitled note ${new Date().toLocaleDateString()}`,
      body: noteDraft.body,
      tags: noteDraft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      updatedAt: new Date().toISOString(),
    };

    setNotes((current) => [nextNote, ...current.filter((item) => item.id !== nextNote.id)]);
    setNoteDraft({ id: '', title: '', body: '', tags: '' });
    setPublishStatus({ kind: 'success', message: 'Note saved in your studio.' });
  };

  const loadNoteIntoEditor = (note) => {
    setActiveTab('notes');
    setNoteDraft({
      id: note.id,
      title: note.title || '',
      body: note.body || '',
      tags: Array.isArray(note.tags) ? note.tags.join(', ') : '',
    });
  };

  const deleteNote = (id) => {
    setNotes((current) => current.filter((note) => note.id !== id));
    if (noteDraft.id === id) {
      setNoteDraft({ id: '', title: '', body: '', tags: '' });
    }
  };

  const rememberPublication = (entry) => {
    setRecentPublications((current) => [
      entry,
      ...current.filter((item) => item.url !== entry.url || item.type !== entry.type),
    ].slice(0, 12));
  };

  const publishStudioPost = async () => {
    if (!blogDraft.title.trim() || !blogDraft.content.trim()) {
      setPublishStatus({ kind: 'error', message: 'Add a title and body before publishing.' });
      return;
    }

    setPublishing(true);
    setPublishStatus({ kind: 'working', message: 'Publishing your writing...' });

    const tags = blogDraft.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const publicationResults = [];

    try {
      if (blogDraft.publishToArchive) {
        const archiveEntry = {
          id: `studio-${Date.now()}`,
          title: blogDraft.title.trim(),
          date: new Date().toISOString().slice(0, 10),
          location: blogDraft.location.trim(),
          category: blogDraft.category.trim() || 'blog',
          tags,
          excerpt: blogDraft.excerpt.trim() || blogDraft.content.trim().slice(0, 220),
          content: blogDraft.content,
        };

        try {
          const adminToken = await ensureAdminToken();
          const created = await createArchiveEntry(archiveEntry, adminToken);
          const archiveId = created?._id || created?.id || archiveEntry.id;
          const archiveUrl = buildHashUrl(`entry/${archiveId}`);
          const result = {
            type: 'archive',
            status: 'published',
            title: blogDraft.title.trim(),
            url: archiveUrl,
            publishedAt: new Date().toISOString(),
            shareReady: true,
          };
          publicationResults.push(result);
          rememberPublication(result);
        } catch (error) {
          addLocalEntry(archiveEntry);
          const localArchiveUrl = buildHashUrl(`entry/${archiveEntry.id}`);
          const result = {
            type: 'archive',
            status: 'saved-local',
            title: blogDraft.title.trim(),
            url: localArchiveUrl,
            publishedAt: new Date().toISOString(),
            shareReady: true,
          };
          publicationResults.push(result);
          rememberPublication(result);
        }
      }

      if (blogDraft.publishToBlog) {
        const blogUrl = buildHashUrl(`blog/${draftSlug}`);
        if (blogDraft.directBlogPublish) {
          try {
            const adminToken = await ensureAdminToken();
            const setup = await apiJson('/api/blogs/setup', {
              method: 'POST',
              token: adminToken,
              body: {
                slug: draftSlug,
                title: blogDraft.title.trim(),
              },
            });

            await apiJson(`/api/blogs/${encodeURIComponent(draftSlug)}/update`, {
              method: 'POST',
              body: {
                edit: setup.editSecret,
                title: blogDraft.title.trim(),
                content: blogDraft.content,
              },
            });

            const result = {
              type: 'blog',
              status: 'published',
              title: blogDraft.title.trim(),
              url: blogUrl,
              publishedAt: new Date().toISOString(),
              shareReady: true,
            };
            publicationResults.push(result);
            rememberPublication(result);
          } catch (error) {
            const submitted = await apiJson('/api/contribute/submit', {
              method: 'POST',
              body: {
                title: blogDraft.title.trim(),
                content: blogDraft.content,
                authorName: blogDraft.authorName.trim() || 'Richard Torres',
              },
            });
            const result = {
              type: 'blog',
              status: 'submitted',
              title: blogDraft.title.trim(),
              url: buildHashUrl(`blog/${submitted.slug || draftSlug}`),
              publishedAt: new Date().toISOString(),
              shareReady: false,
            };
            publicationResults.push(result);
            rememberPublication(result);
          }
        } else {
          const submitted = await apiJson('/api/contribute/submit', {
            method: 'POST',
            body: {
              title: blogDraft.title.trim(),
              content: blogDraft.content,
              authorName: blogDraft.authorName.trim() || 'Richard Torres',
            },
          });
          const result = {
            type: 'blog',
            status: 'submitted',
            title: blogDraft.title.trim(),
            url: buildHashUrl(`blog/${submitted.slug || draftSlug}`),
            publishedAt: new Date().toISOString(),
            shareReady: false,
          };
          publicationResults.push(result);
          rememberPublication(result);
        }
      }

      setPublishStatus({
        kind: 'success',
        message: publicationResults.length > 0
          ? `Published ${publicationResults.map((item) => `${item.type} (${item.status})`).join(', ')}.`
          : 'Your draft is ready, but nothing was selected to publish.',
      });
      setActiveTab('social');
    } catch (error) {
      setPublishStatus({ kind: 'error', message: error?.message || 'Publishing failed' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="writing-studio">
      <header className="writing-studio__hero section-card">
        <div>
          <p className="pill">Writing studio</p>
          <h1>Your notes, blogs, archive posts, and social launch pad in one place.</h1>
          <p className="writing-studio__lead">
            Write quickly, save private notes whenever you need them, turn stronger pieces into blog posts or archive
            entries, and launch them out through the social channels you want connected.
          </p>
        </div>
        <div className="writing-studio__heroMeta">
          <div>
            <strong>{notes.length}</strong>
            <span>saved notes</span>
          </div>
          <div>
            <strong>{recentPublications.length}</strong>
            <span>recent publications</span>
          </div>
          <div>
            <strong>{SOCIAL_FIELDS.filter((field) => socialProfiles[field.key]).length}</strong>
            <span>social links set</span>
          </div>
        </div>
      </header>

      <AdminNav />

      <section className="writing-studio__tabs">
        {[
          ['notes', 'Notes'],
          ['blog', 'Blog + Archive'],
          ['social', 'Social launch'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`writing-studio__tab ${activeTab === key ? 'is-active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </section>

      {publishStatus.message ? (
        <section className={`section-card writing-studio__status writing-studio__status--${publishStatus.kind}`}>
          {publishStatus.message}
        </section>
      ) : null}

      {activeTab === 'notes' ? (
        <section className="writing-studio__grid">
          <article className="section-card writing-studio__panel">
            <div className="writing-studio__panelHead">
              <div>
                <p className="pill">Capture</p>
                <h2>Quick notes</h2>
              </div>
              <button
                type="button"
                className="writing-studio__ghostBtn"
                onClick={() => setNoteDraft({ id: '', title: '', body: '', tags: '' })}
              >
                New note
              </button>
            </div>
            <label className="writing-studio__field">
              <span>Title</span>
              <input
                value={noteDraft.title}
                onChange={(event) => setNoteDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Capture the thought before it disappears"
              />
            </label>
            <label className="writing-studio__field">
              <span>Tags</span>
              <input
                value={noteDraft.tags}
                onChange={(event) => setNoteDraft((current) => ({ ...current, tags: event.target.value }))}
                placeholder="sourcing, supply chain, essay idea"
              />
            </label>
            <label className="writing-studio__field">
              <span>Body</span>
              <textarea
                rows={14}
                value={noteDraft.body}
                onChange={(event) => setNoteDraft((current) => ({ ...current, body: event.target.value }))}
                placeholder="Write freely. This stays private in your browser until you turn it into something more."
              />
            </label>
            <div className="writing-studio__actions">
              <button type="button" className="writing-studio__primaryBtn" onClick={saveNote}>
                Save note
              </button>
              <button
                type="button"
                className="writing-studio__ghostBtn"
                onClick={() => {
                  setBlogDraft((current) => ({
                    ...current,
                    title: current.title || noteDraft.title,
                    excerpt: current.excerpt || noteDraft.body.slice(0, 220),
                    content: current.content || noteDraft.body,
                  }));
                  setActiveTab('blog');
                }}
              >
                Turn into blog draft
              </button>
            </div>
          </article>

          <article className="section-card writing-studio__panel">
            <div className="writing-studio__panelHead">
              <div>
                <p className="pill">Library</p>
                <h2>Saved notes</h2>
              </div>
              <span className="writing-studio__muted">{notes.length} total</span>
            </div>
            <div className="writing-studio__list">
              {notes.length === 0 ? (
                <div className="writing-studio__empty">No notes yet. Start writing on the left.</div>
              ) : notes.map((note) => (
                <article key={note.id} className="writing-studio__listItem">
                  <button type="button" onClick={() => loadNoteIntoEditor(note)}>
                    <strong>{note.title}</strong>
                    <span>{new Date(note.updatedAt).toLocaleString()}</span>
                    <p>{String(note.body || '').slice(0, 140)}{String(note.body || '').length > 140 ? '…' : ''}</p>
                  </button>
                  <button type="button" className="writing-studio__dangerBtn" onClick={() => deleteNote(note.id)}>
                    Delete
                  </button>
                </article>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === 'blog' ? (
        <section className="writing-studio__grid writing-studio__grid--blog">
          <article className="section-card writing-studio__panel">
            <div className="writing-studio__panelHead">
              <div>
                <p className="pill">Compose</p>
                <h2>Blog and archive draft</h2>
              </div>
              <span className="writing-studio__muted">Slug: {draftSlug}</span>
            </div>

            <div className="writing-studio__fieldRow">
              <label className="writing-studio__field">
                <span>Title</span>
                <input
                  value={blogDraft.title}
                  onChange={(event) => setBlogDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Write the piece you want the world to remember"
                />
              </label>
              <label className="writing-studio__field">
                <span>Slug</span>
                <input
                  value={blogDraft.slug}
                  onChange={(event) => setBlogDraft((current) => ({ ...current, slug: event.target.value }))}
                  placeholder="leave blank to auto-generate"
                />
              </label>
            </div>

            <div className="writing-studio__fieldRow">
              <label className="writing-studio__field">
                <span>Author</span>
                <input
                  value={blogDraft.authorName}
                  onChange={(event) => setBlogDraft((current) => ({ ...current, authorName: event.target.value }))}
                />
              </label>
              <label className="writing-studio__field">
                <span>Category</span>
                <input
                  value={blogDraft.category}
                  onChange={(event) => setBlogDraft((current) => ({ ...current, category: event.target.value }))}
                  placeholder="blog, journal, sourcing, operations"
                />
              </label>
            </div>

            <label className="writing-studio__field">
              <span>Excerpt</span>
              <textarea
                rows={3}
                value={blogDraft.excerpt}
                onChange={(event) => setBlogDraft((current) => ({ ...current, excerpt: event.target.value }))}
                placeholder="Short description for previews and social captions"
              />
            </label>

            <div className="writing-studio__fieldRow">
              <label className="writing-studio__field">
                <span>Tags</span>
                <input
                  value={blogDraft.tags}
                  onChange={(event) => setBlogDraft((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="artisan, sourcing, kenya"
                />
              </label>
              <label className="writing-studio__field">
                <span>Location</span>
                <input
                  value={blogDraft.location}
                  onChange={(event) => setBlogDraft((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Nairobi, Kenya"
                />
              </label>
            </div>

            <label className="writing-studio__field">
              <span>Social caption</span>
              <input
                value={blogDraft.socialCaption}
                onChange={(event) => setBlogDraft((current) => ({ ...current, socialCaption: event.target.value }))}
                placeholder="Custom line to use when you share this outward"
              />
            </label>

            <label className="writing-studio__field">
              <span>Body (Markdown supported)</span>
              <textarea
                rows={18}
                value={blogDraft.content}
                onChange={(event) => setBlogDraft((current) => ({ ...current, content: event.target.value }))}
                placeholder="Write the full piece here..."
              />
            </label>

            <div className="writing-studio__checks">
              <label><input type="checkbox" checked={blogDraft.publishToArchive} onChange={(event) => setBlogDraft((current) => ({ ...current, publishToArchive: event.target.checked }))} /> Publish to archive</label>
              <label><input type="checkbox" checked={blogDraft.publishToBlog} onChange={(event) => setBlogDraft((current) => ({ ...current, publishToBlog: event.target.checked }))} /> Publish to blog</label>
              <label><input type="checkbox" checked={blogDraft.directBlogPublish} onChange={(event) => setBlogDraft((current) => ({ ...current, directBlogPublish: event.target.checked }))} /> Try direct blog publish first</label>
            </div>

            <div className="writing-studio__actions">
              <button type="button" className="writing-studio__primaryBtn" onClick={publishStudioPost} disabled={publishing}>
                {publishing ? 'Publishing...' : 'Publish from studio'}
              </button>
              <button
                type="button"
                className="writing-studio__ghostBtn"
                onClick={() => setBlogDraft({
                  title: '',
                  slug: '',
                  excerpt: '',
                  content: '',
                  tags: '',
                  category: 'blog',
                  location: '',
                  authorName: blogDraft.authorName || 'Richard Torres',
                  socialCaption: '',
                  publishToArchive: true,
                  publishToBlog: true,
                  directBlogPublish: true,
                })}
              >
                Clear draft
              </button>
            </div>
          </article>

          <article className="section-card writing-studio__panel">
            <div className="writing-studio__panelHead">
              <div>
                <p className="pill">Preview</p>
                <h2>How it will read</h2>
              </div>
              <Link to={`/blog/${draftSlug}`} className="writing-studio__ghostLink">Open blog route</Link>
            </div>
            <article className="writing-studio__preview">
              <h1>{blogDraft.title || 'Untitled draft'}</h1>
              <p className="writing-studio__previewMeta">
                {(blogDraft.authorName || 'Unknown author')} · {blogDraft.category || 'blog'} · {draftSlug}
              </p>
              {blogDraft.excerpt ? <p className="writing-studio__previewExcerpt">{blogDraft.excerpt}</p> : null}
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {blogDraft.content || 'Your post preview will appear here as you write.'}
              </ReactMarkdown>
            </article>

            <div className="writing-studio__recent">
              <h3>Recent publications</h3>
              {recentPublications.length === 0 ? (
                <div className="writing-studio__empty">Nothing published from the studio yet.</div>
              ) : (
                <div className="writing-studio__list">
                  {recentPublications.map((item, index) => (
                    <a key={`${item.url}-${index}`} className="writing-studio__listLink" href={item.url} target="_blank" rel="noreferrer">
                      <strong>{item.title}</strong>
                      <span>{item.type} · {item.status}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === 'social' ? (
        <section className="writing-studio__grid writing-studio__grid--blog">
          <article className="section-card writing-studio__panel">
            <div className="writing-studio__panelHead">
              <div>
                <p className="pill">Connect</p>
                <h2>Social links and identity</h2>
              </div>
              <span className="writing-studio__muted">These are stored in this browser for now.</span>
            </div>

            <label className="writing-studio__field">
              <span>Signature</span>
              <input
                value={socialProfiles.signature || ''}
                onChange={(event) => setSocialProfiles((current) => ({ ...current, signature: event.target.value }))}
                placeholder="— Richard / PVA Bazaar"
              />
            </label>

            <div className="writing-studio__socialGrid">
              {SOCIAL_FIELDS.map((field) => (
                <label key={field.key} className="writing-studio__field">
                  <span>{field.label}</span>
                  <input
                    value={socialProfiles[field.key] || ''}
                    onChange={(event) => setSocialProfiles((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                  />
                </label>
              ))}
            </div>
          </article>

          <article className="section-card writing-studio__panel">
            <div className="writing-studio__panelHead">
              <div>
                <p className="pill">Launch</p>
                <h2>Share this piece outward</h2>
              </div>
              <span className="writing-studio__muted">Primary link: {latestPublicationUrl}</span>
            </div>

            <div className="writing-studio__shareCopy">
              <strong>Share text</strong>
              <p>{shareText}</p>
            </div>

            <div className="writing-studio__shareActions">
              {shareLinks.map((link) => (
                <a key={link.key} href={link.href} target="_blank" rel="noreferrer" className="writing-studio__shareBtn">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="writing-studio__connectedLinks">
              <h3>Your linked profiles</h3>
              <div className="writing-studio__list">
                {SOCIAL_FIELDS.filter((field) => socialProfiles[field.key]).map((field) => (
                  <a key={field.key} className="writing-studio__listLink" href={socialProfiles[field.key]} target="_blank" rel="noreferrer">
                    <strong>{field.label}</strong>
                    <span>{socialProfiles[field.key]}</span>
                  </a>
                ))}
                {SOCIAL_FIELDS.every((field) => !socialProfiles[field.key]) ? (
                  <div className="writing-studio__empty">Add your profile links on the left and they will appear here.</div>
                ) : null}
              </div>
            </div>

            <div className="writing-studio__recent">
              <h3>Published blog feed</h3>
              {remoteBlogsLoading ? <div className="writing-studio__empty">Loading published blogs...</div> : null}
              {!remoteBlogsLoading && remoteBlogsError ? <div className="writing-studio__empty">{remoteBlogsError}</div> : null}
              {!remoteBlogsLoading && !remoteBlogsError ? (
                <div className="writing-studio__list">
                  {remoteBlogs.slice(0, 8).map((blog) => (
                    <Link key={blog.slug} className="writing-studio__listLink" to={`/blog/${blog.slug}`}>
                      <strong>{blog.title}</strong>
                      <span>{blog.updatedAt ? new Date(blog.updatedAt).toLocaleDateString() : 'Published'}</span>
                    </Link>
                  ))}
                  {remoteBlogs.length === 0 ? <div className="writing-studio__empty">No published blogs are available yet.</div> : null}
                </div>
              ) : null}
            </div>
          </article>
        </section>
      ) : null}
    </div>
  );
}
