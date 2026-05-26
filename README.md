# Action Tester ✅

**Test any GitHub Action declaratively — with YAML assertions, zero boilerplate.**

[![CI](https://github.com/salvamiguel/actions-test/actions/workflows/test.yml/badge.svg)](https://github.com/salvamiguel/actions-test/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/v/release/salvamiguel/actions-test?color=blue)](https://github.com/salvamiguel/actions-test/releases)
[![Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Action%20Tester-blue?logo=github)](https://github.com/marketplace/actions/action-tester)
[![Node](https://img.shields.io/badge/node-24-brightgreen)](https://nodejs.org)
[![License](https://img.shields.io/github/license/salvamiguel/actions-test)](LICENSE)

---

Point it at any action — local or from the Marketplace — give it assertions, and it tells you if it passed or failed. No Docker. No test frameworks. Just YAML.

```yaml
- uses: salvamiguel/actions-test@v1
  with:
    action: ./my-action
    inputs: |
      name: World
    assertions: |
      exit_code: 0
      outputs.greeting: Hello, World!
      stdout.contains: "Hello"
```

---

## Features

- 🧪 **Declarative assertions** — exit code, outputs, stdout, stderr, env vars, files, step summary
- 📦 **Any runner type** — Node.js, Docker, and Composite actions
- 🌐 **Local + Marketplace** — test `./path/to/action` or `owner/repo@ref`
- 💥 **Failure testing** — use `expect_failure: true` to assert an action exits non-zero
- 📋 **Rich summaries** — results rendered as a Markdown table in the job summary
- 🏢 **GHES support** — respects `GITHUB_API_URL` for GitHub Enterprise installations

---

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `action` | ✅ | Action ref: `owner/repo@ref` or `./local/path` |
| `inputs` | — | YAML block of inputs to pass to the action |
| `env` | — | YAML block of extra environment variables to inject |
| `assertions` | — | YAML block of assertions to evaluate |
| `expect_failure` | — | Set to `true` if the action is expected to fail (default: `false`) |

---

## Assertions Reference

| Key | Description | Example |
|-----|-------------|---------|
| `exit_code` | Process exit code | `exit_code: 0` |
| `outputs.<name>` | Action output value | `outputs.version: 1.2.3` |
| `stdout.contains` | Substring in stdout | `stdout.contains: "Build succeeded"` |
| `stdout.matches` | Regex match in stdout | `stdout.matches: "v\\d+\\.\\d+\\.\\d+"` |
| `stderr.contains` | Substring in stderr | `stderr.contains: "warning"` |
| `env.<name>` | Exported env variable | `env.NODE_ENV: production` |
| `files.exist` | File(s) must exist | `files.exist: dist/index.js` |
| `files.not_exist` | File(s) must not exist | `files.not_exist: .env` |
| `summary.contains` | Substring in step summary | `summary.contains: "Deployed"` |

All assertions **accumulate** — every failure is reported, not just the first.

**List syntax** (avoids YAML duplicate key restriction):

```yaml
assertions: |
  files.exist:
    - dist/index.js
    - dist/index.js.map
  stdout.contains:
    - "Build complete"
    - "0 errors"
```

---

## Examples

### Test a local Node.js action

```yaml
- uses: salvamiguel/actions-test@v1
  with:
    action: ./actions/deploy
    inputs: |
      environment: staging
      dry-run: 'true'
    assertions: |
      exit_code: 0
      outputs.url: https://staging.example.com
      stdout.contains: "Deploying to staging"
      summary.contains: "Deployment"
```

### Test a Marketplace action

```yaml
- uses: salvamiguel/actions-test@v1
  with:
    action: actions/checkout@v6
    inputs: |
      repository: ${{ github.repository }}
      token: ${{ secrets.GITHUB_TOKEN }}
    assertions: |
      exit_code: 0
      files.exist:
        - .git/HEAD
        - .git/config
```

### Assert an action fails on bad input

```yaml
- uses: salvamiguel/actions-test@v1
  with:
    action: ./actions/validate-semver
    inputs: |
      version: not-a-version
    expect_failure: true
    assertions: |
      stdout.contains: "Invalid semver"
```

### Test env var exports

```yaml
- uses: salvamiguel/actions-test@v1
  with:
    action: ./actions/setup-env
    inputs: |
      environment: production
    assertions: |
      exit_code: 0
      env.APP_ENV: production
      env.DEBUG: 'false'
      stdout.contains: "Environment configured"
```

### Full integration test suite

```yaml
jobs:
  test-actions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Test — happy path
        uses: salvamiguel/actions-test@v1
        with:
          action: ./actions/build
          inputs: |
            ref: main
          assertions: |
            exit_code: 0
            outputs.artifact: build-main.zip
            files.exist: dist/

      - name: Test — missing required input fails
        uses: salvamiguel/actions-test@v1
        with:
          action: ./actions/build
          expect_failure: true
          assertions: |
            stdout.contains: "required input"

      - name: Test — output files created
        uses: salvamiguel/actions-test@v1
        with:
          action: ./actions/generate-changelog
          inputs: |
            from: v1.0.0
            to: v2.0.0
          assertions: |
            exit_code: 0
            files.exist: CHANGELOG.md
            summary.contains: "Changelog"
```

---

## For AI Agents & Automated Workflows

Action Tester is purpose-built for the way AI agents write and iterate on GitHub Actions.

### The problem with manual testing

When an AI agent generates or modifies a GitHub Action, verifying it works requires:
- Writing a separate test workflow by hand
- Knowing which outputs and side-effects to check
- Waiting for full CI runs to catch regressions
- Interpreting unstructured log output to decide pass/fail

This feedback loop is slow, noisy, and hard to automate.

### How Action Tester changes the loop

Action Tester gives agents a **structured, machine-readable contract** for action behaviour. An agent can:

1. **Generate an action** and its test in the same step
2. **Run the test inline** — no separate test framework, no Docker, no extra setup
3. **Read structured output** — `exit_code`, `outputs.*`, `env.*` are all explicit key-value results
4. **Iterate fast** — `expect_failure: true` lets agents verify error paths without special-casing

```yaml
# An agent-generated action + test in one workflow
- name: Run my generated action
  uses: salvamiguel/actions-test@v1
  with:
    action: ./generated/my-action
    inputs: |
      payload: '{"event": "push"}'
    assertions: |
      exit_code: 0
      outputs.processed: 'true'
      env.LAST_EVENT: push
      stdout.contains: "processed successfully"
```

### Why declarative assertions matter for agents

| Traditional approach | With Action Tester |
|---------------------|-------------------|
| Parse unstructured logs | Read `outputs.*` and `env.*` directly |
| Guess at pass/fail from exit code alone | All assertion results explicit in summary |
| Separate test framework per language | One YAML schema for any action type |
| Manual test scaffolding | Inline — same file as the action call |
| Hard to express "this should fail" | `expect_failure: true` |

### Suggested agent workflow

```
1. Agent writes ./actions/my-action/action.yml + index.js
2. Agent writes test step using salvamiguel/actions-test@v1
3. CI runs — Action Tester reports structured pass/fail
4. Agent reads summary table, iterates on failures
5. Repeat until all assertions pass
```

The job summary produced by Action Tester is designed to be consumed directly by an agent reading CI output — every assertion result is explicit, labelled, and structured.

---

## How it works

Action Tester runs target actions in an isolated child process with simulated GitHub Actions environment variables (`GITHUB_OUTPUT`, `GITHUB_STEP_SUMMARY`, `GITHUB_ENV`). After execution it reads those files, evaluates your assertions, and reports results.

Supported runner types:

| Type | How it runs |
|------|-------------|
| `node20` / `node24` | `node dist/index.js` in a child process |
| `docker` | `docker run` with bind-mounted capture files |
| `composite` | Each `run:` step executed via shell; nested `uses:` best-effort |

---

## Release & Versioning

Releases follow [Conventional Commits](https://www.conventionalcommits.org/). After merging to `main`, cut a release by pushing a tag:

```bash
git tag v1.2.0
git push origin v1.2.0
```

The release workflow creates a GitHub Release and updates the floating `v1` tag automatically.

---

## License

MIT © [Salva Manzanera](https://github.com/salvamiguel)
