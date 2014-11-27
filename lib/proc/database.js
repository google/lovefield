goog.provide('lf.proc.Database');

goog.require('lf.Database');
goog.require('lf.Exception');
goog.require('lf.Global');
goog.require('lf.base');
goog.require('lf.base.BackStoreType');
goog.require('lf.proc.Transaction');
goog.require('lf.query.DeleteBuilder');
goog.require('lf.query.InsertBuilder');
goog.require('lf.query.SelectBuilder');
goog.require('lf.query.UpdateBuilder');



/**
 * @implements {lf.Database}
 * @constructor
 *
 * @param {!lf.schema.Database} schema
 */
lf.proc.Database = function(schema) {
  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {boolean} */
  this.initialized_ = false;
};


/**
 * @param {!function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @param {lf.base.BackStoreType=} opt_backStoreType
 * @return {!IThenable.<!lf.proc.Database>}
 */
lf.proc.Database.prototype.init = function(
    opt_onUpgrade, opt_backStoreType) {
  return /** @type  {!IThenable.<!lf.proc.Database>} */ (
      lf.base.init(
          this.schema_,
          opt_backStoreType || lf.base.BackStoreType.INDEXED_DB,
          opt_onUpgrade,
          false).then(goog.bind(function() {
        this.initialized_ = true;
        return this;
      }, this)));
};


/** @override */
lf.proc.Database.prototype.getSchema = function() {
  return this.schema_;
};


/** @private */
lf.proc.Database.prototype.checkInit_ = function() {
  if (!this.initialized_) {
    throw new lf.Exception(lf.Exception.Type.UNINITIALIZED,
        'Database is not initialized');
  }
};


/**
 * @param {...lf.schema.Column} var_args
 * @override
 */
lf.proc.Database.prototype.select = function(var_args) {
  this.checkInit_();
  var columns =
      arguments.length == 1 && !goog.isDefAndNotNull(arguments[0]) ?
      [] : Array.prototype.slice.call(arguments);
  return new lf.query.SelectBuilder(lf.Global.get(), columns);
};


/** @override */
lf.proc.Database.prototype.insert = function() {
  this.checkInit_();
  return new lf.query.InsertBuilder(lf.Global.get());
};


/** @override */
lf.proc.Database.prototype.insertOrReplace = function() {
  this.checkInit_();
  return new lf.query.InsertBuilder(lf.Global.get(), /* allowReplace */ true);
};


/** @override */
lf.proc.Database.prototype.update = function(table) {
  this.checkInit_();
  return new lf.query.UpdateBuilder(lf.Global.get(), table);
};


/** @override */
lf.proc.Database.prototype.delete = function() {
  this.checkInit_();
  return new lf.query.DeleteBuilder(lf.Global.get());
};


/** @override */
lf.proc.Database.prototype.createTransaction = function(opt_type) {
  this.checkInit_();
  return new lf.proc.Transaction(lf.Global.get());
};


/** @override */
lf.proc.Database.prototype.close = function() {
  lf.base.closeDatabase(this.schema_);
  this.initialized_ = false;
};
