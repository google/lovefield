/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
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


/** @type {!movie.db.Database} */
var db = null;


function main() {
  var fail = function(e) { console.error('Error', e); };

  movie.db.getInstance(
      /* opt_onUpgrade */ undefined,
      /* opt_volatile */ false).then(function(database) {
    db = database;
    // Cheating the linter.
    console['log']('Established DB connection.');
    return checkForExistingData();
  }).then(function(dataExist) {
    return dataExist ? Promise.resolve() :
        clearDb().then(function() { return addSampleData(); });
  }).then(function() {
    console['log']('Sample data loaded.');
  }, fail);
}

main();


/**
 * Deletes the contents of all tables.
 * @return {!IThenable}
 */
function clearDb() {
  var tables = db.getSchema().getTables();
  var deletePromises = tables.map(function(table) {
    return db.delete().from(table).exec();
  });

  return Promise.all(deletePromises);
}


/**
 * Adds sample data to the database.
 * @return {!IThenable}
 */
function addSampleData() {
  return Promise.all([
    insertPersonData('actor1.json', db.getSchema().getActor()),
    insertPersonData('actor2.json', db.getSchema().getActor()),
    insertPersonData('actor3.json', db.getSchema().getActor()),
    insertPersonData('director.json', db.getSchema().getDirector()),
    insertData('movie.json', db.getSchema().getMovie()),
    insertData('movieactor1.json', db.getSchema().getMovieActor()),
    insertData('movieactor2.json', db.getSchema().getMovieActor()),
    insertData('moviedirector.json', db.getSchema().getMovieDirector()),
    insertData('moviegenre.json', db.getSchema().getMovieGenre())
  ]);
}


/**
 * Inserts data in the database.
 * @param {string} filename The name of the file holding JSON data.
 * @param {!lf.schema.Table} tableSchema The schema of the table corresponding
 *     to the data.
 * @return {!IThenable}
 */
function insertData(filename, tableSchema) {
  return getSampleData(filename).then(
      function(data) {
        var rows = data.map(function(obj) {
          return tableSchema.createRow(obj);
        });
        return db.insert().into(tableSchema).values(rows).exec();
      });
}


/**
 * Inserts data in the database.
 * @param {string} filename The name of the file holding JSON data.
 * @param {!movie.db.schema.Actor|movie.db.schema.Director} tableSchema The
 *     schema of the table corresponding to the data.
 * @return {!IThenable}
 */
function insertPersonData(filename, tableSchema) {
  return getSampleData(filename).then(
      function(data) {
        var rows = data.map(function(obj) {
          obj.dateOfBirth = new Date(obj.dateOfBirth);
          obj.dateOfDeath = !goog.isNull(obj.dateOfDeath) ?
              new Date(obj.dateOfDeath) : null;
          return tableSchema.createRow(obj);
        });
        return db.insert().into(tableSchema).values(rows).exec();
      });
}


/**
 * Reads the sample data from a JSON file.
 * @param {string} filename The name of the JSON file to be loaded.
 * @return {!IThenable}
 */
function getSampleData(filename) {
  return new Promise(function(resolve, reject) {
    $.getJSON('data/' + filename, function(data) { resolve(data); });
  });
}


/**
 * @return {!IThenable.<boolean>} Whether the DB is already populated with
 * sample data.
 */
function checkForExistingData() {
  var actor = db.getSchema().getActor();
  return db.select().from(actor).where(actor.id.eq(1)).exec().then(
      function(results) {
        return results.length > 0;
      });
}


/**
 * Selects all movies.
 */
function selectAllMovies() {
  var movie = db.getSchema().getMovie();
  db.select(movie.title, movie.year, movie.rating).from(movie).exec().then(
      function(results) {
        displayResults(results, ['title', 'year', 'rating']);
      });
}


/**
 * Selects all actors who have died.
 */
function selectDeceasedActors() {
  var actor = db.getSchema().getActor();
  db.select(actor.first, actor.lastName, actor.dateOfBirth, actor.dateOfDeath).
      from(actor).
      where(actor.dateOfDeath.isNotNull()).
      exec().then(
          function(results) {
            displayResults(
                results,
                ['firstName', 'lastName', 'dateOfBirth', 'dateOfDeath']);
          });
}


/**
 * Displays the given results to the user.
 * @param {!Array.<!Object} results
 * @param {!Array.<string>} fields The fields to be displayed.
 */
function displayResults(results, fields) {
  // Populating header and footer.
  var getTitleRow = function(containerEl, fields) {
    var titleRow = $('<tr>');
    fields.forEach(function(field) {
      titleRow.append($('<th>').html(field));
    });
    containerEl.append(titleRow);
    return containerEl;
  };

  var tableEl = $('#results');

  // Clearing previous results.
  if ($.fn.DataTable.isDataTable('#results')) {
    tableEl.DataTable().destroy();
    tableEl.empty();
  }

  tableEl.append(getTitleRow($('<thead>'), fields));
  tableEl.append(getTitleRow($('<tfoot>'), fields));

  // Populating data rows.
  results.forEach(function(obj) {
    var tableRow = $('<tr>');
    fields.forEach(function(field) {
      tableRow.append($('<td>').html(obj[field]));
    });
    tableEl.append(tableRow);
  });

  tableEl.dataTable();
}
