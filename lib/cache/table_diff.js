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
goog.provide('lf.cache.TableDiff');

goog.require('goog.asserts');
/** @suppress {extraRequire} */
goog.require('lf.cache.Modification');
goog.require('lf.structs.map');

goog.forwardDeclare('lf.Row');



/**
 * A class representing a set of changes on the contents of a given table. It
 * contains all necessary information needed to be able to reverse those changes
 * after they have been applied.
 *
 * @constructor
 * @struct
 *
 * @param {string} name Table name.
 */
lf.cache.TableDiff = function(name) {
  /** @private {!lf.structs.Map<number, !lf.Row>} */
  this.added_ = lf.structs.map.create();

  /** @private {!lf.structs.Map<number, !lf.cache.Modification>} */
  this.modified_ = lf.structs.map.create();

  /** @private {!lf.structs.Map<number, !lf.Row>} */
  this.deleted_ = lf.structs.map.create();

  /** @private {string} */
  this.name_ = name;
};


/** @return {string} */
lf.cache.TableDiff.prototype.getName = function() {
  return this.name_;
};


/** @return {!lf.structs.Map<number, !lf.Row>} */
lf.cache.TableDiff.prototype.getAdded = function() {
  return this.added_;
};


/** @return {!lf.structs.Map<number, !lf.cache.Modification>} */
lf.cache.TableDiff.prototype.getModified = function() {
  return this.modified_;
};


/** @return {!lf.structs.Map<number, !lf.Row>} */
lf.cache.TableDiff.prototype.getDeleted = function() {
  return this.deleted_;
};


/**
 * @param {!lf.Row} row The row that was inserted.
 */
lf.cache.TableDiff.prototype.add = function(row) {
  if (this.deleted_.has(row.id())) {
    var modification = [this.deleted_.get(row.id()), row];
    this.modified_.set(row.id(), modification);
    this.deleted_.delete(row.id());
  } else {
    this.added_.set(row.id(), row);
  }
};


/**
 * @param {!lf.cache.Modification} modification The old and new values
 *     of the modified row.
 */
lf.cache.TableDiff.prototype.modify = function(modification) {
  var oldValue = modification[0];
  var newValue = modification[1];
  goog.asserts.assert(
      oldValue.id() == newValue.id(),
      'Row ID mismatch between old/new values.');
  var id = oldValue.id();

  if (this.added_.has(id)) {
    this.added_.set(id, newValue);
  } else if (this.modified_.has(id)) {
    var overallModification = [
      this.modified_.get(modification[0].id())[0],
      newValue
    ];
    this.modified_.set(id, overallModification);
  } else {
    this.modified_.set(id, modification);
  }
};


/**
 * @param {!lf.Row} row The row that was deleted.
 */
lf.cache.TableDiff.prototype.delete = function(row) {
  if (this.added_.has(row.id())) {
    this.added_.delete(row.id());
  } else if (this.modified_.has(row.id())) {
    var originalRow = this.modified_.get(row.id())[0];
    this.modified_.delete(row.id());
    this.deleted_.set(row.id(), originalRow);
  } else {
    this.deleted_.set(row.id(), row);
  }
};


/**
 * Merges another diff into this one.
 * @param {!lf.cache.TableDiff} other The diff to be merged.
 */
lf.cache.TableDiff.prototype.merge = function(other) {
  other.added_.forEach(
      /** @this {!lf.cache.TableDiff} */
      function(row, rowId) {
        this.add(row);
      }, this);
  other.modified_.forEach(
      /** @this {!lf.cache.TableDiff} */
      function(modification, rowId) {
        this.modify(modification);
      }, this);
  other.deleted_.forEach(
      /** @this {!lf.cache.TableDiff} */
      function(row, rowId) {
        this.delete(row);
      }, this);
};


/**
 * Transforms each changes included in this diff (insertion, modification,
 * deletion) as a pair of before and after values.
 * Example addition:     [null, rowValue]
 * Example modification: [oldRowValue, newRowValue]
 * Example deletion      [oldRowValue, null]
 * @return {!Array<!lf.cache.Modification>} An array of all changes expressed as
 *     before and after pairs.
 */
lf.cache.TableDiff.prototype.getAsModifications = function() {
  var modifications = [];

  this.added_.forEach(function(row, id) {
    modifications.push([/* then */ null, /* now */ row]);
  });
  this.modified_.forEach(function(modification, id) {
    modifications.push(modification);
  });
  this.deleted_.forEach(function(row, id) {
    modifications.push([/* then */ row, /* now */ null]);
  });

  return modifications;
};


/** @override */
lf.cache.TableDiff.prototype.toString = function() {
  return '[' + lf.structs.map.keys(this.added_).toString() + '], ' +
      '[' + lf.structs.map.keys(this.modified_).toString() + '], ' +
      '[' + lf.structs.map.keys(this.deleted_).toString() + ']';
};


/**
 * Reverses this set of changes. Useful for reverting changes after they have
 * been applied.
 * @return {!lf.cache.TableDiff} The reverse diff.
 */
lf.cache.TableDiff.prototype.getReverse = function() {
  var reverseDiff = new lf.cache.TableDiff(this.name_);

  this.added_.forEach(function(row, id) {
    reverseDiff.delete(row);
  });
  this.deleted_.forEach(function(row, id) {
    reverseDiff.add(row);
  });
  this.modified_.forEach(function(modification, id) {
    reverseDiff.modify([modification[1], modification[0]]);
  });

  return reverseDiff;
};


/** @return {boolean} */
lf.cache.TableDiff.prototype.isEmpty = function() {
  return this.added_.size == 0 &&
      this.deleted_.size == 0 &&
      this.modified_.size == 0;
};
