import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { isLocalToken } from '../lib/auth';
import { getToken } from '../lib/auth';

const DEFAULT_STATE = {
  status: 'checking',
  label: 'Checking connection…',
  detail: '',
  checkedAt: null,
};

export default function useConnectionMode() {
  const [state, setState] = useState(DEFAULT_STATE);

  useEffect(() => {
    let active = true;

    const evaluate = async () => {
      const token = getToken();
      if (isLocalToken(token)) {
        if (!active) return;
        setState({
          status: 'local',
          label: 'Free local mode active',
          detail: 'Your sign-in state is being handled in the browser on this device.',
          checkedAt: new Date().toISOString(),
        });
        return;
      }

      try {
        const health = await apiGet('/health');
        if (!active) return;
        const mode = String(health?.database?.mode || '').toLowerCase();
        const connected = health?.ok !== false && mode !== 'mock' && mode !== 'fallback';
        const isFileStore = mode === 'file';
        setState({
          status: connected ? 'live' : 'fallback',
          label: isFileStore
            ? 'Shared account database connected'
            : connected
              ? 'Live backend connected'
              : 'Fallback mode active',
          detail: connected
            ? isFileStore
              ? 'The shared free account store is responding normally.'
              : 'The shared backend is responding normally.'
            : 'The hosted backend is responding through the free fallback path.',
          checkedAt: new Date().toISOString(),
        });
      } catch (_err) {
        if (!active) return;
        setState({
          status: 'fallback',
          label: 'Free local fallback active',
          detail: 'The hosted backend is unavailable, so browser-side sign-in is handling access.',
          checkedAt: new Date().toISOString(),
        });
      }
    };

    evaluate();
    const interval = window.setInterval(evaluate, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return state;
}
