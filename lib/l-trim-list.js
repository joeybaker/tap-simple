'use strict';

var _interopRequireDefault = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

var _import = require('lodash');

var _import2 = _interopRequireDefault(_import);

var startingSpacesRegex = /^\s+/;

module.exports = function lTrimList(lines) {
  var leftPadding = 0;

  // Get minimum padding count
  _import2['default'].each(lines, function eachLine(line) {
    var lineParts = line.match(startingSpacesRegex);
    var spaceLen = lineParts ? lineParts[0].length : 0;

    // console.log(spaceLen)
    if (!leftPadding || spaceLen < leftPadding) {
      leftPadding = spaceLen;
    }
  });

  // Strip padding at beginning of line
  return _import2['default'].map(lines, function padLines(line) {
    return line.slice(leftPadding);
  });
};
