'use strict'

var assert = require('assert')
var _ = require('lodash')

module.exports = function(dataset, k = 5) {
  const kFold = Math.min(dataset.length, k)

  assert(n >= k, 'kFold parameter must be <= n')

  if (kFold === 1) {
    return [
      {
        train: dataset,
        test: dataset
      }
    ]
  }

  const n = dataset.length
  const nIndexes = _.range(kFold)
  const nbExPerGroup = Math.floor(n / kFold)
  const rest = n % kFold
  const gDelta = 0
  var shuffled = _.chain(dataset).shuffle()

  const sets = nIndexes.map(i => {
    var delta = i < rest ? 1 : 0

    var subset = shuffled
      .drop(i * nbExPerGroup + gDelta)
      .take(nbExPerGroup + delta)
      .value()

    gDelta += delta
    return subset
  })

  return nIndexes.map((a, i, list) => ({
    test: sets[i],
    train: _.chain(list)
      .without(i)
      .map(idx => sets[idx])
      .flatten()
      .value()
  }))
}
