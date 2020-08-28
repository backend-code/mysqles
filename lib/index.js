/*!
 * Module dependencies.
 */

if (global.MYSQLSE_DRIVER_PATH) {
    const deprecationWarning = 'The `MYSQLSE_DRIVER_PATH` global property is ' +
        'deprecated. Use `mysqlse.driver.set()` instead.';
    const setDriver = require('util').deprecate(function () {
        require('./driver').set(require(global.MYSQLSE_DRIVER_PATH));
    }, deprecationWarning);
    setDriver();
} else {
    require('./driver').set(require('./drivers'));
}


// const mysql = require('mysql')
const Schema = require('./schema');
const Connection = require('./connection');
const defaultMysqlseSymbol = Symbol.for('mysqlse:default');
const STATES = require('./connectionstate')

/**
 * Mysqlse constructor.
 *
 * The exports object of the `mysqlse` module is an instance of this class.
 * Most apps will only use this one instance.
 *
 * ####Example:
 *     const mysqlse = require('mysqlse');
 *     mysqlse instanceof mysqlse.Mysqlse; // true
 *
 *     // Create a new Mysqlse instance with its own `connect()`, `set()`, `model()`, etc.
 *     const m = new mysqlse.Mysqlse();
 *
 * @api public
 * @param {Object} options see [`Mysqlse#set()` docs](/docs/api/mysqlse.html#mysqlse_Mysqlse-set)
 */
function Mysqlse(options) {
    this.connections = [];
    this.models = {};
    this.modelSchemas = {};
    // default global options
    this.options = Object.assign({
        pluralization: true
    }, options);
    const conn = this.createConnection(); // default connection
    conn.models = this.models;

    // If a user creates their own Mysqlse instance, give them a separate copy
    // of the `Schema` constructor so they get separate custom types. (gh-6933)
    if (!options || !options[defaultMysqlseSymbol]) {
        const _this = this;
        this.Schema = function () {
            this.base = _this;
            return Schema.apply(this, arguments);
        };
        this.Schema.prototype = Object.create(Schema.prototype);

        Object.assign(this.Schema, Schema);
        this.Schema.base = this;
        this.Schema.Types = Object.assign({}, Schema.Types);
    } else {
        // Hack to work around babel's strange behavior with
        // `import mysqlse, { Schema } from 'mysqlse'`. Because `Schema` is not
        // an own property of a Mysqlse global, Schema will be undefined. See gh-5648
        for (const key of ['Schema', 'model']) {
            this[key] = Mysqlse.prototype[key];
        }
    }

    this.Schema.prototype.base = this;

    Object.defineProperty(this, 'plugins', {
        configurable: false,
        enumerable: true,
        writable: false,
        // value: [
        //     [saveSubdocs, { deduplicate: true }],
        //     [validateBeforeSave, { deduplicate: true }],
        //     [shardingPlugin, { deduplicate: true }],
        //     [removeSubdocs, { deduplicate: true }],
        //     [trackTransaction, { deduplicate: true }]
        // ]
    });

    // console.log(this);
}

/**
 * Expose connection states for user-land
 *
 * @memberOf Mysqlse
 * @property STATES
 * @api public
 */
Mysqlse.prototype.STATES = STATES;

/**
 * The underlying driver this Mysqlse instance uses to communicate with
 * the database. A driver is a Mysqlse-specific interface that defines functions
 * like `find()`.
 *
 * @memberOf Mysqlse
 * @property driver
 * @api public
 */
Mysqlse.prototype.driver = require('./driver');

Mysqlse.prototype.createConnection = function (config, options, callback) {
    const _mysqlse = this instanceof Mysqlse ? this : mysqlse;

    const conn = new Connection(_mysqlse);
    if (typeof options === 'function') {
        callback = options;
        options = null;
    }
    /**
     *  connections: [ Connection { base: [Circular], models: {} } ],
     */
    _mysqlse.connections.push(conn);


    if (arguments.length > 0) {
        // console.log(config);
        return conn.openConfig(config,options, callback);
    }

    return conn;
}

