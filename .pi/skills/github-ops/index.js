/**
 * GitHub Operations Skill
 * Provides helpers for interacting with GitHub REST API
 */

const GH_TOKEN = process.env.GH_TOKEN;
const BASE_URL = 'https://api.github.com';

/**
 * Make a request to the GitHub API
 * @param {string} endpoint - API endpoint (e.g., '/repos/owner/repo/issues')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Parsed JSON response
 */
async function githubApi(endpoint, options = {}) {
  if (!process.env.GH_TOKEN) {
    throw new Error('GH_TOKEN environment variable is not set');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${GH_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${error}`);
  }

  // GitHub returns 204 No Content for some successful operations
  if (res.status === 204) {
    return { success: true };
  }

  return res.json();
}

/**
 * Get authenticated user info
 * @returns {Promise<object>} User object
 */
async function getAuthenticatedUser() {
  return githubApi('/user');
}

/**
 * List authenticated user's repositories
 * @param {object} options - Pagination and filter options
 * @returns {Promise<object>} Repositories array
 */
async function listUserRepos({ type = 'owner', sort = 'updated', per_page = 100, page = 1 } = {}) {
  const params = new URLSearchParams({ type, sort, per_page: String(per_page), page: String(page) });
  return githubApi(`/user/repos?${params}`);
}

/**
 * Get a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<object>} Repository object
 */
async function getRepo(owner, repo) {
  return githubApi(`/repos/${owner}/${repo}`);
}

/**
 * List issues for a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {object} options - Filter options
 * @returns {Promise<object>} Issues array
 */
async function listIssues(owner, repo, { state = 'open', labels, sort = 'created', per_page = 30, page = 1 } = {}) {
  const params = new URLSearchParams({ state, sort, per_page: String(per_page), page: String(page) });
  if (labels) params.set('labels', labels);
  return githubApi(`/repos/${owner}/${repo}/issues?${params}`);
}

/**
 * Get a specific issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @returns {Promise<object>} Issue object
 */
async function getIssue(owner, repo, issueNumber) {
  return githubApi(`/repos/${owner}/${repo}/issues/${issueNumber}`);
}

/**
 * Create a new issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} title - Issue title
 * @param {object} options - Additional options
 * @returns {Promise<object>} Created issue object
 */
async function createIssue(owner, repo, title, { body, labels, assignees, milestone } = {}) {
  const data = { title };
  if (body) data.body = body;
  if (labels) data.labels = labels;
  if (assignees) data.assignees = assignees;
  if (milestone) data.milestone = milestone;
  
  return githubApi(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @param {object} options - Fields to update
 * @returns {Promise<object>} Updated issue object
 */
async function updateIssue(owner, repo, issueNumber, { title, body, state, labels, assignees, milestone } = {}) {
  const data = {};
  if (title !== undefined) data.title = title;
  if (body !== undefined) data.body = body;
  if (state !== undefined) data.state = state;
  if (labels !== undefined) data.labels = labels;
  if (assignees !== undefined) data.assignees = assignees;
  if (milestone !== undefined) data.milestone = milestone;
  
  return githubApi(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Close an issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @returns {Promise<object>} Updated issue object
 */
async function closeIssue(owner, repo, issueNumber) {
  return updateIssue(owner, repo, issueNumber, { state: 'closed' });
}

/**
 * Add a comment to an issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @param {string} body - Comment body
 * @returns {Promise<object>} Created comment object
 */
async function addComment(owner, repo, issueNumber, body) {
  return githubApi(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

/**
 * List comments on an issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @returns {Promise<object>} Comments array
 */
async function listComments(owner, repo, issueNumber) {
  return githubApi(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`);
}

/**
 * Add labels to an issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @param {array} labels - Array of label names
 * @returns {Promise<object>} Updated labels array
 */
async function addLabels(owner, repo, issueNumber, labels) {
  return githubApi(`/repos/${owner}/${repo}/issues/${issueNumber}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels }),
  });
}

/**
 * Remove a label from an issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @param {string} labelName - Label name to remove
 * @returns {Promise<object>} Updated labels array
 */
async function removeLabel(owner, repo, issueNumber, labelName) {
  return githubApi(`/repos/${owner}/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(labelName)}`, {
    method: 'DELETE',
  });
}

/**
 * List labels on an issue
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @returns {Promise<object>} Labels array
 */
async function listLabels(owner, repo, issueNumber) {
  return githubApi(`/repos/${owner}/${repo}/issues/${issueNumber}/labels`);
}

/**
 * List labels in a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<object>} Labels array
 */
async function listRepoLabels(owner, repo) {
  return githubApi(`/repos/${owner}/${repo}/labels`);
}

/**
 * Create a label in a repository
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} name - Label name
 * @param {string} color - Label color (hex without #)
 * @param {string} description - Optional label description
 * @returns {Promise<object>} Created label object
 */
async function createLabel(owner, repo, name, color, description = '') {
  const data = { name, color };
  if (description) data.description = description;
  
  return githubApi(`/repos/${owner}/${repo}/labels`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * List pull requests
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {object} options - Filter options
 * @returns {Promise<object>} PRs array
 */
async function listPullRequests(owner, repo, { state = 'open', head, base, sort = 'created', per_page = 30, page = 1 } = {}) {
  const params = new URLSearchParams({ state, sort, per_page: String(per_page), page: String(page) });
  if (head) params.set('head', head);
  if (base) params.set('base', base);
  return githubApi(`/repos/${owner}/${repo}/pulls?${params}`);
}

/**
 * Get a specific PR
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - PR number
 * @returns {Promise<object>} PR object
 */
async function getPullRequest(owner, repo, pullNumber) {
  return githubApi(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
}

/**
 * Create a pull request
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} title - PR title
 * @param {string} head - Head branch (e.g., 'feature-branch' or 'user:branch')
 * @param {string} base - Base branch (e.g., 'main')
 * @param {object} options - Additional options
 * @returns {Promise<object>} Created PR object
 */
async function createPullRequest(owner, repo, title, head, base, { body, draft = false, maintainer_can_modify = true } = {}) {
  const data = { title, head, base, draft };
  if (body) data.body = body;
  if (maintainer_can_modify) data.maintainer_can_modify = maintainer_can_modify;
  
  return githubApi(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a pull request
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - PR number
 * @param {object} options - Fields to update
 * @returns {Promise<object>} Updated PR object
 */
async function updatePullRequest(owner, repo, pullNumber, { title, body, state, base } = {}) {
  const data = {};
  if (title !== undefined) data.title = title;
  if (body !== undefined) data.body = body;
  if (state !== undefined) data.state = state;
  if (base !== undefined) data.base = base;
  
  return githubApi(`/repos/${owner}/${repo}/pulls/${pullNumber}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * List PR reviews
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - PR number
 * @returns {Promise<object>} Reviews array
 */
async function listReviews(owner, repo, pullNumber) {
  return githubApi(`/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`);
}

/**
 * Create a PR review
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - PR number
 * @param {string} body - Review body
 * @param {string} event - Review event (APPROVE, REQUEST_CHANGES, COMMENT, PENDING)
 * @param {array} comments - Optional array of inline comments
 * @returns {Promise<object>} Created review object
 */
async function createReview(owner, repo, pullNumber, body, event = 'COMMENT', comments = []) {
  const data = { body, event };
  if (comments.length > 0) data.comments = comments;
  
  return githubApi(`/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get PR review comments (inline comments)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - PR number
 * @returns {Promise<object>} Review comments array
 */
async function listReviewComments(owner, repo, pullNumber) {
  return githubApi(`/repos/${owner}/${repo}/pulls/${pullNumber}/comments`);
}

/**
 * Create PR review comment (inline)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} pullNumber - PR number
 * @param {string} body - Comment body
 * @param {string} path - File path
 * @param {number} commitId - Commit SHA to comment on
 * @param {number} line - Line number (for diff)
 * @returns {Promise<object>} Created comment object
 */
async function createReviewComment(owner, repo, pullNumber, body, path, commitId, line) {
  return githubApi(`/repos/${owner}/${repo}/pulls/${pullNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body, path, commit_id: commitId, line }),
  });
}

