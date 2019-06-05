'use strict'
const _ = require('lodash')

/**
 * @hidden true
 */
const invalidAnswer = async () => {
  const key = 'skill-choice-invalid-count'
  const value = (temp[key] || 0) + 1

  temp[key] = value
  console.log('skill-choice-invalid-count', value)
}

return invalidAnswer()
