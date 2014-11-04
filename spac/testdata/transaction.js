goog.provide('lovefield.db.Transaction');

goog.require('goog.Promise');
goog.require('lf.Exception');
goog.require('lf.Global');
goog.require('lf.Transaction');
goog.require('lf.service');



/**
 * @implements {lf.Transaction}
 * @constructor @struct @final
 */
lovefield.db.Transaction = function() {
  /** @private {boolean} */
  this.completed_ = false;
};


/** @override */
lovefield.db.Transaction.prototype.exec = function(queryBuilders) {
  if (this.completed_) {
    throw new lf.Exception(
        lf.Exception.Type.TRANSACTION,
        'Transaction already commited/failed');
  }

  var queryEngine = lf.Global.get().getService(lf.service.QUERY_ENGINE);
  var plans = [];
  try {
    queryBuilders.forEach(function(queryBuilder) {
      queryBuilder.assertExecPreconditions();
      plans.push(queryEngine.getPlan(queryBuilder.getQuery()));
    }, this);
  } catch (e) {
    this.completed_ = true;
    return goog.Promise.reject(e);
  }

  var runner = lf.Global.get().getService(lf.service.RUNNER);
  return runner.exec(plans).then(
      goog.bind(function(results) {
        this.completed_ = true;
        return results.map(function(relation) {
          return relation.getPayloads();
        });
      }, this),
      goog.bind(function(e) {
        this.completed_ = true;
        throw e;
      }, this));
};
