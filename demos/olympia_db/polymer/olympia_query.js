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

  var db;

  function buildSchema() {
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
        addIndex('idx_year', ['year']).
        addIndex('idx_lastName', ['lastName']);
    return schemaBuilder;
  }

  function checkForExistingData_() {
    var medal = db.getSchema().table('Medal');
    return db.select().from(medal).exec().then(
        function(rows) {
          return rows.length > 0;
        });
  }

  function insertData_() {
    var medal = db.getSchema().table('Medal');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '../data/olympic_medalists.json');
    xhr.send();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var response = JSON.parse(xhr.responseText);
        var rows = response.map(function(obj) {
          return medal.createRow(obj);
        });
        return db.insert().into(medal).values(rows).exec();
      }
    }.bind(this);
  }

  function init_() {
    return buildSchema().connect().then((function(database) {
      db = database;
      window.db = database;
      return checkForExistingData_();
    })).then((function(dataExist) {
      return dataExist ? Promise.resolve() : insertData_();
    }));
  }

  Polymer('olympia-query', {
    initialized: false,
    publish: {
      limit: 100,
      cities: null,
      fromYear: null,
      toYear: null,
      countries: null,
      disciplines: null,
      events: null,
      genders: null,
      colors: null
    },
    created: function() {
      if (!db) {
        init_().then(function() {
          this.initialized = true;
        }.bind(this));
      }
    },
    getQuery: function() {
      var medal = db.getSchema().table('Medal');
      var predicates = [];

      if (this.countries) {
        predicates.push(medal.country.eq(this.countries));
      }

      if (this.colors) {
        predicates.push(medal.color.eq(this.colors));
      }

      if (this.cities) {
        predicates.push(medal.city.eq(this.cities));
      }

      if (this.genders) {
        predicates.push(medal.gender.eq(this.genders));
      }

      if (this.disciplines) {
        predicates.push(medal.discipline.eq(this.disciplines));
      }

      if (this.events) {
        predicates.push(medal.event.eq(this.events));
      }

      if (this.fromYear && this.toYear) {
        var minYear = Math.min(this.fromYear, this.toYear);
        var maxYear = Math.max(this.fromYear, this.toYear);
        predicates.push(medal.year.between(minYear, maxYear));
      } else if (this.fromYear) {
        predicates.push(medal.year.gte(this.fromYear));
      } else if (this.toYear) {
        predicates.push(medal.year.lte(this.toYear));
      }

      var composite = predicates.length > 0 ?
          lf.op.and.apply(null, predicates) :
          null;

      return db.select().from(medal).limit(this.limit).where(composite);
    },

    search: function() {
      this.getQuery().exec().then(function(results) {
        this.results = results;
      }.bind(this));
    }
  });

})();
