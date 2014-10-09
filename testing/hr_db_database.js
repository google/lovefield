goog.provide('hr.db');
goog.provide('hr.db.Database');

goog.require('hr.db.Observer');
goog.require('hr.db.Transaction');
goog.require('hr.db.schema.Database');
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


/**
 * @param {!function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @param {boolean=} opt_volatile Default to false
 * @return {!IThenable.<!hr.db.Database>}
 */
hr.db.getInstance = function(opt_onUpgrade, opt_volatile) {
  var db = new hr.db.Database();
  return db.init(
      opt_onUpgrade,
      opt_volatile ? lf.base.BackStoreType.MEMORY : undefined);
};



/**
 * @implements {lf.Database}
 * @constructor
 */
hr.db.Database = function() {
  /** @private {!lf.schema.Database} */
  this.schema_ = new hr.db.schema.Database();

  /** @private {boolean} */
  this.initialized_ = false;
};


/**
 * @param {!function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @param {lf.base.BackStoreType=} opt_backStoreType
 * @return {!IThenable.<!hr.db.Database>}
 */
hr.db.Database.prototype.init = function(
    opt_onUpgrade, opt_backStoreType) {
  return /** @type  {!IThenable.<!hr.db.Database>} */ (
      lf.base.init(
          this.schema_,
          opt_backStoreType || lf.base.BackStoreType.INDEXED_DB,
          opt_onUpgrade).then(goog.bind(function() {
        this.initialized_ = true;
        return this;
      }, this)));
};


/** @override */
hr.db.Database.prototype.getSchema = function() {
  return this.schema_;
};


/** @private */
hr.db.Database.prototype.checkInit_ = function() {
  if (!this.initialized_) {
    throw new lf.Exception(lf.Exception.Type.UNINITIALIZED,
        'Database is not initialized');
  }
};


/**
 * @param {...lf.schema.Column} var_args
 * @override
 */
hr.db.Database.prototype.select = function(var_args) {
  this.checkInit_();
  var columns =
      arguments.length == 1 && !goog.isDefAndNotNull(arguments[0]) ?
      [] : Array.prototype.slice.call(arguments);
  return new lf.query.SelectBuilder(columns);
};


/** @override */
hr.db.Database.prototype.insert = function() {
  this.checkInit_();
  return new lf.query.InsertBuilder();
};


/** @override */
hr.db.Database.prototype.insertOrReplace = function() {
  this.checkInit_();
  return new lf.query.InsertBuilder(/* allowReplace */ true);
};


/** @override */
hr.db.Database.prototype.update = function(table) {
  this.checkInit_();
  return new lf.query.UpdateBuilder(table);
};


/** @override */
hr.db.Database.prototype.delete = function() {
  this.checkInit_();
  return new lf.query.DeleteBuilder();
};


/** @override */
hr.db.Database.prototype.createTransaction = function(opt_type) {
  this.checkInit_();
  return new hr.db.Transaction();
};


/** @override */
hr.db.Database.prototype.createObserver = function(context) {
  this.checkInit_();
  return new hr.db.Observer();
};


/** @override */
hr.db.Database.prototype.close = function() {
  lf.base.closeDatabase(this.schema_);
  this.initialized_ = false;
};
