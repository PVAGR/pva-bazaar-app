import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { submitLibraryArticle } from '../../lib/api';
import './LibraryModule.css';

const UNIVERSAL_REFERENCE_TEMPLATE = `---
title: ""
quick_facts:
  Founded: ""
  Legal_Form: ""
  Headquarters: ""
  Market_Share: ""
history: ""
operations: ""
sources:
  - ""
authorId: ""
version: 1
status: draft
---

# Summary

Write a concise overview of the subject.

## History

Add historical background.

## Operations and Impact

Explain operations, impact, and measurable outcomes.

## Sources

- Add verifiable references.
`;

function splitFrontmatter(markdown) {
  const raw = String(markdown || '');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontmatterText: '', body: raw };
  return {
    frontmatterText: match[1],
    body: raw.slice(match[0].length),
  };
}

export default function LibraryEditor({ articleId = '', onSubmitted = () => {} }) {
  const [template, setTemplate] = useState('universal-reference');
  const [markdown, setMarkdown] = useState(UNIVERSAL_REFERENCE_TEMPLATE);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const parsed = useMemo(() => splitFrontmatter(markdown), [markdown]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await submitLibraryArticle({
        articleId,
        markdown,
        note,
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Failed to submit article');
      }

      setSuccess('Article submitted for moderation.');
      onSubmitted(response.item);
    } catch (err) {
      setError(err.message || 'Failed to submit article');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTemplateChange(event) {
    const nextTemplate = event.target.value;
    setTemplate(nextTemplate);
    if (nextTemplate === 'universal-reference') {
      setMarkdown(UNIVERSAL_REFERENCE_TEMPLATE);
    }
  }

  return (
    <section className="library-module" aria-label="Library article editor">
      <header className="library-module-header">
        <h2>Universal Reference Editor</h2>
        <p>
          Compose structured articles in Markdown with YAML frontmatter, then submit for moderation.
        </p>
      </header>

      <form className="library-editor-grid" onSubmit={handleSubmit}>
        <div className="library-panel">
          <label className="library-label" htmlFor="template-selector">
            Template
          </label>
          <select
            id="template-selector"
            className="library-input"
            value={template}
            onChange={handleTemplateChange}
          >
            <option value="universal-reference">English Universal Reference</option>
          </select>

          <label className="library-label" htmlFor="markdown-editor">
            Article Markdown
          </label>
          <textarea
            id="markdown-editor"
            className="library-textarea"
            rows={22}
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            placeholder="Write Markdown with YAML frontmatter..."
          />

          <label className="library-label" htmlFor="submission-note">
            Submission Note
          </label>
          <input
            id="submission-note"
            className="library-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={300}
            placeholder="Optional context for moderators"
          />

          <div className="library-actions">
            <button className="library-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </div>

          {error ? <p className="library-alert library-alert-error">{error}</p> : null}
          {success ? <p className="library-alert library-alert-success">{success}</p> : null}
        </div>

        <div className="library-panel">
          <h3>Frontmatter Preview</h3>
          <pre className="library-code-block">
            {parsed.frontmatterText || 'No frontmatter found'}
          </pre>

          <h3>Rendered Preview</h3>
          <article className="library-markdown-preview">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{parsed.body}</ReactMarkdown>
          </article>
        </div>
      </form>
    </section>
  );
}
