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
goog.provide('lf.schema');
goog.provide('lf.schema.Builder');
goog.provide('lf.schema.DatabaseSchema');

goog.require('lf.Exception');
goog.require('lf.Global');
goog.require('lf.proc.Database');
goog.require('lf.schema.Database');
goog.require('lf.schema.Info');
goog.require('lf.schema.TableBuilder');
goog.require('lf.service');
goog.require('lf.service.ServiceId');
goog.require('lf.structs.map');
goog.require('lf.structs.set');



/**
 * Dynamic DB builder.
 * @constructor @struct
 *
 * @param {string} dbName
 * @param {number} dbVersion
 * @export
 */
lf.schema.Builder = function(dbName, dbVersion) {
  /** @private {!lf.schema.DatabaseSchema} */
  this.schema_ = new lf.schema.DatabaseSchema(dbName, dbVersion);

  /** @private {!lf.structs.Map<string, !lf.schema.TableBuilder>} */
  this.tableBuilders_ = lf.structs.map.create();

  /** @private {boolean} */
  this.finalized_ = false;

  /** @private {?lf.proc.Database} */
  this.db_ = null;
};


/**
 * Performs foreign key checks like validity of names of parent and
 * child columns, matching of types and uniqueness of referred column
 * in the parent.
 * @param {!lf.schema.TableBuilder} builder The table builder on which
 *     foreign key checks are to be performed.
 * @private
 */
lf.schema.Builder.prototype.checkForeignKeyValidity_ = function(builder) {
  var fkSpecArray = builder.getFkSpecs();
  fkSpecArray.forEach(function(specs) {
    var parentTableName = specs.parentTable;
    if (!this.tableBuilders_.has(parentTableName)) {
      // 536: Foreign key {0} refers to invalid table.
      throw new lf.Exception(536, specs.name);
    }
    var table = this.tableBuilders_.get(parentTableName);
    var parentSchema = table.getSchema();
    var parentColName = specs.parentColumn;
    if (!parentSchema.hasOwnProperty(parentColName)) {
      // 537: Foreign key {0} refers to invalid column.
      throw new lf.Exception(537, specs.name);
    }

    var localSchema = builder.getSchema();
    var localColName = specs.childColumn;
    if (localSchema[localColName].getType() !=
        parentSchema[parentColName].getType()) {
      // 538: Foreign key {0} column type mismatch.
      throw new lf.Exception(538, specs.name);
    }
    if (!parentSchema[parentColName].isUnique()) {
      // 539: Foreign key {0} refers to non-unique column.
      throw new lf.Exception(539, specs.name);
    }
  },this);

};


/**
 * Performs checks to avoid chains of foreign keys on same column.
 * @param {!lf.schema.TableBuilder} builder The table on which the check
 *     is to be performed.
 * @private
 **/
lf.schema.Builder.prototype.checkForeignKeyChain_ = function(builder) {
  var fkSpecArray = builder.getFkSpecs();
  fkSpecArray.forEach(function(specs) {
    var parentBuilder = this.tableBuilders_.get(specs.parentTable);
    parentBuilder.getFkSpecs().forEach(function(parentSpecs) {
      if (parentSpecs.childColumn == specs.parentColumn) {
        // 534: Foreign key {0} refers to source column of another foreign key.
        throw new lf.Exception(534, specs.name);
      }
    }, this);
  }, this);
};


/** @private */
lf.schema.Builder.prototype.finalize_ = function() {
  if (!this.finalized_) {
    this.tableBuilders_.forEach(function(builder, name) {
      this.checkForeignKeyValidity_(builder);
      this.schema_.setTable(builder.getSchema());
    }, this);
    lf.structs.map.values(this.tableBuilders_).forEach(
        this.checkForeignKeyChain_, this);
    this.checkFkCycle_();
    this.tableBuilders_.clear();
    this.finalized_ = true;
  }
};


/**
 * Checks for loop in the graph recursively. Ignores self loops.
 * This algorithm is based on Lemma 22.11 in "Introduction To Algorithms
 * 3rd Edition By Cormen et Al". It says that a directed graph G
 * can be acyclic if and only DFS of G yields no back edges.
 * @param {!lf.schema.GraphNode_} graphNode The node being examined.
 * @param {!lf.structs.Map} nodeMap The map of tablename
 *     to nodes in the graph.
 * @see http://www.geeksforgeeks.org/detect-cycle-in-a-graph/
 * @private
 */
lf.schema.Builder.prototype.checkCycleUtil_ = function(graphNode, nodeMap) {
  if (!graphNode.visited) {
    graphNode.visited = true;
    graphNode.onStack = true;
    graphNode.edges.forEach(function(edge) {
      var childNode = nodeMap.get(edge);
      if (!childNode.visited) {
        this.checkCycleUtil_(childNode, nodeMap);
      } else if (childNode.onStack) {
        // Checks for self loop, in which case, it does not throw an exception.
        if (graphNode != childNode) {
          // 533: Foreign key loop detected.
          throw new lf.Exception(533);
        }
      }
    }, this);
  }
  graphNode.onStack = false;
};


/**
 * Builds the graph of foreign key relationships and checks for
 * loop in the graph.
 * @private
 */