/**
 * Opens the default mysqlse connection.
 *
 * ####Example:
 *
 *     mysqlse.connect('mongodb://user:pass@localhost:port/database');
 *
 *
 * @param {Object} config(s)
 * @param {Object} [options] passed down to the [MongoDB driver's `connect()` function](http://mongodb.github.io/node-mongodb-native/3.0/api/MongoClient.html), except for 4 mongoose-specific options explained below.
 * @param {Boolean} [options.bufferCommands=true] Mongoose specific option. Set to false to [disable buffering](http://mongoosejs.com/docs/faq.html#callback_never_executes) on all models associated with this connection.
 * @param {String} [options.dbName] The name of the database we want to use. If not provided, use database name from connection string.
 * @param {String} [options.user] username for authentication, equivalent to `options.auth.user`. Maintained for backwards compatibility.
 * @param {String} [options.pass] password for authentication, equivalent to `options.auth.password`. Maintained for backwards compatibility.
 * @param {Number} [options.poolSize=5] The maximum number of sockets the MongoDB driver will keep open for this connection. By default, `poolSize` is 5. Keep in mind that, as of MongoDB 3.4, MongoDB only allows one operation per socket at a time, so you may want to increase this if you find you have a few slow queries that are blocking faster queries from proceeding. See [Slow Trains in MongoDB and Node.js](http://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
 * @param {Boolean} [options.useUnifiedTopology=false] False by default. Set to `true` to opt in to the MongoDB driver's replica set and sharded cluster monitoring engine.
 * @param {Number} [options.serverSelectionTimeoutMS] If `useUnifiedTopology = true`, the MongoDB driver will try to find a server to send any given operation to, and keep retrying for `serverSelectionTimeoutMS` milliseconds before erroring out. If not set, the MongoDB driver defaults to using `30000` (30 seconds).
 * @param {Number} [options.heartbeatFrequencyMS] If `useUnifiedTopology = true`, the MongoDB driver sends a heartbeat every `heartbeatFrequencyMS` to check on the status of the connection. A heartbeat is subject to `serverSelectionTimeoutMS`, so the MongoDB driver will retry failed heartbeats for up to 30 seconds by default. Mongoose only emits a `'disconnected'` event after a heartbeat has failed, so you may want to decrease this setting to reduce the time between when your server goes down and when Mongoose emits `'disconnected'`. We recommend you do **not** set this setting below 1000, too many heartbeats can lead to performance degradation.
 * @param {Boolean} [options.autoIndex=true] Mongoose-specific option. Set to false to disable automatic index creation for all models associated with this connection.
 * @param {Boolean} [options.useNewUrlParser=false] False by default. Set to `true` to opt in to the MongoDB driver's new URL parser logic.
 * @param {Boolean} [options.useCreateIndex=true] Mongoose-specific option. If `true`, this connection will use [`createIndex()` instead of `ensureIndex()`](/docs/deprecations.html#ensureindex) for automatic index builds via [`Model.init()`](/docs/api.html#model_Model.init).
 * @param {Boolean} [options.useFindAndModify=true] True by default. Set to `false` to make `findOneAndUpdate()` and `findOneAndRemove()` use native `findOneAndUpdate()` rather than `findAndModify()`.
 * @param {Number} [options.reconnectTries=30] If you're connected to a single server or mongos proxy (as opposed to a replica set), the MongoDB driver will try to reconnect every `reconnectInterval` milliseconds for `reconnectTries` times, and give up afterward. When the driver gives up, the mongoose connection emits a `reconnectFailed` event. This option does nothing for replica set connections.
 * @param {Number} [options.reconnectInterval=1000] See `reconnectTries` option above.
 * @param {Class} [options.promiseLibrary] Sets the [underlying driver's promise library](http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html).
 * @param {Number} [options.bufferMaxEntries] This option does nothing if `useUnifiedTopology` is set. The MongoDB driver also has its own buffering mechanism that kicks in when the driver is disconnected. Set this option to 0 and set `bufferCommands` to `false` on your schemas if you want your database operations to fail immediately when the driver is not connected, as opposed to waiting for reconnection.
 * @param {Number} [options.connectTimeoutMS=30000] How long the MongoDB driver will wait before killing a socket due to inactivity _during initial connection_. Defaults to 30000. This option is passed transparently to [Node.js' `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback).
 * @param {Number} [options.socketTimeoutMS=30000] How long the MongoDB driver will wait before killing a socket due to inactivity _after initial connection_. A socket may be inactive because of either no activity or a long-running operation. This is set to `30000` by default, you should set this to 2-3x your longest running operation if you expect some of your database operations to run longer than 20 seconds. This option is passed to [Node.js `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback) after the MongoDB driver successfully completes.
 * @param {Number} [options.family=0] Passed transparently to [Node.js' `dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) function. May be either `0`, `4`, or `6`. `4` means use IPv4 only, `6` means use IPv6 only, `0` means try both.
 * @param {Function} [callback]
 * @see Mongoose#createConnection #index_Mysqlse-createConnection
 * @api public
 * @return {Promise} resolves to `this` if connection succeeded
 */

