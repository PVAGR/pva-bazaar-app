let backendVersion = '1.0.0';

try {
  backendVersion = require('../package.json')?.version || backendVersion;
} catch (_err) {
  // In serverless bundles the backend package metadata may not be included.
}

function getRawSha() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.SOURCE_VERSION ||
    process.env.RENDER_GIT_COMMIT ||
    process.env.COMMIT_SHA ||
    (process.env.VERCEL === '1' && process.env.VERCEL_DEPLOYMENT_ID
      ? `dpl:${process.env.VERCEL_DEPLOYMENT_ID.slice(0, 12)}`
      : null) ||
    'local'
  );
}

function getBuildInfo() {
  const sha = String(getRawSha()).trim() || 'local';
  const shortSha = sha === 'local' ? 'local' : sha.slice(0, 7);

  return {
    version: backendVersion,
    sha,
    shortSha,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || process.env.GIT_BRANCH || null,
  };
}

module.exports = {
  getBuildInfo,
};
