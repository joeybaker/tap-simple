import _ from 'lodash'
import ansidiff from 'ansidiff'
import chalk from 'chalk'
import difflet from 'difflet'
import duplexer from 'duplexer'
import fs from 'fs'
import hirestime from 'hirestime'
import indentString from 'indent-string'
import prettyMs from 'pretty-ms'
import repeat from 'repeat-string'
import rJSON from 'relaxed-json'
import tapOut from 'tap-out'
import through from 'through2'
import lTrimList from './lib/l-trim-list.js'
import symbols from './lib/symbols.js'

const OUTPUT_PADDING = '  '
const objdiff = difflet({
  indent: OUTPUT_PADDING.length
  , comment: true
}).compare
const internals = {}
const ignoreCommentRegex = /^1\.\.\d*$/
const errorMessageRegex = /^\[([A-z]{1,})?Error:\s(.*?)\]$/

internals.parseStringToJS = function parseStringToJS (str, type) {
  const toNumber = (i) => i.includes('.') ? parseFloat(i) : parseInt(i, 10)
  const toObject = (i) => rJSON.parse(i)
  const toError = (i) => {
    return errorMessageRegex.test(i)
      ? new Error(i.replace(errorMessageRegex, '$2'))
      : false
  }
  const toString = (i) => i

  if (type) return [`to${_.capitalize(type)}`](str)

  let attemptNumber = toNumber(str)
  if (!Number.isNaN(attemptNumber)) return attemptNumber

  try {
    return toObject(str)
  }
  catch (e) {
    return toError(str) || toString(str)
  }
}

internals.formatResults = function formatResults (results, duration) {
  return _.compact([
    internals.pad('total:     ' + results.asserts.length)
    , internals.pad(chalk.green('passing:   ' + results.pass.length))
    , results.fail.length > 0 ? internals.pad(chalk.red('failing:   ' + results.fail.length)) : null
    , internals.pad('duration:  ' + prettyMs(duration))
    ]).join('\n')
}

// initial diffing logic via https://github.com/namuol/tap-difflet/blob/82712edfb0976f4113cf08a325ccdbe939b8a954/bin/tap-difflet#L89-L148
internals.formatDiff = function formatDiff (assertation) {
  const err = assertation.error
  let expected
  let actual
  let gotExpected = true
  let gotActual = true
  let str = ''

  if (err.hasOwnProperty('expected')) expected = internals.parseStringToJS(err.expected)
  else if (err.hasOwnProperty('wanted')) expected = internals.parseStringToJS(err.wanted)
  else gotExpected = false

  if (err.hasOwnProperty('actual')) actual = internals.parseStringToJS(err.actual)
  else if (err.hasOwnProperty('found')) actual = internals.parseStringToJS(err.found)
  else gotActual = false

  if (gotActual && gotExpected) {
    // different types
    if (
      (typeof expected !== typeof actual || typeof expected === 'object')
       && (!actual || !expected)
     ) {
      str = `Expected ${typeof expected} but got ${typeof actual}`
    }
    // error type
    else if (actual instanceof Error) {
      str = chalk.white('Expected to not ') + chalk.bold('throw') + chalk.white(' but got ') + chalk.bold(actual.message)
    }
    // string difference
    else if (typeof expected === 'string') {
      if (str.indexOf('\n') >= 0) {
        str = ansidiff.lines(expected, actual)
      }
      else {
        str = ansidiff.chars(expected, actual)
      }
    }
    // object difference
    else if (typeof expected === 'object') {
      str = objdiff(expected, actual)
    }
    // simple value difference
    else {
      str = chalk.white('Expected ') + chalk.bold('' + expected) + chalk.white(' but got ') + chalk.bold('' + actual)
    }
  }

  return str
}

internals.formatFail = function formatFail (assertion) {
  const error = assertion.error
  let out = ''

  if (!error.at){
    // TODO: deal with error.operator === error
    // tapout seems to do a really bad job
    // const errorPrefix = '{ [Error'
    // const stack = error.stack
    // const message = `${errorPrefix}: ${error[errorPrefix]}`
    // const err = new Error(message)
    // err.message = message
    // err.stack = stack
    // console.log(err)
    return out
  }

  const filepath = error.at.file
  /* eslint-disable no-unused-vars */
  // bug in eslint; related to https://github.com/eslint/eslint/issues/2405
  const lineNumber = error.at.line
  /* eslint-enable no-unused-vars */
  const columnNumber = error.at.character

  if (!error.at.line) {
    out += internals.pad(chalk.grey(`untraceable async source: ${filepath}`), 3) + '\n\n'
  }
  else {
    const contents = fs.readFileSync(filepath).toString().split('\n')
    const line = contents[error.at.line - 1]
    const previousLine = contents[error.at.line - 2]
    const nextLine = contents[error.at.line]
    const lineNumber = parseInt(error.at.line, 10)
    const previousLineNumber = parseInt(error.at.line, 10) - 1
    const nextLineNumber = parseInt(error.at.line, 10) + 1

    const lines = lTrimList([
      line, previousLine, nextLine
      ])

    const atCharacterPadding = repeat(' ', parseInt(error.at.character, 10) + parseInt(lineNumber.toString().length, 10) + 2)

    out += internals.pad(chalk.grey(`${filepath}:${lineNumber}:${columnNumber}`), 2) + '\n'

    out += internals.pad(atCharacterPadding + chalk.red('v'), 3) + '\n'
    out += internals.pad(chalk.grey(previousLineNumber + '.  ' + lines[1]), 3) + '\n'
    out += internals.pad(lineNumber + '.  ' + lines[0], 3) + '\n'
    out += internals.pad(chalk.grey(nextLineNumber + '.  ' + lines[2]), 3) + '\n'
    out += internals.pad(atCharacterPadding + chalk.red('^'), 3) + '\n'
  }

  out += internals.pad(internals.formatDiff(assertion), 3) + '\n'

  return out
}

internals.outputTestName = function outputTestName (tests, testNumber, output) {
  const test = tests.get(testNumber)

  if (test && !test.hasOutputted) {
    test.hasOutputted = true
    output.push(test.output)
  }
}

internals.pad = function pad (str, count) {
  return indentString(str, OUTPUT_PADDING, count)
}

module.exports = function tapSimple () {
  const output = through()
  const tests = new Map()
  const parser = tapOut()
  const stream = duplexer(parser, output)
  const getElapsed = hirestime()

  parser.on('test', function onTest (test) {
    tests.set(test.number, _.assign(test, {
      output: chalk.bold(`\n ${internals.pad(test.name)}\n\n`)
      , hasOutputted: false
    }))
  })

  parser.on('fail', function onFail (assertion) {
    const glyph = chalk.red(symbols.err)
    const name = chalk.red(assertion.name)

    internals.outputTestName(tests, assertion.test, output)
    output.push(internals.pad(`${glyph} ${name} \n`, 2))
    output.push(internals.formatFail(assertion))

    stream.failed = true
  })

  parser.on('comment', function onComment (comment) {
    // tap always outputs this comment showing a count of tests.
    // we'll deal with that manually later
    if (ignoreCommentRegex.test(comment.raw)) return

    internals.outputTestName(tests, comment.test, output)
    output.push(internals.pad(chalk.yellow(`${comment.raw}`), 2) + '\n')
  })

  parser.on('output', function onOutput (results) {
    output.push('\n\n')
    output.push(internals.formatResults(results, getElapsed()))
    output.push('\n\n\n')
  })

  return stream
}
