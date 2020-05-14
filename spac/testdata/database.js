goog.provide('lovefield.db');

goog.require('lf.Exception');
goog.require('lf.Global');
/** @suppress {extraRequire} */
goog.require('lf.fn');
/** @suppress {extraRequire} */
goog.require('lf.op');
goog.require('lf.proc.Database');
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
 * Whether a DB connection operation is in progress.
 * @private {boolean}
 */
lovefield.db.connectInProgress_ = false;


/**
 * @param {!lf.schema.ConnectOptions=} opt_options
 * @return {!IThenable<!lf.proc.Database>}
 */
lovefield.db.connect = function(opt_options) {
  if (lovefield.db.connectInProgress_ ||
      (lovefield.db.db_ !== null && lovefield.db.db_.isOpen())) {
    // 113: Attempt to connect() to an already connected/connecting database.
    throw new lf.Exception(113);
  }
  lovefield.db.connectInProgress_ = true;

  if (lovefield.db.db_ === null) {
    lovefield.db.getSchema();
    lovefield.db.db_ = new lf.proc.Database(lovefield.db.getGlobal());
  }

  return lovefield.db.db_.init(opt_options).then(
      function(db) {
        lovefield.db.connectInProgress_ = false;
        return db;
      },
      function(e) {
        lovefield.db.connectInProgress_ = false;
        throw e;
      });
};


/** @private {?lf.proc.Database} */
lovefield.db.db_ = null;