/**
 * List workflow runs
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {object} options - Filter options
 * @returns {Promise<object>} Workflow runs response
 */
async function listWorkflowRuns(owner, repo, { status, event, branch, per_page = 30, page = 1 } = {}) {
  const params = new URLSearchParams({ per_page: String(per_page), page: String(page) });
  if (status) params.set('status', status);
  if (event) params.set('event', event);
  if (branch) params.set('branch', branch);
  return githubApi(`/repos/${owner}/${repo}/actions/runs?${params}`);
}

/**
 * Get a specific workflow run
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} runId - Workflow run ID
 * @returns {Promise<object>} Workflow run object
 */
async function getWorkflowRun(owner, repo, runId) {
  return githubApi(`/repos/${owner}/${repo}/actions/runs/${runId}`);
}

/**
 * Re-run a workflow run
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} runId - Workflow run ID
 * @returns {Promise<object>} Success response
 */
async function rerunWorkflowRun(owner, repo, runId) {
  return githubApi(`/repos/${owner}/${repo}/actions/runs/${runId}/rerun`, {
    method: 'POST',
  });
}

/**
 * Cancel a workflow run
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} runId - Workflow run ID
 * @returns {Promise<object>} Success response
 */
async function cancelWorkflowRun(owner, repo, runId) {
  return githubApi(`/repos/${owner}/${repo}/actions/runs/${runId}/cancel`, {
    method: 'POST',
  });
}

