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



/** @constructor */
var Resolver = function() {
  /** @type {!Function} */
  this.resolve;

  /** @type {!Function} */
  this.reject;

  /** @type {!Promise} */
  this.promise = new Promise((function(res, rej) {
    this.resolve = res;
    this.reject = rej;
  }).bind(this));
};


/** @type {number} */
var startTime;


/** @type {IDBDatabase} */
var db = null;


/** @enum {string} */
var TABLE = {
  ACTOR: 'actor',
  DIRECTOR: 'director',
  MOVIE: 'movie',
  MOVIE_ACTOR: 'movieactor',
  MOVIE_DIRECTOR: 'moviedirector',
  MOVIE_GENRE: 'moviegenre'
};

// When the page loads.
$(function() {
  startTime = Date.now();
  main().then(function() {
    selectAllMovies();
  });
});


function openDb() {
  var resolver = new Resolver();
  var req = window.indexedDB.open('mvidb');
  req.onsuccess = function(ev) {
    resolver.resolve(ev.target.result);
  };
  req.onerror = function(e) {
    resolver.reject(e);
  };
  req.onupgradeneeded = function(ev) {
    var rawDb = ev.target.result;
    rawDb.createObjectStore(TABLE.MOVIE, { keyPath: 'id' });
    rawDb.createObjectStore(TABLE.ACTOR, { keyPath: 'id' });
    rawDb.createObjectStore(TABLE.DIRECTOR, { keyPath: 'id' });
    var ma = rawDb.createObjectStore(
        TABLE.MOVIE_ACTOR, { autoIncrement: true });
    ma.createIndex('movieId', 'movieId', { unique: false });
    ma.createIndex('actorId', 'actorId', { unique: false });
    var md = rawDb.createObjectStore(
        TABLE.MOVIE_DIRECTOR, { autoIncrement: true });
    md.createIndex('movieId', 'movieId', { unique: false });
    md.createIndex('directorId', 'directorId', { unique: false });
    var mg = rawDb.createObjectStore(
        TABLE.MOVIE_GENRE, { autoIncrement: true});
    mg.createIndex('movieId', 'movieId', { unique: false });
  };
  return resolver.promise;
}

function main() {
  return openDb().then(function(database) {
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
    insertPersonData('actor.json', TABLE.ACTOR),
    insertPersonData('director.json', TABLE.DIRECTOR),
    insertData('movie.json', TABLE.MOVIE),
    insertData('movieactor.json', TABLE.MOVIE_ACTOR),
    insertData('moviedirector.json', TABLE.MOVIE_DIRECTOR),
    insertData('moviegenre.json', TABLE.MOVIE_GENRE)
  ]);
}


/**
 * Inserts data in the database.
 * @param {string} fileName The name of the file holding JSON data.
 * @param {string} tableName The name of the table.
 * @return {!IThenable}
 */
