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
 * @typedef {{
 *  cities: !Array<string>,
 *  colors: !Array<string>,
 *  disciplines: !Array<string>,
 *  events: !Array<string>,
 *  genders: !Array<string>,
 *  years: !Array<number>
 * }}
 * @private
 */
var ColumnDomains_;


/**
 * @typedef {{
 *   city: lf.schema.Column,
 *   color: lf.schema.Column,
 *   country: lf.schema.Column,
 *   discipline: lf.schema.Column,
 *   eventGender: lf.schema.Column,
 *   event: lf.schema.Column,
 *   firstName: lf.schema.Column,
 *   gender: lf.schema.Column,
 *   lastName: lf.schema.Column,
 *   sport: lf.schema.Column,
 *   year: lf.schema.Column
 * }}
 * @private
 */
var MedalSchema_;



/**
 * @param {!angular.$http} $http
 * @constructor
 */
var DbService = function($http) {
  this.http_ = $http;
  this.db = null;

  /** @private {!IThenable<!lf.Database>} */
  this.whenInitialized_ = this.init_().then(
      function() {
        return this.db;
      }.bind(this));
};


/**
 * Builds the database schema.
 * @return {!lf.schema.Builder}
 * @private
 */
DbService.prototype.buildSchema_ = function() {
  var schemaBuilder = lf.schema.create('olympia', 1);
  schemaBuilder.createTable('Medal').
      addColumn('city', lf.Type.STRING).
      addColumn('color', lf.Type.STRING).
      addColumn('country', lf.Type.STRING).
      addColumn('discipline', lf.Type.STRING).
      addColumn('eventGender', lf.Type.STRING).
      addColumn('event', lf.Type.STRING).
      addColumn('firstName', lf.Type.STRING).
      addColumn('gender', lf.Type.STRING).
      addColumn('lastName', lf.Type.STRING).
      addColumn('sport', lf.Type.STRING).
      addColumn('year', lf.Type.NUMBER).
      addNullable(['firstName']).
      addIndex('idx_year', ['year']).
      addIndex('idx_lastName', ['lastName']);
  return schemaBuilder;
};


/**
 * Ensures that database is populated with data and initializes the DB
 * connection.
 * @return {!IThenable}
 * @private
 */
DbService.prototype.init_ = function() {
  return this.buildSchema_().connect().then((
      function(database) {
        this.db = database;
        window.db = database;
        return this.checkForExistingData_();
      }).bind(this)).then((
      function(dataExist) {
        return dataExist ? Promise.resolve() : this.insertData_();
      }).bind(this));
};


/**
 * Gets the db connection.
 * @return {!IThenable.<!lf.Database>}
 */
DbService.prototype.get = function() {
  return this.whenInitialized_;
};


/**
 * Checks if any data exists already in the DB.
 * @return {boolean}
 * @private
 */
DbService.prototype.checkForExistingData_ = function() {
  var medal = this.db.getSchema().table('Medal');
  return this.db.select().from(medal).exec().then(
      function(rows) {
        return rows.length > 0;
      });
};


/**
 * Inserts data to the DB.
 * @return {!angular.$q.Promise}
 * @private
 */
DbService.prototype.insertData_ = function() {
  var medal = this.db.getSchema().table('Medal');
  return this.http_.get('../data/olympic_medalists.json').then(
      function(response) {
        var rows = response.data.map(function(obj) {
          return medal.createRow(obj);
        });
        return this.db.insert().into(medal).values(rows).exec();
      });
};



/** @constructor */
var ResultsService = function() {
  /** @private {!Array<!Object>} */
  this.results_ = [];
};


/** @return {!Array<!Object>} */
ResultsService.prototype.getResults = function() {
  return this.results_;
};


/** @param {!Array<!Object>} results */
ResultsService.prototype.setResults = function(results) {
  this.results_ = results;

  var headerData = results.length > 0 ?
      Object.keys(results[0]).map(
          function(columnName) {
            var columnOptions = {field: columnName, title: columnName};
            if (columnName == 'color') {
              columnOptions.cellStyle = function(value) {
                return {classes: [value.toLowerCase()]};
              };
            }
            return columnOptions;
          }) : [];

  /** @type {{bootstrapTable: !Function}} */ ($('#results-table')).
      bootstrapTable('destroy');
  /** @type {{bootstrapTable: !Function}} */ ($('#results-table')).
      bootstrapTable({
        columns: headerData,
        data: results,
        pageSize: 25,
        pagination: true,
        paginationVAlign: 'top',
        sortable: false
      });
};



/**
 * @param {!angular.Scope} $scope
 * @param {!angular.$http} $http
 * @param {!DbService} dbService
 * @param {!ResultsService} resultsService
 * @constructor
 */
var QueryBuilderController = function(
    $scope, $http, dbService, resultsService) {
  this.scope_ = $scope;
  this.http_ = $http;
  this.dbService_ = dbService;
  this.resultsService_ = resultsService;

  this.fromYears = [];
  this.toYears = [];
  this.cities = [];
  this.disciplines = [];
  this.events = [];
  this.countries = [];
  this.genders = [];
  this.colors = [];
  this.sqlQuery = '';
  this.unboundValue = undefined;

  this.populateUi_();
  this.addGlobalMethod_();
};


