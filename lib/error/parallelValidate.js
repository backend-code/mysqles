'use strict';

/*!
 * Module dependencies.
 */

const MysqlseError = require('./mysqlseError');


class ParallelValidateError extends MysqlseError {
  /**
   * ParallelValidate Error constructor.
   *
   * @param {Document} doc
   * @api private
   */
  constructor(doc) {
    const msg = 'Can\'t validate() the same doc multiple times in parallel. Document: ';
    super(msg + doc._id);
  }
}

Object.defineProperty(ParallelValidateError.prototype, 'name', {
  value: 'ParallelValidateError'
});

/*!
 * exports
 */

module.exports = ParallelValidateError;