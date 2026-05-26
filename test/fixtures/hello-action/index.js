const fs = require('fs')

const name = process.env.INPUT_NAME || ''
const shout = process.env.INPUT_SHOUT === 'true'
const greeting = shout ? `HELLO, ${name.toUpperCase()}!` : `Hello, ${name}!`

if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `greeting=${greeting}\n`)
process.stdout.write(`${greeting}\n`)
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `# Greeting\n\n${greeting}\n`)
