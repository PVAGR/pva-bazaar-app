import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import LibraryEditor from '../components/library/LibraryEditor';
import ModerationQueue from '../components/library/ModerationQueue';
import ArticleViewer from '../components/library/ArticleViewer';

export default function CollaborativeLibraryPage({ mode = 'editor' }) {
  const params = useParams();
  const articleId = useMemo(() => params?.id || '', [params]);

  if (mode === 'moderation') {
    return <ModerationQueue />;
  }

  if (mode === 'viewer') {
    return <ArticleViewer articleId={articleId} />;
  }

  return <LibraryEditor />;
}
