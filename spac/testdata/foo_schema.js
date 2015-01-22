goog.provide('foo.db.row.Foo');
goog.provide('foo.db.row.FooDbType');
goog.provide('foo.db.row.FooType');
goog.provide('foo.db.schema.Database');
goog.provide('foo.db.schema.Foo');

/** @suppress {extraRequire} */
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.schema.BaseColumn');
goog.require('lf.schema.Constraint');
goog.require('lf.schema.Database');
goog.require('lf.schema.Index');
goog.require('lf.schema.Table');



/**
 * @implements {lf.schema.Database}
 * @constructor
 */
foo.db.schema.Database = function() {
  /** @private {!foo.db.schema.Foo} */
  this.foo_ = new foo.db.schema.Foo();

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
    this.foo_
  ];
};


/** @return {!foo.db.schema.Foo} */
foo.db.schema.Database.prototype.getFoo = function() {
  return this.foo_;
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
      this, 'id', true, lf.Type.STRING);
  cols.push(this.id);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.name = new lf.schema.BaseColumn(
      this, 'name', false, lf.Type.STRING);
  cols.push(this.name);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.bar = new lf.schema.BaseColumn(
      this, 'bar', true, lf.Type.STRING);
  cols.push(this.bar);

  var indices = [
    new lf.schema.Index('Foo', 'pkFoo', true, [{'name': 'id'}]),
    new lf.schema.Index('Foo', 'uq_bar', true, [{'name': 'bar'}]),
    new lf.schema.Index('Foo', 'idx_Name', false,
        [{'name': 'name'}])
  ];

  foo.db.schema.Foo.base(
      this, 'constructor', 'Foo', cols, indices, true);
};
goog.inherits(foo.db.schema.Foo, lf.schema.Table);


/** @override */
foo.db.schema.Foo.prototype.createRow = function(opt_value) {
  return new foo.db.row.Foo(lf.Row.getNextId(), opt_value);
};


/** @override */
foo.db.schema.Foo.prototype.deserializeRow = function(dbRecord) {
  return new foo.db.row.Foo(dbRecord['id'], dbRecord['value']);
};


/** @override */
foo.db.schema.Foo.prototype.getConstraint = function() {
  var pk = new lf.schema.Index('Foo', 'pkFoo', true, [{'name': 'id'}]);
  var notNullable = [
    this.id,
    this.name,
    this.bar
  ];
  var foreignKeys = [];
  var unique = [
    new lf.schema.Index('Foo', 'uq_bar', true, [{'name': 'bar'}])
  ];
  return new lf.schema.Constraint(pk, notNullable, foreignKeys, unique);
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
  return payload;
};


/** @override */
foo.db.row.Foo.prototype.toDbPayload = function() {
  var payload = new foo.db.row.FooDbType();
  payload.id = this.payload().id;
  payload.name = this.payload().name;
  payload.bar = this.payload().bar;
  return payload;
};


/** @override */
foo.db.row.Foo.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Foo.pkFoo':
      return this.payload().id;
    case 'Foo.uq_bar':
      return this.payload().bar;
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