Mysqlse.prototype.connect = function (config, options, callback) {
    const _mysqlse = this instanceof Mysqlse ? this : mysqlse;
    const conn = _mysqlse.connection;

    return promiseOrCallback(callback, cb => {
        conn.openConfig(config, options, err => {
            if (err != null) {
                return cb(err);
            }
            return cb(null, _mysqlse);
        });
    });
};

Mysqlse.prototype.Schema = Schema;

/**
 * Defines a model or retrieves it.
 *
 * Models defined on the `mysqlse` instance are available to all connection
 * created by the same `mysqlse` instance.
 *
 * If you call `mysqlse.model()` with twice the same name but a different schema,
 * you will get an `OverwriteModelError`. If you call `mysqlse.model()` with
 * the same name and same schema, you'll get the same schema back.
 *
 * ####Example:
 *
 *     var mysqlse = require('mysqlse');
 *
 *     // define an Actor model with this mysqlse instance
 *     const schema = new Schema({ name: String });
 *     mysqlse.model('Actor', schema);
 *
 *     // create a new connection
 *     var conn = mysqlse.createConnection(..);
 *
 *     // create Actor model
 *     var Actor = conn.model('Actor', schema);
 *     conn.model('Actor') === Actor; // true
 *     conn.model('Actor', schema) === Actor; // true, same schema
 *     conn.model('Actor', schema, 'actors') === Actor; // true, same schema and collection name
 *
 *     // This throws an `OverwriteModelError` because the schema is different.
 *     conn.model('Actor', new Schema({ name: String }));
 *
 * _When no `collection` argument is passed, mysqlse uses the model name. If you don't like this behavior, either pass a collection name, use `mysqlse.pluralize()`, or set your schemas collection name option._
 *
 * ####Example:
 *
 *     var schema = new Schema({ name: String }, { collection: 'actor' });
 *
 *     // or
 *
 *     schema.set('collection', 'actor');
 *
 *     // or
 *
 *     var collectionName = 'actor'
 *     var M = mysqlse.model('Actor', schema, collectionName)
 *
 * @param {String|Function} name model name or class extending Model
 * @param {Schema} [schema] the schema to use.
 * @param {String} [collection] name (optional, inferred from model name)
 * @param {Boolean} [skipInit] whether to skip initialization (defaults to false)
 * @return {Model} The model associated with `name`. Mongoose will create the model if it doesn't already exist.
 * @api public
 */

