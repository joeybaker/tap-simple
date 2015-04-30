import test from 'tape'
import {exec} from 'child_process'
import path from 'path'
import _ from 'lodash'

const demoDir = path.join(__dirname, 'demo')
const babelRunner = path.join(__dirname, '..', 'node_modules', '.bin', 'babel-node')
const tapSimpleRunner = path.join(__dirname, '..', 'bin', 'tap-simple')

const execTests = function execTests (file, callback) {
  const filePath = path.join(demoDir, file)
  exec(`${babelRunner} ${filePath} | ${tapSimpleRunner}`, callback)
}

const getLines = (output) => _(output.split('\n')).compact().map(_.trim).value()

test('passes', (t) => {
  execTests('pass.es6', (err, output) => {
    t.error(err)
    const lines = getLines(output)

    t.equal(
      lines[0]
      , 'Does not error with comment'
      , 'only outputs test names for tests with comments, not normal successes'
    )

    t.equal(
      lines[1]
      , 'a comment'
      , 'outputs console.log'
    )

    t.equal(
      lines[lines.length - 3].split(':')[0]
      , 'total'
      , 'outputs the total count'
    )

    t.equal(
      lines[lines.length - 2].split(':')[0]
      , 'passing'
      , 'outputs the passing count'
    )

    t.equal(
      lines[lines.length - 1].split(':')[0]
      , 'duration'
      , 'outputs the duration'
    )

    t.end()
  })
})

test('failures', (t) => {
  execTests('fail.es6', (err, output) => {
    t.ok(err, 'commeand errors')
    const lines = getLines(output)

    t.ok(
      _.find(lines, (line) => line.includes('4. '))
      , 'shows the fail location'
    )

    t.ok(
      _.find(lines, (line) => line.includes('Expected false but got true'))
      , 'diffs booleans'
    )

    t.ok(
      _.find(lines, (line) => line.includes('Expected 2 but got 1'))
      , 'diffs numbers'
    )

    t.ok(
      _.find(lines, (line) => line.includes('// != 42'))
      , 'diffs objects'
    )

    t.ok(
      _.find(lines, (line) => line.includes('[27m, world!'))
      , 'diffs strings'
    )

    t.ok(
      _.find(lines, (line) => line.includes('Expected to not throw'))
      , 'outputs tests not expected to throw'
    )

    t.equal(
      lines[lines.length - 4].split(':')[0]
      , 'total'
      , 'outputs the total count'
    )

    t.equal(
      lines[lines.length - 3].split(':')[0]
      , 'passing'
      , 'outputs the passing count'
    )

    t.equal(
      lines[lines.length - 2].split(':')[0]
      , 'failing'
      , 'outputs the failing count'
    )

    t.equal(
      lines[lines.length - 1].split(':')[0]
      , 'duration'
      , 'outputs the duration'
    )

    t.end()
  })
})