/**
 * Add a global method to be used during live-demos.
 * @private
 */
QueryBuilderController.prototype.addGlobalMethod_ = function() {
  window.displayResults = (function(results) {
    this.resultsService_.setResults(results);
    this.scope_.$apply();
  }).bind(this);
};


/**
 * Clears all predicates and results.
 */
QueryBuilderController.prototype.clear = function() {
  // Removing all predicates.
  this.scope_.citySelection = this.unboundValue;
  this.scope_.disciplineSelection = this.unboundValue;
  this.scope_.countrySelection = this.unboundValue;
  this.scope_.genderSelection = this.unboundValue;
  this.scope_.colorSelection = this.unboundValue;
  this.scope_.fromYearSelection = this.unboundValue;
  this.scope_.toYearSelection = this.unboundValue;
  this.scope_.eventSelection = this.unboundValue;

  // Removing last results, if any.
  this.resultsService_.setResults([]);

  // Clearing SQL query.
  this.scope_.sqlQuery = '';
};


/**
 * @return {!angular.$q.Promise}
 * @private
 */
QueryBuilderController.prototype.populateUi_ = function() {
  return this.http_.get('../data/column_domains.json').then(
      (function(response) {
        var domains = /** @type {!ColumnDomains_} */ (
            response.data);
        this.fromYears = domains.years;
        this.toYears = domains.years;
        this.cities = domains.cities;
        this.disciplines = domains.disciplines;
        this.countries = domains.countries;
        this.genders = domains.genders;
        this.colors = domains.colors;
        this.events = domains.events;
      }).bind(this));
};


/**
 * Searches the database based on the query built by the user.
 */
QueryBuilderController.prototype.search = function() {
  this.buildQuery_().then(function(query) {
    this.scope_.sqlQuery = query.toSql();
    return query.exec();
  }.bind(this)).then(function(results) {
    this.resultsService_.setResults(results);
  }.bind(this));
};


/**
 * @param {!MedalSchema_} medal
 * @return {?lf.Predicate}
 * @private
 */
QueryBuilderController.prototype.getPredicates_ = function(medal) {
  var predicates = [];

  if (this.scope_.countrySelection != this.unboundValue) {
    predicates.push(medal.country.eq(this.scope_.countrySelection));
  }

  if (this.scope_.colorSelection != this.unboundValue) {
    predicates.push(medal.color.eq(this.scope_.colorSelection));
  }

  if (this.scope_.citySelection != this.unboundValue) {
    predicates.push(medal.city.eq(this.scope_.citySelection));
  }

  if (this.scope_.genderSelection != this.unboundValue) {
    predicates.push(medal.gender.eq(this.scope_.genderSelection));
  }

  if (this.scope_.disciplineSelection != this.unboundValue) {
    predicates.push(medal.discipline.eq(this.scope_.disciplineSelection));
  }

  if (this.scope_.eventSelection != this.unboundValue) {
    predicates.push(medal.event.eq(this.scope_.eventSelection));
  }

  if (this.scope_.fromYearSelection != this.unboundValue &&
      this.scope_.toYearSelection != this.unboundValue) {
    var minYear = Math.min(
        this.scope_.fromYearSelection, this.scope_.toYearSelection);
    var maxYear = Math.max(
        this.scope_.fromYearSelection, this.scope_.toYearSelection);
    predicates.push(medal.year.between(minYear, maxYear));
  } else if (this.scope_.fromYearSelection != this.unboundValue) {
    predicates.push(medal.year.gte(this.scope_.fromYearSelection));
  } else if (this.scope_.toYearSelection != this.unboundValue) {
    predicates.push(medal.year.lte(this.scope_.toYearSelection));
  }

  return predicates.length > 0 ?
      lf.op.and.apply(null, predicates) :
      null;
};


/**
 * @return {!IThenable<!lf.query.SelectBuilder>}
 * @private
 */
QueryBuilderController.prototype.buildQuery_ = function() {
  return this.dbService_.get().then((function(db) {
    var medal = db.getSchema().table('Medal');
    var predicates = this.getPredicates_(medal);
    var query = predicates != null ?
        db.select().from(medal).where(predicates) :
        db.select().from(medal);
    return query;
  }).bind(this));
};



/**
 * @param {!ResultsService} resultsService
 *
 * @constructor
 */
var ResultsController = function(resultsService) {
  this.resultsService_ = resultsService;
};


/**
 * @return {!Array<!Object>}
 */
ResultsController.prototype.getResults = function() {
  return this.resultsService_.getResults();
};


function main() {
  var app = angular.module('myApp', []);
  app.service('DbService', DbService);
  app.service('ResultsService', ResultsService);
  app.controller(
      'ResultsController',
      ['ResultsService', ResultsController]);
  app.controller(
      'QueryBuilderController',
      ['$scope', '$http', 'DbService', 'ResultsService',
        QueryBuilderController]);
}
main();
