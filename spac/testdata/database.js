goog.provide('lovefield.db');

goog.require('lf.Global');
/** @suppress {extraRequire} */
goog.require('lf.fn');
/** @suppress {extraRequire} */
goog.require('lf.op');
goog.require('lf.proc.Database');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');
goog.require('lf.service.ServiceId');
goog.require('lovefield.db.schema.Database');


/**
 * @return {!lf.Global} The Global instance that refers to lovefield.db.
 */
lovefield.db.getGlobal = function() {
  var namespacedGlobalId = new lf.service.ServiceId('ns_db');
  var global = lf.Global.get();

  var namespacedGlobal = null;
  if (!global.isRegistered(namespacedGlobalId)) {
    namespacedGlobal = new lf.Global();
    global.registerService(namespacedGlobalId, namespacedGlobal);
  } else {
    namespacedGlobal = global.getService(namespacedGlobalId);
  }

  return namespacedGlobal;
};


/** @return {!lf.schema.Database} */
lovefield.db.getSchema = function() {
  var global = lovefield.db.getGlobal();

  if (!global.isRegistered(lf.service.SCHEMA)) {
    var schema = new lovefield.db.schema.Database();
    global.registerService(lf.service.SCHEMA, schema);
  }
  return global.getService(lf.service.SCHEMA);
};


/**
 * @param {!function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @param {boolean=} opt_volatile Default to false
 * @return {!IThenable.<!lf.proc.Database>}
 * @deprecated Use connect().
 */
lovefield.db.getInstance = function(opt_onUpgrade, opt_volatile) {
  lovefield.db.getSchema();
  var db = new lf.proc.Database(lovefield.db.getGlobal());
  return db.init(
      opt_onUpgrade,
      opt_volatile ? lf.schema.DataStoreType.MEMORY : undefined,
      false);
};


/**
 * @param {!lf.schema.ConnectOptions=} opt_options
 * @return {!IThenable.<!lf.proc.Database>}
 */
lovefield.db.connect = function(opt_options) {
  lovefield.db.getSchema();
  var db = new lf.proc.Database(lovefield.db.getGlobal());
  var upgradeCallback = (opt_options && opt_options.onUpgrade) ?
      opt_options.onUpgrade : undefined;
  var backstoreType = (opt_options && opt_options.storeType) ?
      opt_options.storeType : undefined;
  return db.init(upgradeCallback, backstoreType, false);
};
