const EventEmitter = require('events').EventEmitter;
const MysqlseError = require('./error/index');
const ServerSelectionError = require('./error/serverSelection');
const PromiseProvider = require('./promise_provider');
const mysql = require('mysql');
const STATES = require('./connectionstate');
const get = require('./helpers/get');

let id = 0;

function Connection(base) {
    this.base = base;
    this.collections = {};
    this.models = {};
    this.config = { autoIndex: true };
    this.replica = false;
    this.options = null;
    this.otherDbs = []; // FIXME: To be replaced with relatedDbs
    this.relatedDbs = {}; // Hashmap of other dbs that share underlying connection
    this.states = STATES;
    this._readyState = STATES.disconnected;
    this._closeCalled = false;
    this._hasOpened = false;
    this.plugins = [];
    this.id = id++;
}


Connection.prototype.__proto__ = EventEmitter.prototype;


/**
 * Connection ready state
 *
 * - 0 = disconnected
 * - 1 = connected
 * - 2 = connecting
 * - 3 = disconnecting
 *
 * Each state change emits its associated event name.
 *
 * ####Example
 *
 *     conn.on('connected', callback);
 *     conn.on('disconnected', callback);
 *
 * @property readyState
 * @memberOf Connection
 * @instance
 * @api public
 */

Object.defineProperty(Connection.prototype, 'readyState', {
    get: function () {
        return this._readyState;
    },
    set: function (val) {
        if (!(val in STATES)) {
            throw new Error('Invalid connection state: ' + val);
        }

        if (this._readyState !== val) {
            this._readyState = val;
            // [legacy] loop over the otherDbs on this connection and change their state
            for (const db of this.otherDbs) {
                db.readyState = val;
            }

            // loop over relatedDbs on this connection and change their state
            for (const k in this.relatedDbs) {
                this.relatedDbs[k].readyState = val;
            }

            if (STATES.connected === val) {
                this._hasOpened = true;
            }

            this.emit(STATES[val]);
        }
    }
});

/**
 * Gets the value of the option `key`. Equivalent to `conn.options[key]`
 *
 * ####Example:
 *
 *     conn.get('test'); // returns the 'test' value
 *
 * @param {String} key
 * @method get
 * @api public
 */

Connection.prototype.get = function (key) {
    return get(this.options, key);
};

/**
 * Sets the value of the option `key`. Equivalent to `conn.options[key] = val`
 *
 * Supported options include:
 *
 * - `maxTimeMS`: Set [`maxTimeMS`](/docs/api.html#query_Query-maxTimeMS) for all queries on this connection.
 * - `useFindAndModify`: Set to `false` to work around the [`findAndModify()` deprecation warning](/docs/deprecations.html#findandmodify)
 *
 * ####Example:
 *
 *     conn.set('test', 'foo');
 *     conn.get('test'); // 'foo'
 *     conn.options.test; // 'foo'
 *
 * @param {String} key
 * @param {Any} val
 * @method set
 * @api public
 */

Connection.prototype.set = function (key, val) {
    this.options = this.options || {};
    this.options[key] = val;
    return val;
};


Connection.prototype.openConfig = function (config, options, callback) {

    if (typeof config !== 'object') {
        throw new MysqlseError('The `config` parameter to `openConfig()` must be a ' +
            `string, got "${typeof config}". Make sure the first parameter to ` +
            '`mysqlse.connect()` or `mysqlse.createConnection()` is a string.');
    }

    if (callback != null && typeof callback !== 'function') {
        throw new MysqlseError('3rd parameter to `mysqlse.connect()` or ' +
            '`mysqlse.createConnection()` must be a function, got "' +
            typeof callback + '"');
    }

    if (this.readyState === STATES.connecting || this.readyState === STATES.connected) {
        if (this._connectionString !== config) {
            throw new MysqlseError('Can\'t call `openConfig()` on an active connection with ' +
                'different connection strings. Make sure you aren\'t calling `mysqlse.connect()` ' +
                'multiple times.');
        }

        if (typeof callback === 'function') {
            callback(null, this);
        }
        return this;
    }

    this._connectionObject = config;
    this.readyState = STATES.connecting;
    this._closeCalled = false;
    const Promise = PromiseProvider.get();

    const _this = this;

    const promise = new Promise((resolve, reject) => {

        const client = new mysql.createConnection(config);
        _this.client = client;
        client.connect((error) => {
            if (error) {
                // _this.readyState = STATES.disconnected;
                return reject(error);
            }
            // console.log(_this, client);
            _setClient(_this, client, options, client.database);

            resolve(_this);
        });
    });

    const serverSelectionError = new ServerSelectionError();

    this.$initialConnection = Promise.all([promise]).
        then(res => res[0]).
        catch(err => {
            if (err != null && err.name === 'MongoServerSelectionError') {
                err = serverSelectionError.assimilateError(err);
            }

            if (this.listeners('error').length > 0) {
                process.nextTick(() => this.emit('error', err));
            }
            throw err;
        });

    this.then = function (resolve, reject) {
        return this.$initialConnection.then(resolve, reject);
    };
    this.catch = function (reject) {
        return this.$initialConnection.catch(reject);
    };

}

function _setClient(conn, client, options) {
    const db = client;
    conn.db = db;
    conn.client = client;

    const _handleReconnect = () => {
        // If we aren't disconnected, we assume this reconnect is due to a
        // socket timeout. If there's no activity on a socket for
        // `socketTimeoutMS`, the driver will attempt to reconnect and emit
        // this event.
        if (conn.readyState !== STATES.connected) {
            conn.readyState = STATES.connected;
            conn.emit('reconnect');
            conn.emit('reconnected');
            conn.onOpen();
        }
    };

    // `useUnifiedTopology` events
    const type = get(db, 's.topology.s.description.type', '');

    // Backwards compat for mongoose 4.x
    db.on('reconnect', function () {
        _handleReconnect();
    });
    // console.log(db);
}


module.exports = Connection;