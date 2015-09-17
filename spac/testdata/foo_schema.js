goog.provide('foo.db.row.Foo');
goog.provide('foo.db.row.FooDbType');
goog.provide('foo.db.row.FooType');
goog.provide('foo.db.row.Location');
goog.provide('foo.db.row.LocationDbType');
goog.provide('foo.db.row.LocationType');
goog.provide('foo.db.schema.Database');
goog.provide('foo.db.schema.Foo');
goog.provide('foo.db.schema.Location');

/** @suppress {extraRequire} */
goog.require('lf.ConstraintAction');
goog.require('lf.ConstraintTiming');
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.schema.BaseColumn');
goog.require('lf.schema.Constraint');
goog.require('lf.schema.Database');
goog.require('lf.schema.ForeignKeySpec');
goog.require('lf.schema.Index');
goog.require('lf.schema.Info');
goog.require('lf.schema.Table');



/**
 * @implements {lf.schema.Database}
 * @constructor
 */
foo.db.schema.Database = function() {
  /** @private {!Object} */
  this.tableMap_ = {};

  /** @private {!lf.schema.Database.Pragma} */
  this.pragma_ = {
    enableBundledMode: true
  };

  /** @private {!foo.db.schema.Location} */
  this.location_ = new foo.db.schema.Location();
  this.tableMap_['Location'] = this.location_;

  /** @private {!foo.db.schema.Foo} */
  this.foo_ = new foo.db.schema.Foo();
  this.tableMap_['Foo'] = this.foo_;

  /** @private {!lf.schema.Info} */
  this.metaInfo_;
};


/** @override */
foo.db.schema.Database.prototype.name = function() {
  return 'idb';
};


/** @override */
foo.db.schema.Database.prototype.version = function() {
  return 1;
};


/** @override */
foo.db.schema.Database.prototype.tables = function() {
  return [
    this.location_,
    this.foo_
  ];
};


/** @override */
foo.db.schema.Database.prototype.info = function() {
  if (!this.metaInfo_) {
    this.metaInfo_ = new lf.schema.Info(this);
  }
  return this.metaInfo_;
};


/** @override */
foo.db.schema.Database.prototype.table = function(tableName) {
  return this.tableMap_[tableName] || null;
};


/** @override */
foo.db.schema.Database.prototype.pragma = function() {
  return this.pragma_;
};


/** @return {!foo.db.schema.Location} */
foo.db.schema.Database.prototype.getLocation = function() {
  return this.location_;
};


/** @return {!foo.db.schema.Foo} */
foo.db.schema.Database.prototype.getFoo = function() {
  return this.foo_;
};



/**
 * @extends {lf.schema.Table.<!foo.db.row.LocationType,
 *     !foo.db.row.LocationDbType>}
 * @constructor
 */
foo.db.schema.Location = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, false, lf.Type.STRING);
  cols.push(this.id);

  var indices = [
    new lf.schema.Index('Location', 'pkLocation', true,
        [
          {schema: this.id, order: lf.Order.ASC, autoIncrement: false}
        ])
  ];

  /** @private {!lf.schema.Constraint} */
  this.constraint_;

  foo.db.schema.Location.base(
      this, 'constructor', 'Location', cols, indices, false);
};
goog.inherits(foo.db.schema.Location, lf.schema.Table);


/** @override */
foo.db.schema.Location.prototype.createRow = function(opt_value) {
  return new foo.db.row.Location(lf.Row.getNextId(), opt_value);
};


/** @override */
foo.db.schema.Location.prototype.deserializeRow =
    function(dbRecord) {
  var data = dbRecord['value'];
  return new foo.db.row.Location(dbRecord['id'], data);
};


