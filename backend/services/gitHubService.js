/**
 * GitHub Integration Service
 * Enables code reading, writing, and PR creation
 */

const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'PVAGR';
const GITHUB_REPO = process.env.GITHUB_REPO || 'pva-bazaar-app';

const github = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
});

console.log(
  `🔗 GitHub Integration: ${GITHUB_TOKEN ? '✅' : '🔴'} (${GITHUB_OWNER}/${GITHUB_REPO})`,
);

/**
 * Get file content from GitHub
 */
async function getFileContent(filePath, branch = 'main') {
  try {
    const response = await github.get(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
      {
        params: { ref: branch },
      },
    );

    if (response.data.type === 'file') {
      return {
        success: true,
        content: Buffer.from(response.data.content, 'base64').toString('utf-8'),
        sha: response.data.sha,
        path: response.data.path,
      };
    }

    return {
      success: false,
      error: 'Not a file',
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}

/**
 * Write/update file on GitHub
 */
async function updateFileContent(filePath, newContent, commitMessage, branch = 'main') {
  try {
    // First, get current file to get SHA
    const current = await getFileContent(filePath, branch);

    if (!current.success) {
      // File doesn't exist, create new
      const response = await github.put(
        `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
        {
          message: commitMessage,
          content: Buffer.from(newContent).toString('base64'),
          branch,
        },
      );

      return {
        success: true,
        message: 'File created',
        commit: response.data.commit.sha,
        htmlUrl: response.data.content.html_url,
      };
    }

    // Update existing file
    const response = await github.put(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
      {
        message: commitMessage,
        content: Buffer.from(newContent).toString('base64'),
        sha: current.sha,
        branch,
      },
    );

    return {
      success: true,
      message: 'File updated',
      commit: response.data.commit.sha,
      htmlUrl: response.data.content.html_url,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}

/**
 * Create a new branch
 */
async function createBranch(branchName, baseBranch = 'main') {
  try {
    // Get the latest commit SHA from base branch
    const refResponse = await github.get(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${baseBranch}`,
    );

    const baseSha = refResponse.data.object.sha;

    // Create new branch
    const response = await github.post(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`, {
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });

    return {
      success: true,
      branch: branchName,
      sha: baseSha,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}

/**
 * Create a Pull Request
 */
async function createPullRequest(title, description, head, base = 'main') {
  try {
    const response = await github.post(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`, {
      title,
      body: description,
      head,
      base,
    });

    return {
      success: true,
      pr: response.data.number,
      url: response.data.html_url,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}

/**
 * List files in directory
 */
async function listFiles(dirPath = '', branch = 'main') {
  try {
    const response = await github.get(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${dirPath}`, {
      params: { ref: branch },
    });

    const files = response.data
      .filter((item) => item.type === 'file')
      .map((item) => ({
        name: item.name,
        path: item.path,
        size: item.size,
        url: item.html_url,
      }));

    const dirs = response.data
      .filter((item) => item.type === 'dir')
      .map((item) => ({
        name: item.name,
        path: item.path,
      }));

    return {
      success: true,
      files,
      directories: dirs,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}

/**
 * Get repository status
 */
async function getRepoStatus() {
  try {
    const response = await github.get(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}`);

    return {
      success: true,
      repo: response.data.name,
      owner: response.data.owner.login,
      description: response.data.description,
      url: response.data.html_url,
      defaultBranch: response.data.default_branch,
      stars: response.data.stargazers_count,
      watchers: response.data.watchers_count,
      forks: response.data.forks_count,
      openIssues: response.data.open_issues_count,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}

/**
 * Merge pull request
 */
async function mergePullRequest(prNumber, commitTitle, commitMessage, mergeMethod = 'squash') {
  try {
    const response = await github.put(
      `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${prNumber}/merge`,
      {
        commit_title: commitTitle,
        commit_message: commitMessage,
        merge_method: mergeMethod,
      },
    );

    return {
      success: true,
      message: 'Pull request merged',
      sha: response.data.sha,
    };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}

module.exports = {
  getFileContent,
  updateFileContent,
  createBranch,
  createPullRequest,
  listFiles,
  getRepoStatus,
  mergePullRequest,
};
