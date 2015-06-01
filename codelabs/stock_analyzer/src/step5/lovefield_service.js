/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



/**
 * A singleton service used by the rest of the application to make calls to the
 * Lovefield API.
 * @constructor
 */
var LovefieldService = function() {
  // Following member variables are initialized within getDbConnection().
  this.db_ = null;
  this.si_ = null;
  this.hd_ = null;
};


/**
 * Initializes member variables that can't be initialized before getting a
 * connection to the database.
 * @private
 */
LovefieldService.prototype.onConnected_ = function() {
  this.si_ = this.db_.getSchema().table('StockInfo');
  this.hd_ = this.db_.getSchema().table('HistoricalData');
  console.log('DB connection established.');
};


/**
 * Instantiates the DB connection (re-entrant).
 * @return {!IThenable<!lf.Database>}
 */
LovefieldService.prototype.getDbConnection = function() {
  if (this.db_ != null) {
    return this.db_;
  }

  var schemaBuilder = this.buildSchema_();

  // This is necessary for the app to run with no errors while codelab step1 has
  // not been implemented yet.
  if (schemaBuilder == null) {
    return Promise.resolve(null);
  }

  var connectOptions = {storeType: lf.schema.DataStoreType.INDEXED_DB};
  return this.buildSchema_().connect(connectOptions).then(
      function(db) {
        this.db_ = db;
        this.onConnected_();
        return db;
      }.bind(this));
};


/**
 * Builds the database schema.
 * @return {!lf.schema.Builder}
 * @private
 */
LovefieldService.prototype.buildSchema_ = function() {
  var schemaBuilder = lf.schema.create('stocks', 1);
  schemaBuilder.createTable('HistoricalData').
      addColumn('Close', lf.Type.NUMBER).
      addColumn('Date', lf.Type.DATE_TIME).
      addColumn('High', lf.Type.NUMBER).
      addColumn('Low', lf.Type.NUMBER).
      addColumn('Open', lf.Type.NUMBER).
      addColumn('Stock', lf.Type.STRING).
      addColumn('Volume', lf.Type.INTEGER);

  schemaBuilder.createTable('StockInfo').
      addColumn('CompanyName', lf.Type.STRING).
      addColumn('Sector', lf.Type.STRING).
      addColumn('Stock', lf.Type.STRING).
      addPrimaryKey(['Stock']);

  return schemaBuilder;
};


/**
 * @typedef {{
 *   Close: number,
 *   Date: !Date,
 *   High: number,
 *   Low: number,
 *   Open: number,
 *   Stock: string,
 *   Volume: number
 * }}
 */
var HistoricalDataRaw;


/**
 * @typedef {{
 *   CompanyName: string,
 *   Sector: string,
 *   Stock: string
 * }}
 */
var StockInfoRaw;


/**
 * Inserts data in the two tables, HistoricalData and StockInfo.
 * @param {!Array<!HistoricalDataRaw>} historicalDataRaw
 * @param {!Array<!StockInfoRaw>} stockInfoRaw
 * @return {!IThenable} A promise that is resolved after both tables have been
 *     populated.
 */
LovefieldService.prototype.insertData = function(
    historicalDataRaw, stockInfoRaw) {
  // Generating Lovefield rows from the raw rows.
  var stockInfoRows = stockInfoRaw.map(
      function(obj) { return this.si_.createRow(obj); }, this);
  var historicalDataRows = historicalDataRaw.map(
      function(obj) { return this.hd_.createRow(obj); }, this);

  var q1 = this.db_.
      insert().
      into(this.hd_).
      values(historicalDataRows);
  var q2 = this.db_.
      insert().
      into(this.si_).
      values(stockInfoRows);

  // Updating both tables within a single transaction.
  var tx = this.db_.createTransaction();
  return tx.exec([q1, q2]);
};


/**
 * @return {!IThenable<!Array<!Object>>} The list of all available stocks.
 */
LovefieldService.prototype.getStockList = function() {
  return this.db_.
      select(this.si_.Stock).
      from(this.si_).
      orderBy(this.si_.Stock).
      exec();
};


/**
 * @return {!IThenable<!Array<!Object>>} The list of all available industry
 *     sectors.
 */
LovefieldService.prototype.getSectorList = function() {
  return this.db_.
      select(lf.fn.distinct(this.si_.Sector)).
      from(this.si_).
      exec();
};


/**
 * @param {!Date} start The start of the time window.
 * @param {!Date} end The end of the time window.
 * @param {string} stock The stock of interest.
 * @return {!IThenable<!Array<!Object>>} The closing prices for the given stock
 *     within the given time period.
 */
LovefieldService.prototype.getStockClosingPrices = function(
    start, end, stock) {
  var hd = this.hd_;
  var si = this.si_;

  return this.db_.
      select().
      from(hd).
      where(lf.op.and(
          hd.Date.between(start, end),
          hd.Stock.eq(stock))).
      orderBy(hd.Date, lf.Order.ASC).
      exec();
};


/**
 * @param {!Date} start The start of the time window.
 * @param {!Date} end The end of the time window.
 * @param {string} sector The industry sector of interest.
 * @return {!IThenable<!Array<!Object>>} The closing prices for the
 *     given industry sector within the given time period.
 */
LovefieldService.prototype.getSectorClosingPrices = function(
    start, end, sector) {
  var hd = this.hd_;
  var si = this.si_;

  return this.db_.
      select(lf.fn.avg(hd.Close), si.Sector, hd.Date).
      from(hd, si).
      where(lf.op.and(
          hd.Stock.eq(si.Stock), // join predicate on the common field 'Stock'
          hd.Date.between(start, end),
          si.Sector.eq(sector))).
      orderBy(hd.Date, lf.Order.ASC).
      groupBy(si.Sector, hd.Date).
      exec();
};


/**
 * Adds an observer that is triggerred whenever the results of the
 * stockClosingPricesQuery_ are modified. Modification of the results can
 * happen in two different ways.
 *
 * 1) stockClosingPricesQuery_ paremeters are bound to new values.
 * 2) The database is modified (imagine a background task that is syncing with
 *    the server periodically).
 * @param {!Function} observerFn
 */
LovefieldService.prototype.observeStockClosingPrices = function(observerFn) {
  // Codelab TODO: Implement this method at codelab step 7.
};


/**
 * Adds an observer that is triggerred whenever the results of the
 * sectorClosingPricesQuery_ are modified.
 * @param {!Function} observerFn
 */
LovefieldService.prototype.observeSectorClosingPrices = function(observerFn) {
  // Codelab TODO: Implement this method at codelab step 7.
};
