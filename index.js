'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _import = require('lodash');

var _import2 = _interopRequireDefault(_import);

var _ansidiff = require('ansidiff');

var _ansidiff2 = _interopRequireDefault(_ansidiff);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _difflet = require('difflet');

var _difflet2 = _interopRequireDefault(_difflet);

var _duplexer = require('duplexer');

var _duplexer2 = _interopRequireDefault(_duplexer);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _hirestime = require('hirestime');

var _hirestime2 = _interopRequireDefault(_hirestime);

var _indentString = require('indent-string');

var _indentString2 = _interopRequireDefault(_indentString);

var _prettyMs = require('pretty-ms');

var _prettyMs2 = _interopRequireDefault(_prettyMs);

var _repeat = require('repeat-string');

var _repeat2 = _interopRequireDefault(_repeat);

var _rJSON = require('relaxed-json');

var _rJSON2 = _interopRequireDefault(_rJSON);

var _tapOut = require('tap-out');

var _tapOut2 = _interopRequireDefault(_tapOut);

var _through = require('through2');

var _through2 = _interopRequireDefault(_through);

var _lTrimList = require('./lib/l-trim-list.js');

var _lTrimList2 = _interopRequireDefault(_lTrimList);

var _symbols = require('./lib/symbols.js');

var _symbols2 = _interopRequireDefault(_symbols);

var _spinner = require('char-spinner');

var _spinner2 = _interopRequireDefault(_spinner);

require('babel/polyfill');

var OUTPUT_PADDING = '  ';
var objdiff = _difflet2['default']({
  indent: OUTPUT_PADDING.length,
  comment: true
}).compare;
var internals = {};
var ignoreCommentRegex = /^1\.\.\d*$/;
var errorMessageRegex = /^\[([A-z]{1,})?Error:\s(.*?)\]$/;

internals.parseStringToJS = function parseStringToJS(str, type) {
  var toNumber = function toNumber(i) {
    return i.includes('.') ? parseFloat(i) : parseInt(i, 10);
  };
  var toObject = function toObject(i) {
    return _rJSON2['default'].parse(i);
  };
  var toError = function toError(i) {
    return errorMessageRegex.test(i) ? new Error(i.replace(errorMessageRegex, '$2')) : false;
  };
  var toString = function toString(i) {
    return i;
  };

  if (type) {
    return ['to' + _import2['default'].capitalize(type)](str);
  }var attemptNumber = toNumber(str);
  if (!Number.isNaN(attemptNumber)) {
    return attemptNumber;
  }try {
    return toObject(str);
  } catch (e) {
    return toError(str) || toString(str);
  }
};

internals.formatResults = function formatResults(results, duration) {
  return _import2['default'].compact([internals.pad('total:     ' + results.asserts.length), internals.pad(_chalk2['default'].green('passing:   ' + results.pass.length)), results.fail.length > 0 ? internals.pad(_chalk2['default'].red('failing:   ' + results.fail.length)) : null, internals.pad('duration:  ' + _prettyMs2['default'](duration))]).join('\n');
};

// initial diffing logic via https://github.com/namuol/tap-difflet/blob/82712edfb0976f4113cf08a325ccdbe939b8a954/bin/tap-difflet#L89-L148
internals.formatDiff = function formatDiff(assertation) {
  var err = assertation.error;
  var expected = undefined;
  var actual = undefined;
  var gotExpected = true;
  var gotActual = true;
  var str = '';

  if (err.hasOwnProperty('expected')) expected = internals.parseStringToJS(err.expected);else if (err.hasOwnProperty('wanted')) expected = internals.parseStringToJS(err.wanted);else gotExpected = false;

  if (err.hasOwnProperty('actual')) actual = internals.parseStringToJS(err.actual);else if (err.hasOwnProperty('found')) actual = internals.parseStringToJS(err.found);else gotActual = false;

  if (gotActual && gotExpected) {
    // different types
    if ((typeof expected !== typeof actual || typeof expected === 'object') && (!actual || !expected)) {
      str = 'Expected ' + typeof expected + ' but got ' + typeof actual;
    }
    // error type
    else if (actual instanceof Error) {
      str = _chalk2['default'].white('Expected to not ') + _chalk2['default'].bold('throw') + _chalk2['default'].white(' but got ') + _chalk2['default'].bold(actual.message);
    }
    // string difference
    else if (typeof expected === 'string') {
      if (str.indexOf('\n') >= 0) {
        str = _ansidiff2['default'].lines(expected, actual);
      } else {
        str = _ansidiff2['default'].chars(expected, actual);
      }
    }
    // object difference
    else if (typeof expected === 'object') {
      str = objdiff(expected, actual);
    }
    // simple value difference
    else {
      str = _chalk2['default'].white('Expected ') + _chalk2['default'].bold('' + expected) + _chalk2['default'].white(' but got ') + _chalk2['default'].bold('' + actual);
    }
  }

  return str;
};

