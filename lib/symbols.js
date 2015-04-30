'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
// win32 console default output fonts don't support tick/cross
var isWindows = process && process.platform === 'win32';

exports['default'] = {
  ok: isWindows ? '√' : '✓',
  err: isWindows ? '×' : '✗'
};
module.exports = exports['default'];
