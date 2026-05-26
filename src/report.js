function formatReport({ actionRef, runnerType, captureResult, assertionResults, expectFailure }) {
  const { exitCode } = captureResult
  const { passed, failed } = assertionResults

  const exitOk = expectFailure ? exitCode !== 0 : exitCode === 0
  const exitExpected = expectFailure ? 'non-zero' : '0'
  const exitDisplay = exitOk
    ? `✅ \`${exitCode}\``
    : `❌ \`${exitCode}\` _(expected \`${exitExpected}\`)_`

  const overallPass = failed.length === 0 && exitOk
  const hasFailed = failed.length > 0

  const lines = [
    `## 🧪 Action Test: \`${actionRef}\``,
    '',
    '| Property | Value |',
    '|----------|-------|',
    `| **Runner** | \`${runnerType}\` |`,
    `| **Exit code** | ${exitDisplay} |`,
    '',
  ]

  const total = passed.length + failed.length
  if (total > 0) {
    lines.push(`### ${hasFailed ? '❌' : '✅'} Assertions — ${passed.length} passed · ${failed.length} failed`)
    lines.push('')

    if (hasFailed) {
      lines.push('| | Assertion | Expected | Actual |')
      lines.push('|:---:|-----------|----------|--------|')
      for (const a of passed) {
        lines.push(`| ✅ | \`${a.key}\` | \`${a.expected}\` | — |`)
      }
      for (const a of failed) {
        lines.push(`| ❌ | \`${a.key}\` | \`${a.expected}\` | \`${a.actual}\` |`)
      }
    } else {
      lines.push('| | Assertion | Expected |')
      lines.push('|:---:|-----------|----------|')
      for (const a of passed) {
        lines.push(`| ✅ | \`${a.key}\` | \`${a.expected}\` |`)
      }
    }

    lines.push('')
  }

  lines.push('---')
  lines.push('')

  if (overallPass) {
    lines.push('🎉 **Result: PASSED**')
  } else {
    const reasons = []
    if (!exitOk) reasons.push('unexpected exit code')
    if (failed.length > 0) reasons.push(`${failed.length} assertion${failed.length === 1 ? '' : 's'} failed`)
    lines.push(`💥 **Result: FAILED** — ${reasons.join(', ')}`)
  }

  return lines.join('\n')
}

module.exports = { formatReport }
