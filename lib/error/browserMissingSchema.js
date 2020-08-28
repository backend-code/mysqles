/*!
 * Module dependencies.
 */

'use strict';

const MysqlseError = require('./');


class MissingSchemaError extends MysqlseError {
  /*!
   * MissingSchema Error constructor.
   */
  constructor() {
    super('Schema hasn\'t been registered for document.\n'
      + 'Use mongoose.Document(name, schema)');
  }
}

Object.defineProperty(MissingSchemaError.prototype, 'name', {
  value: 'MysqlseError'
});

/*!
 * exports
 */

module.exports = MissingSchemaError;