lf.schema.Builder.prototype.checkFkCycle_ = function() {
  // Builds graph.
  var nodeMap = lf.structs.map.create();
  this.schema_.tables_.forEach(function(table, tableName) {
    nodeMap.set(tableName, new lf.schema.GraphNode_(tableName));
  }, this);
  this.tableBuilders_.forEach(function(builder, tableName) {
    builder.getFkSpecs().forEach(function(spec) {
      var parentNode = nodeMap.get(spec.parentTable);
      parentNode.edges.add(tableName);
    });
  });
  // Checks for cycle.
  lf.structs.map.values(nodeMap).forEach(function(graphNode) {
    this.checkCycleUtil_(graphNode, nodeMap);
  }, this);
};



/**
 * A class that represents a vertex in the graph of foreign keys relationships.
 * @constructor
 * @private
 * @struct
 * @param {string} tableName
 */
lf.schema.GraphNode_ = function(tableName) {
  /** @type {boolean} */
  this.visited = false;


  /** @type {boolean} */
  this.onStack = false;


  /** @type {!lf.structs.Set} */
  this.edges = lf.structs.set.create();


  /** @type {string} */
  this.tableName = tableName;
};


/** @export @return {!lf.schema.Database} */
lf.schema.Builder.prototype.getSchema = function() {
  if (!this.finalized_) {
    this.finalize_();
  }
  return this.schema_;
};


/** @export @return {!lf.Global} */
lf.schema.Builder.prototype.getGlobal = function() {
  var namespacedGlobalId =
      new lf.service.ServiceId('ns_' + this.schema_.name());
  var global = lf.Global.get();

  var namespacedGlobal = null;
  if (!global.isRegistered(namespacedGlobalId)) {
    namespacedGlobal = new lf.Global();
    global.registerService(namespacedGlobalId, namespacedGlobal);
  } else {
    namespacedGlobal = global.getService(namespacedGlobalId);
  }

  return namespacedGlobal;
};


/**
 * Instantiates a connection to the database. Note: This method can only be
 * called once per Builder instance. Subsequent calls will throw an error.
 * @param {!lf.schema.ConnectOptions=} opt_options
 * @return {!IThenable<!lf.proc.Database>}
 * @export
 */
lf.schema.Builder.prototype.connect = function(opt_options) {
  if (!goog.isNull(this.db_) && this.db_.isOpen()) {
    // 113: Attempt to call connect() on an already opened DB connection.
    throw new lf.Exception(113);
  }

  if (goog.isNull(this.db_)) {
    var global = this.getGlobal();
    if (!global.isRegistered(lf.service.SCHEMA)) {
      global.registerService(lf.service.SCHEMA, this.getSchema());
    }
    this.db_ = new lf.proc.Database(global);
  }

  return this.db_.init(opt_options);
};


/**
 * @param {string} tableName
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.Builder.prototype.createTable = function(tableName) {
  if (this.tableBuilders_.has(tableName)) {
    // 503: Name {0} is already defined.
    throw new lf.Exception(503, tableName);
  } else if (this.finalized_) {
    // 535: Schema is already finalized.
    throw new lf.Exception(535);
  }
  this.tableBuilders_.set(tableName, new lf.schema.TableBuilder(tableName));
  return this.tableBuilders_.get(tableName);
};


/**
 * @param {!lf.schema.Database.Pragma} pragma
 * @return {!lf.schema.Builder}
 * @export
 */
lf.schema.Builder.prototype.setPragma = function(pragma) {
  if (this.finalized_) {
    // 535: Schema is already finalized.
    throw new lf.Exception(535);
  }

  this.schema_.setPragma(pragma);
  return this;
};



/**
 * @implements {lf.schema.Database}
 * @constructor @struct
 * @export
 *
 * @param {string} name
 * @param {number} version
 */
lf.schema.DatabaseSchema = function(name, version) {
  /** @private {string} */
  this.name_ = name;

  /** @private {number} */
  this.version_ = version;

  /** @private {!lf.structs.Map<string, !lf.schema.Table>} */
  this.tables_ = lf.structs.map.create();

  /** @private {!lf.schema.Database.Pragma} */
  this.pragma_ = {
    enableBundledMode: false
  };

  /** @private {!lf.schema.Info} */
  this.info_;
};


/** @export @override */
lf.schema.DatabaseSchema.prototype.name = function() {
  return this.name_;
};


/** @export @override */
lf.schema.DatabaseSchema.prototype.version = function() {
  return this.version_;
};


/** @export @override */
lf.schema.DatabaseSchema.prototype.tables = function() {
  return lf.structs.map.values(this.tables_);
};


/** @export @override */
lf.schema.DatabaseSchema.prototype.table = function(tableName) {
  if (!this.tables_.has(tableName)) {
    // 101: Table {0} not found.
    throw new lf.Exception(101, tableName);
  }
  return this.tables_.get(tableName);
};


/** @override */
lf.schema.DatabaseSchema.prototype.info = function() {
  if (!this.info_) {
    this.info_ = new lf.schema.Info(this);
  }
  return this.info_;
};


/** @param {!lf.schema.Table} table */
lf.schema.DatabaseSchema.prototype.setTable = function(table) {
  this.tables_.set(table.getName(), table);
};


/** @export @override */
lf.schema.DatabaseSchema.prototype.pragma = function() {
  return this.pragma_;
};


/** @param {!lf.schema.Database.Pragma} pragma */
lf.schema.DatabaseSchema.prototype.setPragma = function(pragma) {
  this.pragma_ = pragma;
};


/**
 * Global helper to create schema builder.
 * @param {string} dbName Database name
 * @param {number} dbVersion Database version
 * @return {!lf.schema.Builder} Schema builder that can be used to create a
 *     database schema.
 * @export
 */
lf.schema.create = function(dbName, dbVersion) {
  return new lf.schema.Builder(dbName, dbVersion);
};
