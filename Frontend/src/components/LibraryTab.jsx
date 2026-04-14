import { useEffect, useMemo, useState } from 'react';
import { ENV } from '../config/env';
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from '../lib/api';
import { createLogger } from '../lib/logger';
import LoadingSpinner, { LoadingDots } from './LoadingSpinner';
import './LibraryTab.css';

const logger = createLogger('LibraryTab');

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'general',
  domain: 'general',
  tags: '',
  status: 'draft',
  visibility: 'public',
  skillLevel: 'intro',
  language: 'en',
};

function toApiUrl(path) {
  const base = ENV.API_URL.replace(/\/+$/, '');
  const normalized = base.endsWith('/api') && path.startsWith('/api/') ? path.slice(4) : path;
  return `${base}${normalized}`;
}

export default function LibraryTab() {
  const [items, setItems] = useState([]);
  const [quizStats, setQuizStats] = useState(null);
  const [quizDefinition, setQuizDefinition] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizIntro, setQuizIntro] = useState('');
  const [quizQuestionsText, setQuizQuestionsText] = useState('[]');
  const [quizEditorSaving, setQuizEditorSaving] = useState(false);
  const [quizPreview, setQuizPreview] = useState(null);
  const [quizPreviewLoading, setQuizPreviewLoading] = useState(false);
  const [quizPreviewStrategy, setQuizPreviewStrategy] = useState('first-option');
  const [quizPreviewCustomAnswers, setQuizPreviewCustomAnswers] = useState({});
  const [snapshotDraft, setSnapshotDraft] = useState(null);
  const [snapshotDiff, setSnapshotDiff] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [taxonomy, setTaxonomy] = useState(null);
  const [taxonomyCategoriesText, setTaxonomyCategoriesText] = useState('');
  const [taxonomyDomainsText, setTaxonomyDomainsText] = useState('');
  const [taxonomyRolesText, setTaxonomyRolesText] = useState('');
  const [taxonomyDomainRolesText, setTaxonomyDomainRolesText] = useState('{}');
  const [taxonomySaving, setTaxonomySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const parseCsvList = (value) => {
    const values = String(value || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const seen = new Set();
    const duplicates = new Set();
    for (const item of values) {
      if (seen.has(item)) duplicates.add(item);
      seen.add(item);
    }
    return {
      raw: values,
      unique: Array.from(seen),
      duplicates: Array.from(duplicates),
    };
  };

  useEffect(() => {
    loadItems();
    loadQuizStats();
    loadQuizDefinition();
    loadTaxonomy();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/admin/library?limit=200');
      if (data.ok) {
        setItems(Array.isArray(data.items) ? data.items : []);
      } else {
        setError(data.error || 'Failed to load library documents');
      }
    } catch (err) {
      logger.error('Failed to load documents', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadQuizStats = async () => {
    try {
      const data = await apiGet('/career-quiz/stats');
      if (data.ok) {
        setQuizStats(data);
      }
    } catch (err) {
      logger.warn('Quiz stats unavailable', err);
    }
  };

  const loadQuizDefinition = async () => {
    try {
      const data = await apiGet('/career-quiz/admin/definition');
      if (data.ok && data.quiz) {
        setQuizDefinition(data.quiz);
        setQuizTitle(data.quiz.title || '');
        setQuizIntro(data.quiz.intro || '');
        setQuizQuestionsText(JSON.stringify(data.quiz.questions || [], null, 2));
      }
    } catch (err) {
      logger.warn('Quiz definition unavailable', err);
    }
  };

  const saveQuizDefinition = async () => {
    setQuizEditorSaving(true);
    setError('');
    setSuccess('');
    try {
      let parsedQuestions;
      try {
        parsedQuestions = JSON.parse(quizQuestionsText);
      } catch (_parseError) {
        throw new Error('Questions JSON is invalid');
      }

      const payload = {
        title: quizTitle,
        intro: quizIntro,
        questions: parsedQuestions,
      };

      const data = await apiPut('/career-quiz/admin/definition', payload);
      if (!data.ok || !data.quiz) {
        throw new Error(data.error || 'Failed to save quiz definition');
      }

      setQuizDefinition(data.quiz);
      setQuizTitle(data.quiz.title || '');
      setQuizIntro(data.quiz.intro || '');
      setQuizQuestionsText(JSON.stringify(data.quiz.questions || [], null, 2));
      setSuccess(`Quiz definition updated to version ${data.quiz.version}.`);
    } catch (err) {
      setError(err.message || 'Failed to save quiz definition');
    } finally {
      setQuizEditorSaving(false);
    }
  };

  const resetQuizDefinition = async () => {
    if (!window.confirm('Reset quiz definition to default questions?')) return;
    setQuizEditorSaving(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiPost('/career-quiz/admin/definition/reset', {});
      if (!data.ok || !data.quiz) {
        throw new Error(data.error || 'Failed to reset quiz definition');
      }
      setQuizDefinition(data.quiz);
      setQuizTitle(data.quiz.title || '');
      setQuizIntro(data.quiz.intro || '');
      setQuizQuestionsText(JSON.stringify(data.quiz.questions || [], null, 2));
      setSuccess(`Quiz definition reset to version ${data.quiz.version}.`);
    } catch (err) {
      setError(err.message || 'Failed to reset quiz definition');
    } finally {
      setQuizEditorSaving(false);
    }
  };

  const loadTaxonomy = async () => {
    try {
      const data = await apiGet('/library-taxonomy');
      if (data.ok && data.taxonomy) {
        setTaxonomy(data.taxonomy);
        setTaxonomyCategoriesText((data.taxonomy.categories || []).join(', '));
        setTaxonomyDomainsText((data.taxonomy.domains || []).join(', '));
        setTaxonomyRolesText((data.taxonomy.roles || []).join(', '));
        setTaxonomyDomainRolesText(JSON.stringify(data.taxonomy.domainRoles || {}, null, 2));
      }
    } catch (err) {
      logger.warn('Taxonomy unavailable', err);
    }
  };

  const taxonomyInsights = useMemo(() => {
    const categories = parseCsvList(taxonomyCategoriesText);
    const domains = parseCsvList(taxonomyDomainsText);
    const roles = parseCsvList(taxonomyRolesText);

    const duplicates = Array.from(
      new Set([...categories.duplicates, ...domains.duplicates, ...roles.duplicates]),
    );

    const domainRoles = {};
    let domainRolesError = '';
    let unknownDomainMappings = [];
    try {
      const parsed = JSON.parse(taxonomyDomainRolesText || '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        domainRolesError = 'Domain role map must be a JSON object';
      } else {
        const domainSet = new Set(domains.unique);
        const roleSet = new Set(roles.unique);
        unknownDomainMappings = Object.keys(parsed)
          .map((key) => String(key || '').trim().toLowerCase())
          .filter((key) => key && !domainSet.has(key));

        for (const domain of domains.unique) {
          const rawRoles = Array.isArray(parsed[domain]) ? parsed[domain] : [];
          const mapped = Array.from(
            new Set(
              rawRoles
                .map((value) => String(value || '').trim().toLowerCase())
                .filter((value) => roleSet.has(value)),
            ),
          );
          domainRoles[domain] = mapped.length
            ? mapped
            : roles.unique.slice(0, Math.max(1, Math.min(3, roles.unique.length)));
        }
      }
    } catch (_error) {
      domainRolesError = 'Domain role map JSON is invalid';
    }

    return {
      categories,
      domains,
      roles,
      domainRoles,
      domainRolesError,
      unknownDomainMappings,
      duplicates,
      isValid: categories.unique.length > 0 && domains.unique.length > 0 && roles.unique.length > 0,
    };
  }, [taxonomyCategoriesText, taxonomyDomainsText, taxonomyRolesText, taxonomyDomainRolesText]);

  const saveTaxonomy = async () => {
    setTaxonomySaving(true);
    setError('');
    setSuccess('');
    try {
      if (taxonomyInsights.duplicates.length) {
        throw new Error(`Remove duplicate values: ${taxonomyInsights.duplicates.join(', ')}`);
      }
      if (!taxonomyInsights.isValid) {
        throw new Error('Categories, domains, and roles each require at least one value');
      }
      if (taxonomyInsights.domainRolesError) {
        throw new Error(taxonomyInsights.domainRolesError);
      }
      if (taxonomyInsights.unknownDomainMappings.length) {
        throw new Error(`Unknown domain mappings: ${taxonomyInsights.unknownDomainMappings.join(', ')}`);
      }

      const payload = {
        categories: taxonomyInsights.categories.unique,
        domains: taxonomyInsights.domains.unique,
        roles: taxonomyInsights.roles.unique,
        domainRoles: taxonomyInsights.domainRoles,
      };
      const data = await apiPut('/library-taxonomy', payload);
      if (!data.ok || !data.taxonomy) {
        const details = data?.details;
        if (details?.unknownDomains?.length || details?.unknownRoles?.length) {
          const roleDetails = (details.unknownRoles || [])
            .map((entry) => `${entry.domain}: ${(entry.roles || []).join(', ')}`)
            .join(' | ');
          throw new Error(
            `Unknown mapping values. Domains: ${(details.unknownDomains || []).join(', ') || 'none'}. Roles: ${roleDetails || 'none'}`,
          );
        }
        throw new Error(data.error || 'Failed to update taxonomy');
      }
      setTaxonomy(data.taxonomy);
      setTaxonomyCategoriesText((data.taxonomy.categories || []).join(', '));
      setTaxonomyDomainsText((data.taxonomy.domains || []).join(', '));
      setTaxonomyRolesText((data.taxonomy.roles || []).join(', '));
      setTaxonomyDomainRolesText(JSON.stringify(data.taxonomy.domainRoles || {}, null, 2));
      setSuccess('Taxonomy updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update taxonomy');
    } finally {
      setTaxonomySaving(false);
    }
  };

  const resetTaxonomy = async () => {
    if (!window.confirm('Reset taxonomy to default civilization core sets?')) return;
    setTaxonomySaving(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiPost('/library-taxonomy/reset', {});
      if (!data.ok || !data.taxonomy) {
        throw new Error(data.error || 'Failed to reset taxonomy');
      }
      setTaxonomy(data.taxonomy);
      setTaxonomyCategoriesText((data.taxonomy.categories || []).join(', '));
      setTaxonomyDomainsText((data.taxonomy.domains || []).join(', '));
      setTaxonomyRolesText((data.taxonomy.roles || []).join(', '));
      setTaxonomyDomainRolesText(JSON.stringify(data.taxonomy.domainRoles || {}, null, 2));
      setSuccess('Taxonomy reset to defaults.');
    } catch (err) {
      setError(err.message || 'Failed to reset taxonomy');
    } finally {
      setTaxonomySaving(false);
    }
  };

  const categories = useMemo(() => {
    const unique = new Set(items.map((i) => i.category).filter(Boolean));
    return ['all', ...Array.from(unique).sort()];
  }, [items]);

  const previewQuestions = useMemo(() => {
    try {
      const parsed = JSON.parse(quizQuestionsText);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }, [quizQuestionsText]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const categoryOk = categoryFilter === 'all' || item.category === categoryFilter;
      if (!categoryOk) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      const haystack = [
        item.title,
        item.description,
        item.category,
        item.domain,
        ...(item.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, categoryFilter, query]);

  const handleInput = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedFile(null);
    const fileInput = document.getElementById('library-file-input');
    if (fileInput) fileInput.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Choose a file before uploading');
      return;
    }
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = new FormData();
      payload.append('file', selectedFile);
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));

      const data = await apiUpload('/api/admin/library', payload);
      if (!data.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setSuccess('Document uploaded successfully.');
      resetForm();
      await loadItems();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async (item) => {
    setError('');
    setSuccess('');
    try {
      const nextStatus = item.status === 'published' ? 'draft' : 'published';
      const data = await apiPut(`/admin/library/${item._id}`, { status: nextStatus });
      if (!data.ok) {
        throw new Error(data.error || 'Update failed');
      }
      setSuccess(`Document moved to ${nextStatus}.`);
      await loadItems();
    } catch (err) {
      setError(err.message || 'Unable to update document');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setError('');
    setSuccess('');
    try {
      const data = await apiDelete(`/admin/library/${item._id}`);
      if (!data.ok) {
        throw new Error(data.error || 'Delete failed');
      }
      setSuccess('Document deleted.');
      await loadItems();
    } catch (err) {
      setError(err.message || 'Unable to delete document');
    }
  };

  const openPublicDownload = (item) => {
    window.open(toApiUrl(`/api/admin/library/${item._id}/download`), '_blank', 'noopener,noreferrer');
  };

  const openFullExport = () => {
    window.open(toApiUrl('/api/library/export/full/snapshot.zip'), '_blank', 'noopener,noreferrer');
  };

  const openCategoryExport = () => {
    const category = categoryFilter === 'all' ? 'general' : categoryFilter;
    window.open(
      toApiUrl(`/api/library/export/category/${encodeURIComponent(category)}/archive.zip`),
      '_blank',
      'noopener,noreferrer',
    );
  };

  const appendQuestionTemplate = () => {
    const domainHint = taxonomy?.domains?.[0] || 'infrastructure-operations';
    const roleHint = taxonomy?.domainRoles?.[domainHint]?.[0] || taxonomy?.roles?.[0] || 'specialist';
    const templateQuestion = {
      id: `q${Date.now()}`,
      prompt: `In ${domainHint}, which path feels closer to your natural role?`,
      axis: 'JP',
      options: [
        { key: 'A', text: `I prefer repeatable standards as a ${roleHint}`, pole: 'J' },
        { key: 'B', text: `I prefer adapting fluidly as a ${roleHint}`, pole: 'P' },
      ],
    };

    try {
      const current = JSON.parse(quizQuestionsText);
      const next = Array.isArray(current) ? [...current, templateQuestion] : [templateQuestion];
      setQuizQuestionsText(JSON.stringify(next, null, 2));
      setSuccess('Question template appended. Review and edit before saving.');
      setError('');
    } catch (_error) {
      setError('Questions JSON is invalid. Fix JSON before appending a template.');
    }
  };

  const previewQuizDefinition = async () => {
    setQuizPreviewLoading(true);
    setError('');
    setSuccess('');
    try {
      let parsedQuestions;
      try {
        parsedQuestions = JSON.parse(quizQuestionsText);
      } catch (_error) {
        throw new Error('Questions JSON is invalid');
      }

      const customAnswers = previewQuestions
        .map((question) => ({
          questionId: question.id,
          optionKey: quizPreviewCustomAnswers[question.id],
        }))
        .filter((entry) => entry.questionId && entry.optionKey);

      const data = await apiPost('/career-quiz/admin/preview', {
        questions: parsedQuestions,
        strategy: quizPreviewStrategy,
        answers: quizPreviewStrategy === 'custom' ? customAnswers : [],
      });
      if (!data.ok || !data.preview) {
        throw new Error(data.error || 'Unable to preview quiz definition');
      }
      setQuizPreview(data.preview);
      setSuccess('Preview generated for current draft questions.');
    } catch (err) {
      setQuizPreview(null);
      setError(err.message || 'Unable to preview quiz definition');
    } finally {
      setQuizPreviewLoading(false);
    }
  };

  const handleCustomPreviewAnswer = (questionId, optionKey) => {
    setQuizPreviewCustomAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  const exportLibrarySnapshot = async () => {
    setSnapshotLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiGet('/admin/library-intelligence/snapshot');
      if (!response.ok || !response.snapshot) {
        throw new Error(response.error || 'Failed to export server snapshot');
      }
      const snapshot = response.snapshot;

      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `pva-library-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setSuccess('Snapshot exported successfully.');
    } catch (err) {
      setError(err.message || 'Failed to export snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const handleSnapshotFile = async (event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    if (!file) return;

    setSnapshotLoading(true);
    setError('');
    setSuccess('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Snapshot file must contain a JSON object');
      }
      if (!parsed.quiz || !parsed.taxonomy) {
        throw new Error('Snapshot must include quiz and taxonomy keys');
      }

      setSnapshotDraft(parsed);
      setSnapshotDiff(null);
      setSuccess('Snapshot loaded. Review and apply when ready.');
    } catch (err) {
      setSnapshotDraft(null);
      setError(err.message || 'Failed to parse snapshot file');
    } finally {
      setSnapshotLoading(false);
      event.target.value = '';
    }
  };

  const applySnapshotDraft = () => {
    if (!snapshotDraft) {
      setError('Load a snapshot before applying.');
      return;
    }

    try {
      const quiz = snapshotDraft.quiz || {};
      const taxonomySnapshot = snapshotDraft.taxonomy || {};

      setQuizTitle(String(quiz.title || ''));
      setQuizIntro(String(quiz.intro || ''));
      setQuizQuestionsText(JSON.stringify(Array.isArray(quiz.questions) ? quiz.questions : [], null, 2));

      setTaxonomyCategoriesText((taxonomySnapshot.categories || []).join(', '));
      setTaxonomyDomainsText((taxonomySnapshot.domains || []).join(', '));
      setTaxonomyRolesText((taxonomySnapshot.roles || []).join(', '));
      setTaxonomyDomainRolesText(JSON.stringify(taxonomySnapshot.domainRoles || {}, null, 2));

      setSuccess('Snapshot staged into editors. Save Quiz Definition and Save Taxonomy to persist.');
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to apply snapshot draft');
    }
  };

  const compareSnapshotAgainstServer = async () => {
    if (!snapshotDraft) {
      setError('Load a snapshot before comparing.');
      return;
    }

    setSnapshotLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiGet('/admin/library-intelligence/snapshot');
      if (!response.ok || !response.snapshot) {
        throw new Error(response.error || 'Failed to load server snapshot for comparison');
      }

      const computedDiff = buildSnapshotDiff(snapshotDraft, response.snapshot);
      setSnapshotDiff(computedDiff);
      if (computedDiff.changesCount === 0) {
        setSuccess('No snapshot differences detected against current server state.');
      } else {
        setSuccess(`Snapshot diff ready (${computedDiff.changesCount} change points detected).`);
      }
    } catch (err) {
      setSnapshotDiff(null);
      setError(err.message || 'Failed to compare snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const applySnapshotToServer = async () => {
    if (!snapshotDraft) {
      setError('Load a snapshot before applying to server.');
      return;
    }
    if (!snapshotDiff) {
      setError('Compare snapshot vs server before applying to server.');
      return;
    }

    setSnapshotLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiPost('/admin/library-intelligence/snapshot/import', {
        snapshot: snapshotDraft,
      });
      if (!response.ok) {
        const details = response?.details;
        if (details?.unknownDomains?.length || details?.unknownRoles?.length) {
          const roleDetails = (details.unknownRoles || [])
            .map((entry) => `${entry.domain}: ${(entry.roles || []).join(', ')}`)
            .join(' | ');
          throw new Error(
            `Unknown mapping values. Domains: ${(details.unknownDomains || []).join(', ') || 'none'}. Roles: ${roleDetails || 'none'}`,
          );
        }
        throw new Error(response.error || 'Server snapshot import failed');
      }

      await Promise.all([loadQuizDefinition(), loadTaxonomy()]);
      setSnapshotDiff(null);
      setSuccess('Snapshot applied on server and editors refreshed from active config.');
    } catch (err) {
      setError(err.message || 'Failed to apply snapshot to server');
    } finally {
      setSnapshotLoading(false);
    }
  };

  const generateDomainRoleDefaults = () => {
    if (!taxonomyInsights.roles.unique.length || !taxonomyInsights.domains.unique.length) {
      setError('Add at least one domain and role before generating defaults.');
      return;
    }

    const fallbackRoles = taxonomyInsights.roles.unique.slice(
      0,
      Math.max(1, Math.min(3, taxonomyInsights.roles.unique.length)),
    );
    const generated = taxonomyInsights.domains.unique.reduce((acc, domain) => {
      acc[domain] = fallbackRoles;
      return acc;
    }, {});

    setTaxonomyDomainRolesText(JSON.stringify(generated, null, 2));
    setSuccess('Generated default domain-role map from current domains and roles.');
    setError('');
  };

  if (loading) {
    return (
      <div className="library-tab">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="library-tab" role="tabpanel" id="library-panel">
      <div className="tab-header">
        <h2>🧠 Civilizational Knowledge Library</h2>
        <p>
          Upload manuals, handbooks, and training guides to build a durable archive that can be accessed
          globally and exported as offline ZIP snapshots.
        </p>
      </div>

      {error ? (
        <div className="alert alert-error">
          <span>❌ {error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      ) : null}
      {success ? (
        <div className="alert alert-success">
          <span>✅ {success}</span>
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      ) : null}

      <section className="library-upload-panel">
        <h3>Upload New Manual</h3>
        <div className="library-upload-grid">
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => handleInput('title', e.target.value)}
              placeholder="Field Surgery Basics, Plumbing Repair Manual..."
            />
          </label>
          <label>
            Category
            <input
              list="library-category-suggestions"
              value={form.category}
              onChange={(e) => handleInput('category', e.target.value.toLowerCase())}
              placeholder="healthcare, farming, electrical"
            />
          </label>
          <label>
            Domain
            <input
              list="library-domain-suggestions"
              value={form.domain}
              onChange={(e) => handleInput('domain', e.target.value.toLowerCase())}
              placeholder="civil-defense, medicine, agriculture"
            />
          </label>
          <label>
            Tags (comma-separated)
            <input
              value={form.tags}
              onChange={(e) => handleInput('tags', e.target.value)}
              placeholder="beginner, offline, emergency"
            />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(e) => handleInput('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <label>
            Visibility
            <select value={form.visibility} onChange={(e) => handleInput('visibility', e.target.value)}>
              <option value="public">Public</option>
              <option value="admin-only">Admin Only</option>
            </select>
          </label>
          <label>
            Skill level
            <select value={form.skillLevel} onChange={(e) => handleInput('skillLevel', e.target.value)}>
              <option value="intro">Intro</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label>
            Language
            <input value={form.language} onChange={(e) => handleInput('language', e.target.value)} />
          </label>
        </div>
        <label className="library-description-field">
          Description
          <textarea
            value={form.description}
            onChange={(e) => handleInput('description', e.target.value)}
            rows={3}
            placeholder="What this manual teaches and who should use it."
          />
        </label>
        <div className="library-upload-actions">
          <input
            id="library-file-input"
            type="file"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
              setSelectedFile(file);
              if (!form.title && file) handleInput('title', file.name);
            }}
          />
          <button onClick={handleUpload} disabled={saving} className="btn-primary">
            {saving ? <LoadingDots /> : 'Upload Document'}
          </button>
          <button onClick={openCategoryExport} className="btn-secondary">
            Export Category ZIP
          </button>
          <button onClick={openFullExport} className="btn-secondary">
            Export Full Snapshot ZIP
          </button>
        </div>
        {selectedFile ? <p className="file-selected">Selected: {selectedFile.name}</p> : null}
        <datalist id="library-category-suggestions">
          {(taxonomy?.categories || []).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="library-domain-suggestions">
          {(taxonomy?.domains || []).map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </section>

      <section className="library-list-panel">
        <div className="library-list-toolbar">
          <h3>Stored Documents ({visibleItems.length})</h3>
          <div className="library-filters">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, domain, tags..."
            />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <div className="library-empty">No documents found for this filter.</div>
        ) : (
          <div className="library-grid">
            {visibleItems.map((item) => (
              <article key={item._id} className="library-card">
                <div className="library-card-top">
                  <h4>{item.title}</h4>
                  <span className={`status-pill ${item.status}`}>{item.status}</span>
                </div>
                <p>{item.description || 'No description yet.'}</p>
                <div className="library-meta">
                  <span>{item.category}</span>
                  <span>{item.domain}</span>
                  <span>{formatBytes(item?.file?.size || 0)}</span>
                  <span>{item.visibility}</span>
                </div>
                <div className="library-card-actions">
                  <button onClick={() => handlePublishToggle(item)} className="btn-secondary">
                    {item.status === 'published' ? 'Set Draft' : 'Publish'}
                  </button>
                  <button
                    onClick={() => openPublicDownload(item)}
                    className="btn-secondary"
                    title="Download file copy"
                  >
                    Download
                  </button>
                  <button onClick={() => handleDelete(item)} className="btn-danger">
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="library-list-panel">
        <div className="library-list-toolbar">
          <h3>Career Quiz Intelligence</h3>
          <div className="library-filters">
            <a className="btn-secondary" href="#/career-quiz">Open Public Quiz</a>
            <button className="btn-secondary" onClick={loadQuizStats}>Refresh Stats</button>
          </div>
        </div>
        {!quizStats ? (
          <div className="library-empty">No quiz analytics loaded yet.</div>
        ) : (
          <div className="library-grid">
            <article className="library-card">
              <div className="library-card-top">
                <h4>Total submissions</h4>
              </div>
              <p>{quizStats.totalSubmissions || 0}</p>
            </article>
            <article className="library-card">
              <div className="library-card-top">
                <h4>Top personality types</h4>
              </div>
              <div className="library-meta">
                {(quizStats.topPersonalityTypes || []).map((item) => (
                  <span key={item._id}>{item._id}: {item.count}</span>
                ))}
              </div>
            </article>
          </div>
        )}
      </section>

      <section className="library-list-panel">
        <div className="library-list-toolbar">
          <h3>Career Quiz Definition Editor</h3>
          <div className="library-filters">
            {quizDefinition?.version ? <span className="status-pill published">v{quizDefinition.version}</span> : null}
            <button className="btn-secondary" onClick={loadQuizDefinition} disabled={quizEditorSaving}>
              Reload
            </button>
          </div>
        </div>

        <div className="library-upload-grid">
          <label>
            Quiz Title
            <input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
          </label>
          <label>
            Quiz Intro
            <input value={quizIntro} onChange={(e) => setQuizIntro(e.target.value)} />
          </label>
        </div>

        <label className="library-description-field">
          Questions JSON
          <textarea
            className="quiz-json-editor"
            value={quizQuestionsText}
            onChange={(e) => setQuizQuestionsText(e.target.value)}
            rows={14}
            spellCheck={false}
          />
        </label>

        <div className="library-taxonomy-hints">
          <p>
            Axes: <strong>EI</strong> (energy), <strong>SN</strong> (learning), <strong>TF</strong> (decision),{' '}
            <strong>JP</strong> (execution).
          </p>
          <div className="library-meta">
            {(taxonomy?.domains || []).map((domain) => (
              <span key={`quiz-domain-${domain}`}>domain: {domain}</span>
            ))}
            {(taxonomy?.roles || []).map((role) => (
              <span key={`quiz-role-${role}`}>role: {role}</span>
            ))}
          </div>
        </div>

        <div className="library-upload-actions">
          <label>
            Preview Strategy
            <select
              value={quizPreviewStrategy}
              onChange={(e) => setQuizPreviewStrategy(e.target.value)}
              disabled={quizEditorSaving || quizPreviewLoading}
            >
              <option value="first-option">First Option</option>
              <option value="alternating">Alternating</option>
              <option value="reverse">Reverse Option</option>
              <option value="custom">Custom Matrix</option>
            </select>
          </label>
          <button onClick={previewQuizDefinition} className="btn-secondary" disabled={quizEditorSaving || quizPreviewLoading}>
            {quizPreviewLoading ? <LoadingDots /> : 'Preview Quiz Scoring'}
          </button>
          <button onClick={appendQuestionTemplate} className="btn-secondary" disabled={quizEditorSaving}>
            Insert Question Template
          </button>
          <button onClick={saveQuizDefinition} className="btn-primary" disabled={quizEditorSaving}>
            {quizEditorSaving ? <LoadingDots /> : 'Save Quiz Definition'}
          </button>
          <button onClick={resetQuizDefinition} className="btn-danger" disabled={quizEditorSaving}>
            Reset To Default
          </button>
        </div>
        {quizPreviewStrategy === 'custom' ? (
          <div className="library-preview-matrix">
            {previewQuestions.length === 0 ? (
              <p className="library-helper-error">Questions JSON must be valid to configure custom answers.</p>
            ) : (
              previewQuestions.map((question) => (
                <label key={`preview-answer-${question.id}`}>
                  {question.prompt || question.id}
                  <select
                    value={quizPreviewCustomAnswers[question.id] || ''}
                    onChange={(e) => handleCustomPreviewAnswer(question.id, e.target.value)}
                  >
                    <option value="">Auto-select default</option>
                    {(Array.isArray(question.options) ? question.options : []).map((option) => (
                      <option key={`${question.id}-${option.key}`} value={option.key}>
                        {option.key}: {option.text}
                      </option>
                    ))}
                  </select>
                </label>
              ))
            )}
          </div>
        ) : null}
        {quizPreview ? (
          <div className="library-preview-card">
            <h4>Draft Preview Outcome</h4>
            <div className="library-meta">
              <span>type: {quizPreview.personalityType}</span>
              <span>answers: {quizPreview.answerCount}</span>
              <span>strategy: {quizPreview.strategy}</span>
            </div>
            <p>
              Domains: {(quizPreview.topDomains || []).join(', ') || 'n/a'}
            </p>
            <p>
              Careers: {(quizPreview.topCareers || []).join(', ') || 'n/a'}
            </p>
            <p>
              Axis: {Object.entries(quizPreview.axisScores || {})
                .map(([k, v]) => `${k}:${v}`)
                .join(' ')}
            </p>
          </div>
        ) : null}
      </section>

      <section className="library-list-panel">
        <div className="library-list-toolbar">
          <h3>Snapshot Import / Export</h3>
        </div>
        <p className="library-snapshot-note">
          Move quiz definition + taxonomy between environments with a single JSON snapshot.
        </p>
        <div className="library-upload-actions">
          <button onClick={exportLibrarySnapshot} className="btn-secondary" disabled={snapshotLoading}>
            {snapshotLoading ? <LoadingDots /> : 'Export Snapshot JSON'}
          </button>
          <label>
            Import Snapshot
            <input type="file" accept="application/json" onChange={handleSnapshotFile} />
          </label>
          <button
            onClick={compareSnapshotAgainstServer}
            className="btn-secondary"
            disabled={!snapshotDraft || snapshotLoading}
          >
            {snapshotLoading ? <LoadingDots /> : 'Compare Snapshot vs Server'}
          </button>
          <button onClick={applySnapshotDraft} className="btn-primary" disabled={!snapshotDraft || snapshotLoading}>
            Stage Snapshot In Editors
          </button>
          <button
            onClick={applySnapshotToServer}
            className="btn-danger"
            disabled={!snapshotDraft || snapshotLoading || !snapshotDiff}
          >
            Apply Snapshot To Server
          </button>
        </div>
        {snapshotDraft ? (
          <div className="library-preview-card">
            <h4>Loaded Snapshot</h4>
            <div className="library-meta">
              <span>version: {snapshotDraft.version || 'n/a'}</span>
              <span>exported: {snapshotDraft.exportedAt || 'unknown'}</span>
              <span>questions: {Array.isArray(snapshotDraft.quiz?.questions) ? snapshotDraft.quiz.questions.length : 0}</span>
              <span>domains: {Array.isArray(snapshotDraft.taxonomy?.domains) ? snapshotDraft.taxonomy.domains.length : 0}</span>
            </div>
            {snapshotDiff ? (
              <div className="library-snapshot-diff">
                <h5>Diff vs Current Server</h5>
                <div className="library-meta">
                  <span>change points: {snapshotDiff.changesCount}</span>
                  <span>questions live: {snapshotDiff.quiz.questionCountLive}</span>
                  <span>questions draft: {snapshotDiff.quiz.questionCountDraft}</span>
                  <span>
                    question delta:{' '}
                    {snapshotDiff.quiz.questionDelta >= 0
                      ? `+${snapshotDiff.quiz.questionDelta}`
                      : snapshotDiff.quiz.questionDelta}
                  </span>
                </div>
                <div className="library-snapshot-diff-grid">
                  <p>quiz title: {snapshotDiff.quiz.titleChanged ? 'changed' : 'unchanged'}</p>
                  <p>quiz intro: {snapshotDiff.quiz.introChanged ? 'changed' : 'unchanged'}</p>
                  <p>
                    category add/remove: +{snapshotDiff.taxonomy.categories.added.length} / -
                    {snapshotDiff.taxonomy.categories.removed.length}
                  </p>
                  <p>
                    domain add/remove: +{snapshotDiff.taxonomy.domains.added.length} / -
                    {snapshotDiff.taxonomy.domains.removed.length}
                  </p>
                  <p>
                    role add/remove: +{snapshotDiff.taxonomy.roles.added.length} / -
                    {snapshotDiff.taxonomy.roles.removed.length}
                  </p>
                  <p>domain role map updates: {snapshotDiff.domainRoleDiff.length}</p>
                </div>

                {(snapshotDiff.taxonomy.categories.added.length ||
                  snapshotDiff.taxonomy.categories.removed.length ||
                  snapshotDiff.taxonomy.domains.added.length ||
                  snapshotDiff.taxonomy.domains.removed.length ||
                  snapshotDiff.taxonomy.roles.added.length ||
                  snapshotDiff.taxonomy.roles.removed.length) ? (
                  <div className="library-snapshot-diff-details">
                    {snapshotDiff.taxonomy.categories.added.length ? (
                      <p>categories added: {snapshotDiff.taxonomy.categories.added.join(', ')}</p>
                    ) : null}
                    {snapshotDiff.taxonomy.categories.removed.length ? (
                      <p>categories removed: {snapshotDiff.taxonomy.categories.removed.join(', ')}</p>
                    ) : null}
                    {snapshotDiff.taxonomy.domains.added.length ? (
                      <p>domains added: {snapshotDiff.taxonomy.domains.added.join(', ')}</p>
                    ) : null}
                    {snapshotDiff.taxonomy.domains.removed.length ? (
                      <p>domains removed: {snapshotDiff.taxonomy.domains.removed.join(', ')}</p>
                    ) : null}
                    {snapshotDiff.taxonomy.roles.added.length ? (
                      <p>roles added: {snapshotDiff.taxonomy.roles.added.join(', ')}</p>
                    ) : null}
                    {snapshotDiff.taxonomy.roles.removed.length ? (
                      <p>roles removed: {snapshotDiff.taxonomy.roles.removed.join(', ')}</p>
                    ) : null}
                  </div>
                ) : null}

                {snapshotDiff.domainRoleDiff.length > 0 ? (
                  <div className="library-snapshot-diff-details">
                    {snapshotDiff.domainRoleDiff.map((entry) => (
                      <p key={`domain-role-diff-${entry.domain}`} className="library-snapshot-diff-note">
                        {entry.domain}: +
                        {entry.added.length ? entry.added.join(', ') : 'none'} / -
                        {entry.removed.length ? entry.removed.join(', ') : 'none'}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="library-list-panel">
        <div className="library-list-toolbar">
          <h3>Taxonomy Manager</h3>
          <div className="library-filters">
            <button className="btn-secondary" onClick={loadTaxonomy} disabled={taxonomySaving}>
              Reload
            </button>
          </div>
        </div>

        <label className="library-description-field">
          Categories (comma-separated)
          <textarea
            className="quiz-json-editor"
            rows={4}
            value={taxonomyCategoriesText}
            onChange={(e) => setTaxonomyCategoriesText(e.target.value)}
          />
        </label>
        <label className="library-description-field">
          Domains (comma-separated)
          <textarea
            className="quiz-json-editor"
            rows={4}
            value={taxonomyDomainsText}
            onChange={(e) => setTaxonomyDomainsText(e.target.value)}
          />
        </label>
        <label className="library-description-field">
          Roles (comma-separated)
          <textarea
            className="quiz-json-editor"
            rows={4}
            value={taxonomyRolesText}
            onChange={(e) => setTaxonomyRolesText(e.target.value)}
          />
        </label>
        <label className="library-description-field">
          Domain Role Map JSON
          <textarea
            className="quiz-json-editor"
            rows={8}
            value={taxonomyDomainRolesText}
            onChange={(e) => setTaxonomyDomainRolesText(e.target.value)}
            spellCheck={false}
          />
        </label>

        <div className="library-upload-actions">
          <button onClick={generateDomainRoleDefaults} className="btn-secondary" disabled={taxonomySaving}>
            Generate Domain Role Defaults
          </button>
          <button
            onClick={saveTaxonomy}
            className="btn-primary"
            disabled={
              taxonomySaving ||
              !taxonomyInsights.isValid ||
              taxonomyInsights.duplicates.length > 0 ||
              Boolean(taxonomyInsights.domainRolesError) ||
              taxonomyInsights.unknownDomainMappings.length > 0
            }
          >
            {taxonomySaving ? <LoadingDots /> : 'Save Taxonomy'}
          </button>
          <button onClick={resetTaxonomy} className="btn-danger" disabled={taxonomySaving}>
            Reset Taxonomy
          </button>
        </div>
        {taxonomyInsights.duplicates.length > 0 ? (
          <p className="library-helper-error">
            Duplicate values found: {taxonomyInsights.duplicates.join(', ')}
          </p>
        ) : null}
        {!taxonomyInsights.isValid ? (
          <p className="library-helper-error">
            Each taxonomy section must contain at least one comma-separated value.
          </p>
        ) : null}
        {taxonomyInsights.domainRolesError ? (
          <p className="library-helper-error">{taxonomyInsights.domainRolesError}</p>
        ) : null}
        {taxonomyInsights.unknownDomainMappings.length > 0 ? (
          <p className="library-helper-error">
            Unknown domain mapping keys: {taxonomyInsights.unknownDomainMappings.join(', ')}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function normalizeList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean),
    ),
  ).sort();
}

function normalizeDomainRoles(rawDomainRoles) {
  const source = rawDomainRoles && typeof rawDomainRoles === 'object' ? rawDomainRoles : {};
  const normalized = {};
  for (const [domain, roles] of Object.entries(source)) {
    const key = String(domain || '').trim().toLowerCase();
    if (!key) continue;
    normalized[key] = normalizeList(roles);
  }
  return normalized;
}

function diffListSet(draftValues, liveValues) {
  const draftSet = new Set(normalizeList(draftValues));
  const liveSet = new Set(normalizeList(liveValues));
  const added = Array.from(draftSet).filter((value) => !liveSet.has(value));
  const removed = Array.from(liveSet).filter((value) => !draftSet.has(value));
  return { added, removed };
}

function buildSnapshotDiff(draftSnapshot, liveSnapshot) {
  const draftQuiz = draftSnapshot?.quiz || {};
  const liveQuiz = liveSnapshot?.quiz || {};
  const draftTaxonomy = draftSnapshot?.taxonomy || {};
  const liveTaxonomy = liveSnapshot?.taxonomy || {};

  const questionCountDraft = Array.isArray(draftQuiz.questions) ? draftQuiz.questions.length : 0;
  const questionCountLive = Array.isArray(liveQuiz.questions) ? liveQuiz.questions.length : 0;
  const taxonomyDiff = {
    categories: diffListSet(draftTaxonomy.categories, liveTaxonomy.categories),
    domains: diffListSet(draftTaxonomy.domains, liveTaxonomy.domains),
    roles: diffListSet(draftTaxonomy.roles, liveTaxonomy.roles),
  };

  const draftDomainRoles = normalizeDomainRoles(draftTaxonomy.domainRoles);
  const liveDomainRoles = normalizeDomainRoles(liveTaxonomy.domainRoles);
  const domainRoleDiff = [];
  const allDomains = Array.from(
    new Set([...Object.keys(draftDomainRoles), ...Object.keys(liveDomainRoles)]),
  ).sort();

  for (const domain of allDomains) {
    const rolesDiff = diffListSet(draftDomainRoles[domain], liveDomainRoles[domain]);
    if (rolesDiff.added.length || rolesDiff.removed.length) {
      domainRoleDiff.push({ domain, ...rolesDiff });
    }
  }

  const quizTitleChanged = String(draftQuiz.title || '').trim() !== String(liveQuiz.title || '').trim();
  const quizIntroChanged = String(draftQuiz.intro || '').trim() !== String(liveQuiz.intro || '').trim();
  const quizQuestionDelta = questionCountDraft - questionCountLive;

  const changesCount =
    (quizTitleChanged ? 1 : 0) +
    (quizIntroChanged ? 1 : 0) +
    (quizQuestionDelta !== 0 ? 1 : 0) +
    taxonomyDiff.categories.added.length +
    taxonomyDiff.categories.removed.length +
    taxonomyDiff.domains.added.length +
    taxonomyDiff.domains.removed.length +
    taxonomyDiff.roles.added.length +
    taxonomyDiff.roles.removed.length +
    domainRoleDiff.reduce((count, entry) => count + entry.added.length + entry.removed.length, 0);

  return {
    changesCount,
    quiz: {
      titleChanged: quizTitleChanged,
      introChanged: quizIntroChanged,
      questionCountDraft,
      questionCountLive,
      questionDelta: quizQuestionDelta,
    },
    taxonomy: taxonomyDiff,
    domainRoleDiff,
  };
}
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${Math.round((bytes / Math.pow(1024, index)) * 100) / 100} ${units[index]}`;
}