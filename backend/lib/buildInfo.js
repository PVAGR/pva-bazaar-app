const backendPackage = require('../package.json');

function getRawSha() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.SOURCE_VERSION ||
    process.env.RENDER_GIT_COMMIT ||
    process.env.COMMIT_SHA ||
    'local'
  );
}

function getBuildInfo() {
  const sha = String(getRawSha()).trim() || 'local';
  const shortSha = sha === 'local' ? 'local' : sha.slice(0, 7);

  return {
    version: backendPackage.version || '1.0.0',
    sha,
    shortSha,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || process.env.GIT_BRANCH || null,
  };
}

module.exports = {
  getBuildInfo,
};