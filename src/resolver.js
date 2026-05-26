const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

function parseActionRef(ref) {
  const match = ref.match(/^([^/]+)\/([^@]+)@(.+)$/)
  if (!match) throw new Error(`Invalid action ref: "${ref}" — expected "owner/repo@ref" or "./local/path"`)
  return { owner: match[1], repo: match[2], ref: match[3] }
}

async function resolveAction(actionRef, workspace) {
  if (actionRef.startsWith('./') || actionRef.startsWith('/')) {
    const localPath = path.resolve(workspace, actionRef)
    if (!fs.existsSync(localPath)) {
      throw new Error(`Action not found at path: ${localPath}`)
    }
    return localPath
  }

  const { owner, repo, ref } = parseActionRef(actionRef)
  return downloadAction(owner, repo, ref)
}

function githubApiBase() {
  return (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '')
}

function downloadAction(owner, repo, ref) {
  const tarballUrl = `${githubApiBase()}/repos/${owner}/${repo}/tarball/${ref}`
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'action-tester-resolve-'))
  const tarPath = path.join(tmpDir, 'action.tar.gz')
  const extractDir = path.join(tmpDir, 'extracted')

  const curlArgs = ['-sL', '--fail-with-body', '-o', tarPath]
  const token = process.env.GITHUB_TOKEN
  if (token) curlArgs.push('-H', `Authorization: token ${token}`)
  curlArgs.push(tarballUrl)

  const curlResult = spawnSync('curl', curlArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
  if (curlResult.status !== 0) {
    throw new Error(`Failed to download action ${owner}/${repo}@${ref}: ${curlResult.stderr?.toString() || 'curl error'}`)
  }

  fs.mkdirSync(extractDir, { recursive: true })
  const tarResult = spawnSync('tar', ['-xzf', tarPath, '-C', extractDir, '--strip-components=1'])
  if (tarResult.status !== 0) {
    throw new Error(`Failed to extract action archive: ${tarResult.stderr?.toString() || 'tar error'}`)
  }

  return extractDir
}

module.exports = { resolveAction, parseActionRef, githubApiBase }