/**
 * Trigger a workflow dispatch
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} workflowId - Workflow ID or filename
 * @param {string} ref - Git ref (branch/tag)
 * @param {object} inputs - Optional workflow inputs
 * @returns {Promise<object>} Success response
 */
async function triggerWorkflowDispatch(owner, repo, workflowId, ref, inputs = {}) {
  return githubApi(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref, inputs }),
  });
}

/**
 * Get workflow run jobs
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} runId - Workflow run ID
 * @returns {Promise<object>} Jobs response
 */
async function getWorkflowRunJobs(owner, repo, runId) {
  return githubApi(`/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
}

/**
 * List branches
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {object} options - Filter options
 * @returns {Promise<object>} Branches array
 */
async function listBranches(owner, repo, { protected = false, per_page = 100, page = 1 } = {}) {
  const params = new URLSearchParams({ per_page: String(per_page), page: String(page) });
  if (protected) params.set('protected', String(protected));
  return githubApi(`/repos/${owner}/${repo}/branches?${params}`);
}

/**
 * Get a specific branch
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} branch - Branch name
 * @returns {Promise<object>} Branch object
 */
async function getBranch(owner, repo, branch) {
  return githubApi(`/repos/${owner}/${repo}/branches/${branch}`);
}

/**
 * Get repository contents
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File/directory path
 * @param {string} ref - Git ref (optional)
 * @returns {Promise<object>} Contents object or array
 */
async function getRepoContents(owner, repo, path = '', ref = '') {
  const params = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  return githubApi(`/repos/${owner}/${repo}/contents/${path}${params}`);
}

/**
 * Get a file's content
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @param {string} ref - Git ref (optional)
 * @returns {Promise<string>} File content (decoded)
 */
async function getFileContent(owner, repo, path, ref = '') {
  const data = await getRepoContents(owner, repo, path, ref);
  if (!data.content) {
    throw new Error('No content found');
  }
  // GitHub returns base64 encoded content
  return Buffer.from(data.content, 'base64').toString('utf-8');
}

/**
 * Create or update a file
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @param {string} content - File content
 * @param {string} message - Commit message
 * @param {object} options - Additional options
 * @returns {Promise<object>} Commit response
 */
async function createOrUpdateFile(owner, repo, path, content, message, { branch = 'main', sha = '' } = {}) {
  const data = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  };
  if (sha) data.sha = sha;
  
  return githubApi(`/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a file
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} path - File path
 * @param {string} message - Commit message
 * @param {string} sha - File SHA (from getRepoContents)
 * @param {string} branch - Branch name
 * @returns {Promise<object>} Commit response
 */
async function deleteFile(owner, repo, path, message, sha, branch = 'main') {
  return githubApi(`/repos/${owner}/${repo}/contents/${path}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch }),
  });
}

/**
 * Create a tree (for creating multiple files)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {array} tree - Tree entries
 * @param {string} baseTree - Base tree SHA (optional)
 * @returns {Promise<object>} Tree response
 */
async function createTree(owner, repo, tree, baseTree = '') {
  const data = { tree };
  if (baseTree) data.base_tree = baseTree;
  
  return githubApi(`/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Create a commit
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} message - Commit message
 * @param {string} tree - Tree SHA
 * @param {array} parents - Array of parent commit SHAs
 * @returns {Promise<object>} Commit response
 */
async function createCommit(owner, repo, message, tree, parents) {
  return githubApi(`/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree, parents }),
  });
}

/**
 * Create or update a ref (branch/tag)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} ref - Ref name (e.g., 'heads/feature' or 'tags/v1.0')
 * @param {string} sha - Commit SHA
 * @returns {Promise<object>} Ref response
 */
async function createRef(owner, repo, ref, sha) {
  return githubApi(`/repos/${owner}/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref, sha }),
  });
}

