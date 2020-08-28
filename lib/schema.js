
function Schema(obj, options) {
    if (!(this instanceof Schema)) {
        return new Schema(obj, options);
    }
    this.obj = obj;

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