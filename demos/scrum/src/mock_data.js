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


/** @private */
var MockData_ = function() {};


/** @return {!Array<string>} */
MockData_.prototype.createPeople = function() {
  var FIRST_NAME = [
    'Alice', 'Bob', 'Cathy', 'Duke', 'Ellen',
    'Frank', 'Greg', 'Hanna', 'Irene', 'Jason'
  ];
  var LAST_NAME = [
    'Kim', 'Lin', 'Moore', 'North', 'Ono',
    'Patel', 'Quaker', 'Rosa', 'Soo', 'Tanen'
  ];
  var people = [];
  for (var i = 0; i < 10; ++i) {
    people.push({
      id: 'user' + i,
      lastName: LAST_NAME[i],
      firstName: FIRST_NAME[i]
    });
  }
  return people;
};


/** @return {!Array<string>} */
MockData_.prototype.createStates = function() {
  return ['Not Started', 'Working', 'Done'];
};


/** @return {!Array<!Object>} */
MockData_.prototype.createTasks = function() {
  var owners = this.createPeople();
  var states = this.createStates();
  var tasks = [];
  for (var i = 0; i < 100; ++i) {
    tasks.push({
      id: 'T' + i,
      desc: 'Perform task ' + i,
      pri: i % 5,
      owner: owners[Math.floor(i / owners.length)].id,
      state: states[i % (states.length - 1)],
      eta: new Date(new Date().getTime() + i * 86400000)
    });
  }
  return tasks;
};

var mockData = new MockData_();
