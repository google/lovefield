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
 *
 * @fileoverview This is the IndexedDB-equivalent data model. Just replace the
 * <script src="src/data_model.js"> in index.html file with this one to see it
 * in action. This data model does not support DB change observation.
 */



/** @constructor */
var DataModel = function() {
  this.observable = {notStarted: [], working: []};

  this.db_ = null;
};


/**
 * @param {!Object} uiModel UI model to observe.
 * @return {!Promise}
 */
DataModel.prototype.init = function(uiModel) {
  return this.connect_().then(function() {
    return this.checkData_();
  }.bind(this)).then(function() {
    Object.observe(uiModel, function() {
      this.updateObservable_(uiModel);
    }.bind(this));
    this.updateObservable_(uiModel);  // Provide initial update.
  }.bind(this));
};


/** @private @return {!Promise<!Array<!Object>>} */
DataModel.prototype.listPeopleInternal_ = function() {
  return new Promise(function(resolve, reject) {
    var tx = this.db_.transaction('person', 'readonly');
    var person = tx.objectStore('person');
    var req = person.openCursor();
    var results = [];
    req.onsuccess = function(ev) {
      var cursor = ev.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = reject;
  }.bind(this));
};


/** @return {!Promise<!Array<string>>} */
DataModel.prototype.listPeople = function() {
  return this.listPeopleInternal_().then(function(results) {
    return results.map(function(row) {
      return row.firstName + ' ' + row.lastName + ' (' + row.id + ')';
    });
  });
};


/**
 * @param {!Object} uiModel The ui selection for updating query results.
 * @private
 */
DataModel.prototype.updateObservable_ = function(uiModel) {
  if (!uiModel.owners || !uiModel.priorities) {
    return;  // Still initializing.
  }

  var owners = uiModel.owners.map(function(owner) {
    return /\(([^)]+)\)/.exec(owner)[1];
  });
  var pri = uiModel.priorities.map(function(s) {
    return parseInt(s, 10);
  });

  this.listPeopleInternal_().then(function(results) {
    var people = {};
    results.forEach(function(person) {
      people[person.id] = person.firstName;
    });
    var tx = this.db_.transaction(['task'], 'readonly');
    var task = tx.objectStore('task');
    var req = task.openCursor();
    var notStarted = [];
    var working = [];
    req.onsuccess = (function(ev) {
      var cursor = ev.target.result;
      if (cursor) {
        var t = cursor.value;
        if (owners.indexOf(t.owner) != -1 && pri.indexOf(t.pri) != -1) {
          var target = (t.state == 'Working') ? working :
              (t.state == 'Not Started') ? notStarted :
              null;
          if (target) {
            target.push({
              id: t.id,
              desc: t.desc,
              pri: t.pri,
              owner: people[t.owner],
              eta: new Date(t.eta)
            });
          }
        }
        cursor.continue();
      } else {
        this.observable.working = working;
        this.observable.notStarted = notStarted;
      }
    }.bind(this));
  }.bind(this));
};


/** @private @return {!Promise} */
DataModel.prototype.connect_ = function() {
  return new Promise(function(resolve, reject) {
    var req = window.indexedDB.open('scrum-idb', 1);
    req.onsuccess = (function(ev) {
      this.db_ = ev.target.result;
      resolve();
    }.bind(this));
    req.onerror = reject;
    req.onupgradeneeded = function(ev) {
      var rawDb = ev.target.result;
      rawDb.createObjectStore('person', { keyPath: 'id' });
      rawDb.createObjectStore('task', { keyPath: 'id' });
    };
  }.bind(this));
};


/** @private @return {!Promise} */
DataModel.prototype.checkData_ = function() {
  return new Promise(function(resolve, reject) {
    var tx = this.db_.transaction(['person'], 'readonly');
    var person = tx.objectStore('person');
    var countReq = person.count();
    countReq.onsuccess = (function() {
      resolve((countReq.result != 0) ? Promise.resolve() : this.fillData_());
    }.bind(this));
    countReq.onerror = reject;
  }.bind(this));
};


/** @private @return {!Promise} */
DataModel.prototype.fillData_ = function() {
  return new Promise(function(resolve, reject) {
    var tx = this.db_.transaction(['person', 'task'], 'readwrite');
    tx.oncomplete = resolve;
    tx.onerror = reject;

    var person = tx.objectStore('person');
    var task = tx.objectStore('task');

    // Ignore individual req for the put() below.
    mockData.createPeople().forEach(function(row) {
      person.put(row);
    });
    mockData.createTasks().forEach(function(object) {
      // IndexedDB cannot put in Date objects directly.
      task.put({
        id: object.id,
        desc: object.desc,
        pri: object.pri,
        owner: object.owner,
        state: object.state,
        eta: object.eta.getTime()
      });
    });
  }.bind(this));
};