Mysqlse.prototype.model = function (name, schema, collection, skipInit) {
    const _mysqlse = this instanceof Mysqlse ? this : mysqlse;

    let model;
    if (typeof name === 'function') {
        model = name;
        name = model.name;
        if (!(model.prototype instanceof Model)) {
            throw new _mysqlse.Error('The provided class ' + name + ' must extend Model');
        }
    }

    if (typeof schema === 'string') {
        collection = schema;
        schema = false;
    }

    if (utils.isObject(schema) && !(schema.instanceOfSchema)) {
        schema = new Schema(schema);
    }
    if (schema && !schema.instanceOfSchema) {
        throw new Error('The 2nd parameter to `mysqlse.model()` should be a ' +
            'schema or a POJO');
    }

    if (typeof collection === 'boolean') {
        skipInit = collection;
        collection = null;
    }

    // handle internal options from connection.model()
    let options;
    if (skipInit && utils.isObject(skipInit)) {
        options = skipInit;
        skipInit = true;
    } else {
        options = {};
    }

    // look up schema for the collection.
    if (!_mysqlse.modelSchemas[name]) {
        if (schema) {
            // cache it so we only apply plugins once
            _mysqlse.modelSchemas[name] = schema;
        } else {
            throw new mysqlse.Error.MissingSchemaError(name);
        }
    }

    const originalSchema = schema;
    if (schema) {
        if (_mysqlse.get('cloneSchemas')) {
            schema = schema.clone();
        }
        _mysqlse._applyPlugins(schema);
    }

    let sub;

    // connection.model() may be passing a different schema for
    // an existing model name. in this case don't read from cache.
    if (_mysqlse.models[name] && options.cache !== false) {
        if (originalSchema &&
            originalSchema.instanceOfSchema &&
            originalSchema !== _mysqlse.models[name].schema) {
            throw new _mysqlse.Error.OverwriteModelError(name);
        }

        if (collection && collection !== _mysqlse.models[name].collection.name) {
            // subclass current model with alternate collection
            model = _mysqlse.models[name];
            schema = model.prototype.schema;
            sub = model.__subclass(_mysqlse.connection, schema, collection);
            // do not cache the sub model
            return sub;
        }

        return _mysqlse.models[name];
    }

    // ensure a schema exists
    if (!schema) {
        schema = this.modelSchemas[name];
        if (!schema) {
            throw new mysqlse.Error.MissingSchemaError(name);
        }
    }

    // Apply relevant "global" options to the schema
    if (!('pluralization' in schema.options)) {
        schema.options.pluralization = _mysqlse.options.pluralization;
    }

    if (!collection) {
        collection = schema.get('collection') ||
            utils.toCollectionName(name, _mysqlse.pluralize());
    }

    const connection = options.connection || _mysqlse.connection;
    model = _mysqlse.Model.compile(model || name, schema, collection, connection, _mysqlse);

    if (!skipInit) {
        // Errors handled internally, so safe to ignore error
        model.init(function $modelInitNoop() { });
    }

    if (options.cache === false) {
        return model;
    }

    _mysqlse.models[name] = model;
    return _mysqlse.models[name];
};

/**
 * Declares a global plugin executed on all Schemas.
 *
 * Equivalent to calling `.plugin(fn)` on each Schema you create.
 *
 * @param {Function} fn plugin callback
 * @param {Object} [opts] optional options
 * @return {Mongoose} this
 * @see plugins ./plugins.html
 * @api public
 */

Mysqlse.prototype.plugin = function(fn, opts) {
    const _mysqlse = this instanceof Mysqlse ? this : mysqlse;
  
    _mysqlse.plugins.push([fn, opts]);
    return _mysqlse;
  };

  /**
 * The Mysqlse module's default connection. Equivalent to `mysqlse.connections[0]`, see [`connections`](#mysqlse_Mysqlse-connections).
 *
 * ####Example:
 *
 *     var mysqlse = require('mysqlse');
 *     mysqlse.connect(...);
 *     mysqlse.connection.on('error', cb);
 *
 * This is the connection used by default for every model created using [mysqlse.model](#index_Mysqlse-model).
 *
 * To create a new connection, use [`createConnection()`](#mysqlse_Mysqlse-createConnection).
 *
 * @memberOf Mysqlse
 * @instance
 * @property {Connection} connection
 * @api public
 */

Mysqlse.prototype.__defineGetter__('connection', function() {
    return this.connections[0];
  });
  
  Mysqlse.prototype.__defineSetter__('connection', function(v) {
    if (v instanceof Connection) {
      this.connections[0] = v;
      this.models = v.models;
    }
  });

  /**
 * An array containing all [connections](connections.html) associated with this
 * Mysqlse instance. By default, there is 1 connection. Calling
 * [`createConnection()`](#mongoose_Mysqlse-createConnection) adds a connection
 * to this array.
 *
 * ####Example:
 *
 *     const mysqlse = require('mysqlse');
 *     mysqlse.connections.length; // 1, just the default connection
 *     mysqlse.connections[0] === mysqlse.connection; // true
 *
 *     mysqlse.createConnection({
 *          host: 'localhost',
 *          user: 'root',
 *          password: '',
 *          database: 'test'
 *      });
 *     mysqlse.connections.length; // 2
 *
 * @memberOf Mysqlse
 * @instance
 * @property {Array} connections
 * @api public
 */

Mysqlse.prototype.connections;

/**
 * options: { pluralization: true, [Symbol(mysqlse:default)]: true },
 */
const mysqlse = module.exports = exports = new Mysqlse({
    [defaultMysqlseSymbol]: true
});
