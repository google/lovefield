goog.provide('lovefield.db');
goog.provide('lovefield.db.Database');

goog.require('lf.Database');
goog.require('lf.Exception');
goog.require('lf.base');
goog.require('lf.base.BackStoreType');
/** @suppress {extraRequire} */
goog.require('lf.fn');
/** @suppress {extraRequire} */
goog.require('lf.op');
goog.require('lf.query.DeleteBuilder');
goog.require('lf.query.InsertBuilder');
goog.require('lf.query.SelectBuilder');
goog.require('lf.query.UpdateBuilder');
goog.require('lovefield.db.Observer');
goog.require('lovefield.db.Transaction');
goog.require('lovefield.db.schema.Database');


/**
 * @param {!function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @param {boolean=} opt_volatile Default to false
 * @return {!IThenable.<!lovefield.db.Database>}
 */
lovefield.db.getInstance = function(opt_onUpgrade, opt_volatile) {
  var db = new lovefield.db.Database();
  return db.init(
      opt_onUpgrade,
      opt_volatile ? lf.base.BackStoreType.MEMORY : undefined);
};



/**
 * @implements {lf.Database}
 * @constructor
 */
lovefield.db.Database = function() {
  /** @private {!lf.schema.Database} */
  this.schema_ = new lovefield.db.schema.Database();

  /** @private {boolean} */
  this.initialized_ = false;
};


/**
 * @param {!function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @param {lf.base.BackStoreType=} opt_backStoreType
 * @return {!IThenable.<!lovefield.db.Database>}
 */
lovefield.db.Database.prototype.init = function(
    opt_onUpgrade, opt_backStoreType) {
  return /** @type  {!IThenable.<!lovefield.db.Database>} */ (
      lf.base.init(
          this.schema_,
          opt_backStoreType || lf.base.BackStoreType.INDEXED_DB,
          opt_onUpgrade).then(goog.bind(function() {
        this.initialized_ = true;
        return this;
      }, this)));
};


/** @override */
lovefield.db.Database.prototype.getSchema = function() {
  return this.schema_;
};


/** @private */
lovefield.db.Database.prototype.checkInit_ = function() {
  if (!this.initialized_) {
    throw new lf.Exception(lf.Exception.Type.UNINITIALIZED,
        'Database is not initialized');
  }
};


/**
 * @param {...lf.schema.Column} var_args
 * @override
 */
lovefield.db.Database.prototype.select = function(var_args) {
  this.checkInit_();
  var columns =
      arguments.length == 1 && !goog.isDefAndNotNull(arguments[0]) ?
      [] : Array.prototype.slice.call(arguments);
  return new lf.query.SelectBuilder(columns);
};


/** @override */
lovefield.db.Database.prototype.insert = function() {
  this.checkInit_();
  return new lf.query.InsertBuilder();
};


/** @override */
lovefield.db.Database.prototype.insertOrReplace = function() {
  this.checkInit_();
  return new lf.query.InsertBuilder(/* allowReplace */ true);
};


/** @override */
lovefield.db.Database.prototype.update = function(table) {
  this.checkInit_();
  return new lf.query.UpdateBuilder(table);
};


/** @override */
lovefield.db.Database.prototype.delete = function() {
  this.checkInit_();
  return new lf.query.DeleteBuilder();
};


/** @override */
lovefield.db.Database.prototype.createTransaction = function(opt_type) {
  this.checkInit_();
  return new lovefield.db.Transaction();
};


/** @override */
lovefield.db.Database.prototype.createObserver = function(context) {
  this.checkInit_();
  return new lovefield.db.Observer();
};


/** @override */
lovefield.db.Database.prototype.close = function() {
  lf.base.closeDatabase(this.schema_);
  this.initialized_ = false;
};