/**
 * Update a ref
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} ref - Ref name
 * @param {string} sha - New commit SHA
 * @param {boolean} force - Force update
 * @returns {Promise<object>} Ref response
 */
async function updateRef(owner, repo, ref, sha, force = false) {
  return githubApi(`/repos/${owner}/${repo}/git/refs/${ref}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha, force }),
  });
}

/**
 * Delete a ref
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} ref - Ref name
 * @returns {Promise<object>} Success response
 */
async function deleteRef(owner, repo, ref) {
  return githubApi(`/repos/${owner}/${repo}/git/refs/${ref}`, {
    method: 'DELETE',
  });
}

/**
 * Search repositories
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object>} Search results
 */
async function searchRepos(query, { sort = 'stars', order = 'desc', per_page = 30, page = 1 } = {}) {
  const params = new URLSearchParams({
    q: query,
    sort,
    order,
    per_page: String(per_page),
    page: String(page),
  });
  return githubApi(`/search/repositories?${params}`);
}

/**
 * Search issues
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object>} Search results
 */
async function searchIssues(query, { sort = 'created', order = 'desc', per_page = 30, page = 1 } = {}) {
  const params = new URLSearchParams({
    q: query,
    sort,
    order,
    per_page: String(per_page),
    page: String(page),
  });
  return githubApi(`/search/issues?${params}`);
}

/**
 * Search pull requests
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Promise<object>} Search results
 */
async function searchPullRequests(query, { sort = 'created', order = 'desc', per_page = 30, page = 1 } = {}) {
  const params = new URLSearchParams({
    q: query,
    sort,
    order,
    per_page: String(per_page),
    page: String(page),
  });
  return githubApi(`/search/issues?q=${encodeURIComponent(query + ' type:pr')}&sort=${sort}&order=${order}&per_page=${per_page}&page=${page}`);
}

module.exports = {
  githubApi,
  getAuthenticatedUser,
  listUserRepos,
  getRepo,
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  closeIssue,
  addComment,
  listComments,
  addLabels,
  removeLabel,
  listLabels,
  listRepoLabels,
  createLabel,
  listPullRequests,
  getPullRequest,
  createPullRequest,
  updatePullRequest,
  listReviews,
  createReview,
  listReviewComments,
  createReviewComment,
  listWorkflowRuns,
  getWorkflowRun,
  rerunWorkflowRun,
  cancelWorkflowRun,
  triggerWorkflowDispatch,
  getWorkflowRunJobs,
  listBranches,
  getBranch,
  getRepoContents,
  getFileContent,
  createOrUpdateFile,
  deleteFile,
  createTree,
  createCommit,
  createRef,
  updateRef,
  deleteRef,
  searchRepos,
  searchIssues,
  searchPullRequests,
};
