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


/**
 * The data model observed by UI.
 * @type {{count: number}}
 */
var model = {
  count: 0
};


/**
 * The parameter to query. UI will change the values. It will be observed by
 * the data layer and update the model above. So the two-way circular data
 * binding is:
 *
 *     +-> model -> UI -> range -> Data Layer -+
 *     +---------------------------------------+
 *
 * @type {{from: number, to: number}}
 */
var range = {
  from: 0,
  to: 0
};


var query;


// When the page loads.
$(function() {
  main().then(function() {
    // Simulate Controller/Model bindings.
    setUpBinding();

    // View Layer logic here.
    Object.observe(model, function(change) {
      $('#num_movies').text(model.count.toString());
    });

    populateDropdown('#from_year', 1992);
    $('#from_year').change(function(e) {
      range.from = parseInt(e.target.value, 10);
      populateDropdown('#to_year', range.from);
    });
    $('#to_year').change(function(e) {
      range.to = parseInt(e.target.value, 10);
    });
    $('#from_year').val('1992').change();
    $('#to_year').val('2003').change();
  });
});


function setUpBinding() {
  var movie = db.getSchema().table('Movie');
  query = db.select(lf.fn.count(movie.id).as('num')).
      from(movie).
      where(movie.year.between(lf.bind(0), lf.bind(1)));

  db.observe(query, function(changes) {
    model.count = changes[0].object[0]['num'];
  });

  Object.observe(range, function(changes) {
    query.bind([range.from, range.to]).exec();
  });
}


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
 * @param {string} id
 * @param {number} start
 */
function populateDropdown(id, start) {
  var oldVal = parseInt($(id).val(), 10);
  $(id).empty();
  for (var i = start; i <= 2003; ++i) {
    $(id).append($('<option>', {value: i}).text(i.toString()));
  }
  if (oldVal >= start && oldVal <= 2003) {
    $(id).val(oldVal.toString()).change();
  } else {
    $(id).val('2003').change();
  }
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
 * @param {!movie.db.schema.Actor|!movie.db.schema.Director} tableSchema The
 *     schema of the table corresponding to the data.
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