/** @override */
foo.db.schema.Location.prototype.getConstraint = function() {
  if (goog.isDefAndNotNull(this.constraint_)) {
    return this.constraint_;
  }

  var pk = this.getIndices()[0];
  var notNullable = [
    this.id
  ];
  var foreignKeys = [
  ];
  this.constraint_ = new lf.schema.Constraint(
      pk, notNullable, foreignKeys);
  return this.constraint_;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
foo.db.row.LocationType = function() {
  /** @export @type {string} */
  this.id;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
foo.db.row.LocationDbType = function() {
  /** @export @type {string} */
  this.id;
};



/**
 * Constructs a new Location row.
 * @constructor
 * @extends {lf.Row.<!foo.db.row.LocationType,
 *     !foo.db.row.LocationDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!foo.db.row.LocationType=} opt_payload
 */
foo.db.row.Location = function(rowId, opt_payload) {
  foo.db.row.Location.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(foo.db.row.Location, lf.Row);


/** @override */
foo.db.row.Location.prototype.defaultPayload = function() {
  var payload = new foo.db.row.LocationType();
  payload.id = '';
  return payload;
};


/** @override */
foo.db.row.Location.prototype.toDbPayload = function() {
  var payload = new foo.db.row.LocationDbType();
  payload.id = this.payload().id;
  return payload;
};


/** @override */
foo.db.row.Location.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Location.pkLocation':
      return this.payload().id;
    case 'Location.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
foo.db.row.Location.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!foo.db.row.Location}
*/
foo.db.row.Location.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!foo.db.row.FooType,
 *     !foo.db.row.FooDbType>}
 * @constructor
 */
foo.db.schema.Foo = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, false, lf.Type.STRING);
  cols.push(this.id);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.name = new lf.schema.BaseColumn(
      this, 'name', false, false, lf.Type.STRING);
  cols.push(this.name);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.bar = new lf.schema.BaseColumn(
      this, 'bar', true, false, lf.Type.STRING);
  cols.push(this.bar);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.location = new lf.schema.BaseColumn(
      this, 'location', false, false, lf.Type.STRING);
  cols.push(this.location);

  var indices = [
    new lf.schema.Index('Foo', 'pkFoo', true,
        [
          {schema: this.id, order: lf.Order.ASC, autoIncrement: false}
        ]),
    new lf.schema.Index('Foo', 'uq_bar', true,
        [
          {schema: this.bar, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('Foo', 'fk_loc', false,
        [
          {schema: this.location, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('Foo', 'idx_Name', false,
        [
          {schema: this.name, order: lf.Order.ASC}
        ])
  ];

  /** @private {!lf.schema.Constraint} */
  this.constraint_;

  foo.db.schema.Foo.base(
      this, 'constructor', 'Foo', cols, indices, true);
};
goog.inherits(foo.db.schema.Foo, lf.schema.Table);


/** @override */
foo.db.schema.Foo.prototype.createRow = function(opt_value) {
  return new foo.db.row.Foo(lf.Row.getNextId(), opt_value);
};


/** @override */
foo.db.schema.Foo.prototype.deserializeRow =
    function(dbRecord) {
  var data = dbRecord['value'];
  return new foo.db.row.Foo(dbRecord['id'], data);
};


/** @override */
foo.db.schema.Foo.prototype.getConstraint = function() {
  if (goog.isDefAndNotNull(this.constraint_)) {
    return this.constraint_;
  }

  var pk = this.getIndices()[0];
  var notNullable = [
    this.id,
    this.name,
    this.bar,
    this.location
  ];
  var foreignKeys = [
    new lf.schema.ForeignKeySpec(
        {
          'local': 'location',
          'ref': 'Location.id',
          'action': lf.ConstraintAction.RESTRICT,
          'timing': lf.ConstraintTiming.IMMEDIATE
        }, 'Foo', 'fk_loc')
  ];
  this.constraint_ = new lf.schema.Constraint(
      pk, notNullable, foreignKeys);
  return this.constraint_;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
foo.db.row.FooType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.name;
  /** @export @type {string} */
  this.bar;
  /** @export @type {string} */
  this.location;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
foo.db.row.FooDbType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.name;
  /** @export @type {string} */
  this.bar;
  /** @export @type {string} */
  this.location;
};



/**
 * Constructs a new Foo row.
 * @constructor
 * @extends {lf.Row.<!foo.db.row.FooType,
 *     !foo.db.row.FooDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!foo.db.row.FooType=} opt_payload
 */
foo.db.row.Foo = function(rowId, opt_payload) {
  foo.db.row.Foo.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(foo.db.row.Foo, lf.Row);


/** @override */
foo.db.row.Foo.prototype.defaultPayload = function() {
  var payload = new foo.db.row.FooType();
  payload.id = '';
  payload.name = '';
  payload.bar = '';
  payload.location = '';
  return payload;
};


/** @override */
foo.db.row.Foo.prototype.toDbPayload = function() {
  var payload = new foo.db.row.FooDbType();
  payload.id = this.payload().id;
  payload.name = this.payload().name;
  payload.bar = this.payload().bar;
  payload.location = this.payload().location;
  return payload;
};


/** @override */
foo.db.row.Foo.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Foo.pkFoo':
      return this.payload().id;
    case 'Foo.uq_bar':
      return this.payload().bar;
    case 'Foo.fk_loc':
      return this.payload().location;
    case 'Foo.idx_Name':
      return this.payload().name;
    case 'Foo.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
foo.db.row.Foo.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!foo.db.row.Foo}
*/
foo.db.row.Foo.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
foo.db.row.Foo.prototype.getName = function() {
  return this.payload().name;
};


/**
 * @param {string} value
 * @return {!foo.db.row.Foo}
*/
foo.db.row.Foo.prototype.setName = function(value) {
  this.payload().name = value;
  return this;
};


/** @return {string} */
foo.db.row.Foo.prototype.getBar = function() {
  return this.payload().bar;
};


/**
 * @param {string} value
 * @return {!foo.db.row.Foo}
*/
foo.db.row.Foo.prototype.setBar = function(value) {
  this.payload().bar = value;
  return this;
};


/** @return {string} */
foo.db.row.Foo.prototype.getLocation = function() {
  return this.payload().location;
};


/**
 * @param {string} value
 * @return {!foo.db.row.Foo}
*/
foo.db.row.Foo.prototype.setLocation = function(value) {
  this.payload().location = value;
  return this;
};
