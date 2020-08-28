'use strict';

/*!
 * ignore
 */

class MysqlseError extends Error { }

Object.defineProperty(MysqlseError.prototype, 'name', {
  value: 'MysqlseError'
});

module.exports = MysqlseError;
