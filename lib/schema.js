
function Schema(obj, options) {
    if (!(this instanceof Schema)) {
        return new Schema(obj, options);
    }
    
  this.obj = obj;
  this.paths = {};
  this.aliases = {};
  this.subpaths = {};
  this.virtuals = {};
  this.singleNestedPaths = {};
  this.nested = {};
  this.inherits = {};
  this.callQueue = [];
  this._indexes = [];
  this.methods = {};
  this.methodOptions = {};
  this.statics = {};
  this.tree = {};
  this.query = {};
  this.childSchemas = [];
  this.plugins = [];
  // For internal debugging. Do not use this to try to save a schema in MDB.
  this.$id = ++id;

  this.s = {
    hooks: new Kareem()
  };

    this.options = this.defaultOptions(options);
    // build paths
    if (Array.isArray(obj)) {
        for (const definition of obj) {
            this.add(definition);
        }
    } else if (obj) {
        this.add(obj);
    }

    this.setupTimestamp(this.options.timestamps);
}

Schema.prototype.add = function add(obj, prefix) {
    if (obj instanceof Schema) {
        // merge(this, obj);
        console.log(obj)
        return this;
    }
}

module.exports = exports = Schema;