(async () => {
  const results = [];

  const postJson = async (url, payload, headers = {}) => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
      return { status: res.status, body: await res.text() };
    } catch (err) {
      return { status: -1, body: String(err) };
    }
  };

  const putJson = async (url, payload, headers = {}) => {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
      return { status: res.status, body: await res.text() };
    } catch (err) {
      return { status: -1, body: String(err) };
    }
  };

  const getJson = async (url, headers = {}) => {
    try {
      const res = await fetch(url, { method: 'GET', headers });
      return { status: res.status, body: await res.text() };
    } catch (err) {
      return { status: -1, body: String(err) };
    }
  };

  const login = await postJson('https://api.pvabazaar.org/api/admin/login', {
    username: 'richyrichaii',
    password: 'pva123zxc!',
  });
  results.push({ check: 'POST /api/admin/login', ...login });

  const stamp = Date.now();
  const signup = await postJson('https://api.pvabazaar.org/api/admin/signup', {
    name: 'Read Only Probe',
    username: `readonly${stamp}`,
    email: `readonly${stamp}@pvabazaar.org`,
    password: 'ReadOnly123!',
  });
  results.push({ check: 'POST /api/admin/signup', ...signup });

  let token = '';
  try {
    token = JSON.parse(login.body || '{}').token || '';
  } catch {}
  const authHeaders = token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {};

  const read = await getJson('https://api.pvabazaar.org/api/governance/admin-responses', authHeaders);
  results.push({ check: 'GET /api/governance/admin-responses', ...read });

  const write = await putJson(
    'https://api.pvabazaar.org/api/governance/admin-responses/PROP-101',
    {
      decision: 'accepted',
      reason: `read-only verify ${Date.now()}`,
      nextStep: 'n/a',
      targetTimeline: 'n/a',
    },
    authHeaders
  );
  results.push({ check: 'PUT /api/governance/admin-responses/PROP-101', ...write });

  console.log(JSON.stringify({ tokenIssued: Boolean(token), results }, null, 2));
})();
