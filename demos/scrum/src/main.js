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

(function() {
  var dataModel = new DataModel();
  var uiModel = {};
  var filter = document.getElementById('filter');
  filter.uiModel = uiModel;
  filter.priorities = ['0', '1', '2', '3', '4'];
  uiModel.priorities = filter.priorities;

  dataModel.init(uiModel).then(function() {
    // Expose some key variables inside data model to window for demo purposes.
    window.dm = dataModel;
    window.db = dataModel.db;
    window.task = dataModel.task;
    window.person = dataModel.person;

    return dataModel.listPeople();
  }).then(function(people) {
    filter.owners = people;
    uiModel.owners = filter.owners;
  });

  var ns = document.getElementById('ns');
  var working = document.getElementById('working');
  Object.observe(dataModel.observable, function(changes) {
    changes.forEach(function(item) {
      if (item.name == 'notStarted') {
        ns.tasks = item.object.notStarted;
      } else {
        working.tasks = item.object.working;
      }
    });
  });
})();
