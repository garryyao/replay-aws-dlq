#!/usr/bin/env node
const { redrive } = require('./lib');
const joi = require('joi');
const schema = joi.object({
  from: joi
    .string()
    .uri()
    .required(),
  to: joi
    .string()
    .uri()
    .required(),
  batchSize: joi
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(1)
});

const validateParams = params => {
  const { error } = schema.validate(params);
  if (error) {
    throw error;
  }
  return true;
};

if (require.main === module) {
  (async function() {
    const [from, to, batchSize] = process.argv.slice(2);
    const params = { from, to, batchSize };
    if (validateParams(params)) await redrive(params);
  })();
}
