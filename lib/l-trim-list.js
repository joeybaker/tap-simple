import _ from 'lodash'
const startingSpacesRegex = /^\s+/

module.exports = function lTrimList (lines) {
  let leftPadding = 0

  // Get minimum padding count
  _.each(lines, function (line) {
    const lineParts = line.match(startingSpacesRegex)
    const spaceLen = lineParts ? lineParts[0].length : 0

    // console.log(spaceLen)
    if (!leftPadding || spaceLen < leftPadding) {
      leftPadding = spaceLen
    }
  })

  // Strip padding at beginning of line
  return _.map(lines, function (line) {
    return line.slice(leftPadding)
  })
}
