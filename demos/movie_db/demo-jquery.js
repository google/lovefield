/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
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


/** @type {?lf.Database} */
var db = null;


/** @type {number} */
var startTime;


// When the page loads.
$(function() {
  startTime = Date.now();
  main().then(function() {
    selectAllMovies();
  });
});


function main() {
  return movie.db.getSchemaBuilder().connect({
    storeType: lf.schema.DataStoreType.INDEXED_DB
  }).then(function(database) {
    db = database;
    return checkForExistingData();
  }).then(function(dataExist) {
    return dataExist ? Promise.resolve() : addSampleData();
  });
}


/**
 * Adds sample data to the database.
 * @return {!IThenable}
 */
function addSampleData() {
  return Promise.all([
    insertPersonData('actor.json', db.getSchema().table('Actor')),
    insertPersonData('director.json', db.getSchema().table('Director')),
    insertData('movie.json', db.getSchema().table('Movie')),
    insertData('movieactor.json', db.getSchema().table('MovieActor')),
    insertData('moviedirector.json', db.getSchema().table('MovieDirector')),
    insertData('moviegenre.json', db.getSchema().table('MovieGenre'))
  ]).then(function(queries) {
    var tx = db.createTransaction();
    return tx.exec(queries);
  });
}


/**
 * Inserts data in the database.
 * @param {string} filename The name of the file holding JSON data.
 * @param {!lf.schema.Table} tableSchema The schema of the table corresponding
 *     to the data.
 * @return {!IThenable<!lf.query.Insert>}
 */
function insertData(filename, tableSchema) {
  return getSampleData(filename).then(
      function(data) {
        var rows = data.map(function(obj) {
          return tableSchema.createRow(obj);
        });
        return db.insert().into(tableSchema).values(rows);
      });
}


/**
 * @param {string} rawDate Date in YYYYMMDD number format.
 * @return {?Date}
 */
function convertDate(rawDate) {
  if (rawDate.length == 0) {
    return null;
  }
  var date = parseInt(rawDate, 10);
  var year = Math.round(date / 10000);
  var month = Math.round((date / 100) % 100 - 1);
  var day = Math.round(date % 100);
  return new Date(year, month, day);
}


/**
 * Inserts data in the database.
 * @param {string} filename The name of the file holding JSON data.
 * @param {!lf.schema.Table} tableSchema The schema of the table
 *     corresponding to the data.
 * @return {!IThenable<!lf.query.Insert>}
 */
function insertPersonData(filename, tableSchema) {
  return getSampleData(filename).then(
      function(data) {
        var rows = data.map(function(obj) {
          obj.dateOfBirth = convertDate(obj.dateOfBirth);
          obj.dateOfDeath = convertDate(obj.dateOfDeath);
          return tableSchema.createRow(obj);
        });
        return db.insert().into(tableSchema).values(rows);
      });
}


/**
 * Reads the sample data from a JSON file.
 * @param {string} filename The name of the JSON file to be loaded.
 * @return {!IThenable}
 */
function getSampleData(filename) {
  return /** @type {!IThenable} */ ($.getJSON('data/' + filename));
}


/**
 * @return {!IThenable.<boolean>} Whether the DB is already populated with
 * sample data.
 */
function checkForExistingData() {
  var movie = db.getSchema().table('Movie');
  var column = lf.fn.count(movie.id);
  return db.select(column).from(movie).exec().then(
      function(rows) {
        return rows[0][column.getName()] > 0;
      });
}


/**
 * Selects all movies.
 */
function selectAllMovies() {
  var movie = db.getSchema().table('Movie');
  db.select(movie.id, movie.title, movie.year).
      from(movie).exec().then(
      function(results) {
        var elapsed = Date.now() - startTime;
        $('#load_time').text(elapsed.toString() + 'ms');
        $('#master').bootstrapTable('load', results).
            on('click-row.bs.table', function(e, row, $element) {
              startTime = Date.now();
              generateDetails(row.id);
            });
      });
}


/**
 * Display details results for selected movie.
 * @param {string} id
 */
function generateDetails(id) {
  var m = db.getSchema().table('Movie');
  var ma = db.getSchema().table('MovieActor');
  var md = db.getSchema().table('MovieDirector');
  var a = db.getSchema().table('Actor');
  var d = db.getSchema().table('Director');

  var details = {};
  var promises = [];
  promises.push(
      db.select().
          from(m).
          where(m.id.eq(id)).
          exec().
          then(function(rows) {
            details['title'] = rows[0]['title'];
            details['year'] = rows[0]['year'];
            details['rating'] = rows[0]['rating'];
            details['company'] = rows[0]['company'];
          }));
  promises.push(
      db.select().
          from(ma).
          innerJoin(a, a.id.eq(ma.actorId)).
          where(ma.movieId.eq(id)).
          orderBy(a.lastName).
          exec().then(function(rows) {
            details['actors'] = rows.map(function(row) {
              return row['Actor']['lastName'] + ', ' +
                  row['Actor']['firstName'];
            }).join('<br/>');
          }));
  promises.push(
      db.select().
          from(md, d).
          where(lf.op.and(md.movieId.eq(id), d.id.eq(md.directorId))).
          orderBy(d.lastName).
          exec().then(function(rows) {
            details['directors'] = rows.map(function(row) {
              return row['Director']['lastName'] + ', ' +
                  row['Director']['firstName'];
            }).join('<br/>');
          }));
  Promise.all(promises).then(function() {
    displayDetails(details);
  });
}


/**
 * @param {!Object} details
 */
function displayDetails(details) {
  var elapsed = Date.now() - startTime;
  $('#slave p').first().text('Query time: ' + elapsed.toString() + ' ms');

  var bootstrapData = Object.keys(details).map(
      function(key) {
        return {key: key, value: details[key]};
      });
  $('#slave table').bootstrapTable('load', bootstrapData);
}
