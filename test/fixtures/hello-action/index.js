const core = require('@actions/core')

async function run() {
  const name = core.getInput('name', { required: true })
  const shout = core.getInput('shout') === 'true'
  const greeting = shout ? `HELLO, ${name.toUpperCase()}!` : `Hello, ${name}!`

  core.setOutput('greeting', greeting)
  process.stdout.write(`${greeting}\n`)
  await core.summary.addHeading('Greeting').addRaw(greeting).write()
}

run().catch(core.setFailed)