internals.formatFail = function formatFail(assertion) {
  var error = assertion.error;
  var out = '';

  if (!error.at) {
    // TODO: deal with error.operator === error
    // tapout seems to do a really bad job
    // const errorPrefix = '{ [Error'
    // const stack = error.stack
    // const message = `${errorPrefix}: ${error[errorPrefix]}`
    // const err = new Error(message)
    // err.message = message
    // err.stack = stack
    // console.log(err)
    return out;
  }

  var filepath = error.at.file;
  /* eslint-disable no-unused-vars */
  // bug in eslint; related to https://github.com/eslint/eslint/issues/2405
  var lineNumber = error.at.line;
  /* eslint-enable no-unused-vars */
  var columnNumber = error.at.character;

  if (!error.at.line) {
    out += internals.pad(_chalk2['default'].grey('untraceable async source: ' + filepath), 3) + '\n\n';
  } else {
    var contents = _fs2['default'].readFileSync(filepath).toString().split('\n');
    var line = contents[error.at.line - 1];
    var previousLine = contents[error.at.line - 2];
    var nextLine = contents[error.at.line];
    var _lineNumber = parseInt(error.at.line, 10);
    var previousLineNumber = parseInt(error.at.line, 10) - 1;
    var nextLineNumber = parseInt(error.at.line, 10) + 1;

    var lines = _lTrimList2['default']([line, previousLine, nextLine]);

    var atCharacterPadding = _repeat2['default'](' ', parseInt(error.at.character, 10) + parseInt(_lineNumber.toString().length, 10) + 2);

    out += internals.pad(_chalk2['default'].grey('' + filepath + ':' + _lineNumber + ':' + columnNumber), 2) + '\n';

    out += internals.pad(atCharacterPadding + _chalk2['default'].red('v'), 3) + '\n';
    out += internals.pad(_chalk2['default'].grey(previousLineNumber + '.  ' + lines[1]), 3) + '\n';
    out += internals.pad(_lineNumber + '.  ' + lines[0], 3) + '\n';
    out += internals.pad(_chalk2['default'].grey(nextLineNumber + '.  ' + lines[2]), 3) + '\n';
    out += internals.pad(atCharacterPadding + _chalk2['default'].red('^'), 3) + '\n';
  }

  out += internals.pad(internals.formatDiff(assertion), 3) + '\n';

  return out;
};

internals.outputTestName = function outputTestName(tests, testNumber, output) {
  var test = tests.get(testNumber);

  if (test && !test.hasOutputted) {
    test.hasOutputted = true;
    output.push(test.output);
  }
};

internals.pad = function pad(str, count) {
  return _indentString2['default'](str, OUTPUT_PADDING, count);
};

module.exports = function tapSimple() {
  var output = _through2['default']();
  var tests = new Map();
  var parser = _tapOut2['default']();
  var stream = _duplexer2['default'](parser, output);
  var getElapsed = _hirestime2['default']();
  var progress = _spinner2['default']();

  parser.on('test', function onTest(test) {
    tests.set(test.number, _import2['default'].assign(test, {
      output: _chalk2['default'].bold('\n ' + internals.pad(test.name) + '\n\n'),
      hasOutputted: false
    }));
  });

  parser.on('fail', function onFail(assertion) {
    var glyph = _chalk2['default'].red(_symbols2['default'].err);
    var name = _chalk2['default'].red(assertion.name);

    internals.outputTestName(tests, assertion.test, output);
    output.push(internals.pad('' + glyph + ' ' + name + ' \n', 2));
    output.push(internals.formatFail(assertion));

    stream.failed = true;
  });

  parser.on('comment', function onComment(comment) {
    // tap always outputs this comment showing a count of tests.
    // we'll deal with that manually later
    if (ignoreCommentRegex.test(comment.raw)) {
      return;
    }internals.outputTestName(tests, comment.test, output);
    output.push(internals.pad(_chalk2['default'].yellow('' + comment.raw), 2) + '\n');
  });

  parser.on('output', function onOutput(results) {
    clearInterval(progress);
    output.push('\n\n');
    output.push(internals.formatResults(results, getElapsed()));
    output.push('\n\n\n');
  });

  return stream;
};
