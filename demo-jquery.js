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


// The following two lines are here to make linter happy. They have no actual
// effects.
goog.require('lf.fn');
goog.require('lf.op');


/** @type {?movie.db.Database} */
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
  return movie.db.getInstance(
      /* opt_onUpgrade */ undefined,
      /* opt_volatile */ false).then(function(database) {
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
    insertPersonData('actor.json', db.getSchema().getActor()),
    insertPersonData('director.json', db.getSchema().getDirector()),
    insertData('movie.json', db.getSchema().getMovie()),
    insertData('movieactor.json', db.getSchema().getMovieActor()),
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
 * @param {!movie.db.schema.Actor|!movie.db.schema.Director} tableSchema The
 *     schema of the table corresponding to the data.
 * @return {!IThenable}
 */
function insertPersonData(filename, tableSchema) {
  return getSampleData(filename).then(
      function(data) {
        var rows = data.map(function(obj) {
          obj.dateOfBirth = convertDate(obj.dateOfBirth);
          obj.dateOfDeath = convertDate(obj.dateOfDeath);
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
  return /** @type {!IThenable} */ ($.getJSON('data/' + filename));
}


/**
 * @return {!IThenable.<boolean>} Whether the DB is already populated with
 * sample data.
 */
function checkForExistingData() {
  var movie = db.getSchema().getMovie();
  return db.select(lf.fn.count(movie.id)).from(movie).exec().then(
      function(rows) {
        return rows[0]['count(id)'] > 0;
      });
}


/**
 * Selects all movies.
 */
function selectAllMovies() {
  var movie = db.getSchema().getMovie();
  db.select(movie.id, movie.title, movie.year).
      from(movie).exec().then(
      function(results) {
        var elapsed = Date.now() - startTime;
        $('#load_time').text(elapsed.toString() + 'ms');
        $('#master').empty();
        $('#master').append(createTable(results, ['id', 'title', 'year']));
        var grid = $('#master').
            children([0]).
            addClass('display compact cell-border').
            dataTable();
        grid.$('tr').click(function() {
          var id = grid.fnGetData(this)[0];
          startTime = Date.now();
          generateDetails(id);
        });
      });
}


/**
 * Creates table.
 * @param {!Array.<!Object>} rows
 * @param {!Array.<string>} fields The fields to be displayed.
 * @return {string} The inner HTML created.
 */
function createTable(rows, fields) {
  var content = '<table><thead><tr>';
  fields.forEach(function(title) {
    content += '<td>' + title + '</td>';
  });
  content += '</tr></thead><tbody>';
  rows.forEach(function(row) {
    content += '<tr>';
    fields.forEach(function(field) {
      content += '<td>' + row[field].toString() + '</td>';
    });
    content += '</tr>';
  });

  return content;
}


/**
 * Display details results for selected movie.
 * @param {string} id
 */
function generateDetails(id) {
  var m = db.getSchema().getMovie();
  var ma = db.getSchema().getMovieActor();
  var md = db.getSchema().getMovieDirector();
  var a = db.getSchema().getActor();
  var d = db.getSchema().getDirector();

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
          where(ma.movieId.eq(id)).
          innerJoin(a, a.id.eq(ma.actorId)).
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
  var fields = ['title', 'year', 'rating', 'company', 'directors', 'actors'];
  var titles = fields.map(function(item) {
    return item.charAt(0).toUpperCase() + item.slice(1);
  });
  var content = '<table id="details_list"><tbody>';
  fields.forEach(function(item, i) {
    content += '<tr><td>' + titles[i] + '</td><td>' +
        details[item] + '</td></tr>';
  });
  content += '</tbody></table>';
  $('#slave').empty();
  $('#slave').append('<h2>Movie Details</h2>');
  $('#slave').append('<p>Query time: ' + elapsed.toString() + ' ms</p>');
  $('#slave').append(content);
  $('#details_list').addClass('display compact cell-border').dataTable();
}
