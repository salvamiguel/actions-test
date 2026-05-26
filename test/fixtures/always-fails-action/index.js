const message = process.env.INPUT_MESSAGE || 'This action always fails'
const exitCode = parseInt(process.env.INPUT_EXIT_CODE || '1', 10)

process.stdout.write(`::error::${message}\n`)
process.exitCode = exitCode
