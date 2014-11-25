goog.provide('lovefield.db');

goog.require('lf.Global');
goog.require('lf.base.BackStoreType');
/** @suppress {extraRequire} */
goog.require('lf.fn');
/** @suppress {extraRequire} */
goog.require('lf.op');
goog.require('lf.proc.Database');
/** @suppress {extraRequire} */
goog.require('lf.query');
goog.require('lf.service');
goog.require('lovefield.db.schema.Database');


/** @return {!lf.schema.Database} */
lovefield.db.getSchema = function() {
  var global = lf.Global.get();
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
 */
lovefield.db.getInstance = function(opt_onUpgrade, opt_volatile) {
  var db = new lf.proc.Database(lovefield.db.getSchema());
  return db.init(
      opt_onUpgrade,
      opt_volatile ? lf.base.BackStoreType.MEMORY : undefined);
};
