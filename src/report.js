function formatReport({ actionRef, runnerType, captureResult, assertionResults, expectFailure }) {
  const { exitCode } = captureResult
  const { passed, failed } = assertionResults

  const exitOk = expectFailure ? exitCode !== 0 : exitCode === 0
  const exitExpected = expectFailure ? 'non-zero' : '0'
  const exitMark = exitOk ? 'PASS' : 'FAIL'

  const lines = [
    '-- Action Test Report -----------------------------',
    `  Action:  ${actionRef}`,
    `  Runner:  ${runnerType}`,
    `  Exit:    ${exitCode} (expected ${exitExpected})  ${exitMark}`,
    '',
    `  Assertions (${passed.length} passed, ${failed.length} failed):`,
  ]

  for (const a of passed) {
    lines.push(`  PASS  ${a.key.padEnd(24)} ${a.expected}`)
  }
  for (const a of failed) {
    lines.push(`  FAIL  ${a.key.padEnd(24)} ${a.expected}`)
    if (a.message) lines.push(`        ${a.message}`)
  }

  const overallPass = failed.length === 0 && exitOk
  const failCount = failed.length
  lines.push('')
  lines.push(
    overallPass
      ? '  Result: PASSED'
      : `  Result: FAILED (${failCount} assertion${failCount === 1 ? '' : 's'} failed)`
  )
  lines.push('---------------------------------------------------')

  return lines.join('\n')
}

module.exports = { formatReport }