function insertData(fileName, tableName) {
  return getSampleData(fileName).then(
      function(data) {
        var resolver = new Resolver();
        var tx = db.transaction([tableName], 'readwrite');
        tx.oncomplete = function() {
          resolver.resolve();
        };
        tx.onerror = function(e) {
          resolver.reject();
        };

        var store = tx.objectStore(tableName);
        for (var i = 0; i < data.length; ++i) {
          store.put(data[i]);
        }
        return resolver.promise;
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
 * @param {string} fileName The name of the file holding JSON data.
 * @param {string} tableName The name of table.
 * @return {!IThenable}
 */
function insertPersonData(fileName, tableName) {
  return getSampleData(fileName).then(
      function(data) {
        var resolver = new Resolver();
        var tx = db.transaction([tableName], 'readwrite');
        tx.oncomplete = function() {
          resolver.resolve();
        };
        tx.onerror = function(e) {
          resolver.reject();
        };

        var store = tx.objectStore(tableName);
        data.forEach(function(obj) {
          obj.dateOfBirth = convertDate(obj.dateOfBirth);
          obj.dateOfDeath = convertDate(obj.dateOfDeath);
          store.put(obj);
        });
        return resolver.promise;
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
  var resolver = new Resolver();
  var tx = db.transaction([TABLE.MOVIE]);
  var store = tx.objectStore(TABLE.MOVIE);
  var req = store.count();
  req.onsuccess = function(ev) {
    resolver.resolve(ev.result > 0);
  };
  req.onerror = function(e) {
    resolver.reject(e);
  };
  return resolver.promise;
}


/**
 * Selects all movies.
 */
function selectAllMovies() {
  var tx = db.transaction([TABLE.MOVIE]);
  var store = tx.objectStore(TABLE.MOVIE);
  var index = store.openCursor();
  var results = [];
  index.onsuccess = function(ev) {
    var cursor = ev.target.result;
    if (cursor) {
      results.push(cursor.value);
      cursor.continue();
    } else {
      var elapsed = Date.now() - startTime;
      $('#load_time').text(elapsed.toString() + 'ms');
      $('#master').bootstrapTable('load', results).
          on('click-row.bs.table', function(e, row, $element) {
            startTime = Date.now();
            generateDetails(row.id);
          });
    }
  };
}


/**
 * Display details results for selected movie.
 * @param {string} id
 */
function generateDetails(id) {
  var resolvers = [new Resolver(), new Resolver(), new Resolver()];
  var promises = resolvers.map(function(resolver) {
    return resolver.promise;
  });

  var tx = db.transaction([TABLE.MOVIE]);
  var movie = tx.objectStore(TABLE.MOVIE);
  var req = movie.openCursor(IDBKeyRange.only(id));
  var details = {};
  req.onsuccess = function(ev) {
    var value = ev.target.result.value;
    details['title'] = value['title'];
    details['year'] = value['year'];
    details['rating'] = value['rating'];
    details['company'] = value['company'];
    resolvers[0].resolve();
  };
  req.onerror = function(e) {
    resolvers[0].reject(e);
  };

  /**
   * @param {string} relationTable Name of the relation table.
   * @param {string} table Either Actor or Director.
   * @param {string} field Index field of relation.
   * @param {!function(string)} callback
   * @param {!function(*)} errback
   */
  var getPeople = function(relationTable, table, field, callback, errback) {
    var tx2 = db.transaction([relationTable, table]);
    var relation = tx2.objectStore(relationTable);
    var maIndex = relation.index('movieId');
    var req2 = maIndex.openCursor(IDBKeyRange.only(id));
    var ids = [];
    req2.onsuccess = function(ev) {
      var cursor = ev.target.result;
      if (cursor) {
        ids.push(cursor.value[field]);
        cursor.continue();
      } else {
        if (ids.length) {
          ids = ids.sort();
          var data = tx2.objectStore(table);
          var req3 = data.openCursor(
              IDBKeyRange.bound(ids[0], ids[ids.length - 1]));
          var results = [];
          req3.onsuccess = function(ev) {
            var cursor2 = ev.target.result;
            if (cursor2) {
              var value = cursor2.value;
              // Can use binary search here.
              if (ids.indexOf(value['id']) != -1) {
                results.push(value);
              }
              cursor2.continue();
            } else {
              // Sort by last name
              results = results.sort(function(lhs, rhs) {
                return lhs['lastName'] < rhs['lastName'] ? -1 :
                    (lhs['lastName'] > rhs['lastName'] ? 1 : 0);
              });
              callback(results.map(function(person) {
                return person['lastName'] + ', ' + person['firstName'];
              }).join('<br/>'));
            }
          };
          req3.onerror = function(e) {
            errback(e);
          };
        }
      }
    };
    req2.onerror = function(e) {
      errback(e);
    };
  };

  getPeople(TABLE.MOVIE_ACTOR, TABLE.ACTOR, 'actorId',
      function(result) {
        details['actors'] = result;
        resolvers[1].resolve();
      }, function(e) {
        resolvers[1].reject(e);
      });
  getPeople(TABLE.MOVIE_DIRECTOR, TABLE.DIRECTOR, 'directorId',
      function(result) {
        details['directors'] = result;
        resolvers[2].resolve();
      }, function(e) {
        resolvers[2].reject(e);
      });

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
