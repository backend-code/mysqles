/*!
 * Module dependencies.
 */

'use strict';

const MysqlseError = require('./');


class StrictModeError extends MysqlseError {
  /**
   * Strict mode error constructor
   *
   * @param {String} path
   * @param {String} [msg]
   * @param {Boolean} [immutable]
   * @inherits MysqlseError
   * @api private
   */
  constructor(path, msg, immutable) {
    msg = msg || 'Field `' + path + '` is not in schema and strict ' +
      'mode is set to throw.';
    super(msg);
    this.isImmutableError = !!immutable;
    this.path = path;
  }
}

Object.defineProperty(StrictModeError.prototype, 'name', {
  value: 'StrictModeError'
});

module.exports = StrictModeError;
