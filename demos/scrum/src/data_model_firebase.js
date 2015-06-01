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



/** @constructor */
var DataModel = function() {
  this.db = null;
  this.observable = {notStarted: [], working: []};
  this.person = null;
  this.task = null;

  this.taskQuery_ = null;
  this.allQuery_ = null;
};


/**
 * @param {!Object} uiModel UI model to observe.
 * @return {!Promise}
 */
DataModel.prototype.init = function(uiModel) {
  return this.connect_().then(function() {
    var t = this.task;
    var p = this.person;
    this.taskQuery_ = this.db.select(
        t.id.as('id'),
        t.desc.as('desc'),
        t.pri.as('pri'),
        p.firstName.as('owner'),
        t.eta.as('eta')).
        from(t, p).
        where(lf.op.and(
            t.owner.in(lf.bind(0)),
            t.owner.eq(p.id),
            t.pri.in(lf.bind(1)),
            t.state.eq(lf.bind(2))));

    return this.db.select(lf.fn.count()).from(p).exec();
  }.bind(this)).then(function(results) {
    return (results[0]['COUNT(*)'] == 0) ? this.fillData_() : Promise.resolve();
  }.bind(this)).then(function() {
    this.allQuery_ = this.db.select().from(this.task, this.person);
    this.db.observe(this.allQuery_, function() {
      // When detected external changes, update whole UI.
      this.updateObservable_(uiModel);
    }.bind(this));
    Object.observe(uiModel, function() {
      this.updateObservable_(uiModel);
    }.bind(this));
    this.updateObservable_(uiModel);  // Provide initial update.
  }.bind(this));
};


/** @return {!Promise<!Array<string>>} */
DataModel.prototype.listPeople = function() {
  return this.db.select().from(this.person).exec().then(function(results) {
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
    // owner is in the form of First Last (id), and we want the id only.
    return /\(([^)]+)\)/.exec(owner)[1];
  });
  var pri = uiModel.priorities.map(function(s) {
    return parseInt(s, 10);
  });
  this.taskQuery_.bind([owners, pri, 'Not Started']).exec().then(
      function(results) {
        this.observable.notStarted = results;
        return this.taskQuery_.bind([owners, pri, 'Working']).exec();
      }.bind(this)).then(function(results) {
    this.observable.working = results;
  }.bind(this));
};


/** @private @return {!Promise} */
DataModel.prototype.connect_ = function() {
  var builder = lf.schema.create('scrum', 1);
  builder.createTable('person').
      addColumn('id', lf.Type.STRING).
      addColumn('lastName', lf.Type.STRING).
      addColumn('firstName', lf.Type.STRING).
      addPrimaryKey(['id']);
  builder.createTable('task').
      addColumn('id', lf.Type.STRING).
      addColumn('desc', lf.Type.STRING).
      addColumn('pri', lf.Type.INTEGER).
      addColumn('owner', lf.Type.STRING).
      addColumn('state', lf.Type.STRING).
      addColumn('eta', lf.Type.DATE_TIME).
      addPrimaryKey(['id']);

  return builder.connect({
    storeType: lf.schema.DataStoreType.FIREBASE,
    firebase: myFirebaseRef
  }).then(function(db) {
    this.db = db;
    this.person = db.getSchema().table('person');
    this.task = db.getSchema().table('task');
  }.bind(this));
};


/** @private @return {!Promise} */
DataModel.prototype.fillData_ = function() {
  var people = mockData.createPeople().map(function(object) {
    return this.person.createRow(object);
  }.bind(this));
  var tasks = mockData.createTasks().map(function(object) {
    return this.task.createRow(object);
  }.bind(this));
  var insertPeople = this.db.insert().into(this.person).values(people);
  var insertTasks = this.db.insert().into(this.task).values(tasks);
  return this.db.createTransaction().exec([insertPeople, insertTasks]);
};
