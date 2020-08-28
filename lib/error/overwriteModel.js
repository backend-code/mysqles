
/*!
 * Module dependencies.
 */

'use strict';

const MysqlseError = require('./');


class OverwriteModelError extends MysqlseError {
  /*!
   * OverwriteModel Error constructor.
   * @param {String} name
   */
  constructor(name) {
    super('Cannot overwrite `' + name + '` model once compiled.');
  }
}

Object.defineProperty(OverwriteModelError.prototype, 'name', {
  value: 'OverwriteModelError'
});

/*!
 * exports
 */

module.exports = OverwriteModelError;
