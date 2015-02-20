/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.provide('movie.db');
goog.provide('movie.db.schema.Actor');
goog.provide('movie.db.schema.Director');

goog.require('lf.Type');
goog.require('lf.schema');


/**
 * @return {!lf.schema.Builder}
 * @private
 */
movie.db.createSchema_ = function() {
  var ds = lf.schema.create('mvdb', 1);
  ds.createTable('Movie').
      addColumn('id', lf.Type.INTEGER).
      addColumn('title', lf.Type.STRING).
      addColumn('year', lf.Type.INTEGER).
      addColumn('rating', lf.Type.STRING).
      addColumn('company', lf.Type.STRING).
      addPrimaryKey(['id']);

  ds.createTable('Actor').
      addColumn('id', lf.Type.INTEGER).
      addColumn('lastName', lf.Type.STRING).
      addColumn('firstName', lf.Type.STRING).
      addColumn('sex', lf.Type.STRING).
      addColumn('dateOfBirth', lf.Type.DATE_TIME).
      addColumn('dateOfDeath', lf.Type.DATE_TIME).
      addPrimaryKey(['id']).
      addNullable(['dateOfDeath']);

  ds.createTable('Director').
      addColumn('id', lf.Type.INTEGER).
      addColumn('lastName', lf.Type.STRING).
      addColumn('firstName', lf.Type.STRING).
      addColumn('dateOfBirth', lf.Type.DATE_TIME).
      addColumn('dateOfDeath', lf.Type.DATE_TIME).
      addPrimaryKey(['id']).
      addNullable(['dateOfDeath']);

  ds.createTable('MovieGenre').
      addColumn('movieId', lf.Type.INTEGER).
      addColumn('genre', lf.Type.STRING).
      addForeignKey('fk_MovieId', 'movieId', 'Movie', 'id');

  ds.createTable('MovieDirector').
      addColumn('movieId', lf.Type.INTEGER).
      addColumn('directorId', lf.Type.INTEGER).
      addForeignKey('fk_MovieId', 'movieId', 'Movie', 'id').
      addForeignKey('fk_DirectorId', 'directorId', 'Director', 'id');

  ds.createTable('MovieActor').
      addColumn('movieId', lf.Type.INTEGER).
      addColumn('actorId', lf.Type.INTEGER).
      addColumn('role', lf.Type.STRING).
      addForeignKey('fk_MovieId', 'movieId', 'Movie', 'id').
      addForeignKey('fk_ActorId', 'actorId', 'Actor', 'id');

  return ds;
};


/** @return {!IThenable.<!lf.Database>} */
movie.db.connect = function() {
  return movie.db.createSchema_().connect();
};
