goog.provide('olympia.db.row.Medal');
goog.provide('olympia.db.row.MedalDbType');
goog.provide('olympia.db.row.MedalType');
goog.provide('olympia.db.schema.Database');
goog.provide('olympia.db.schema.Medal');

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
olympia.db.schema.Database = function() {
  /** @private {!olympia.db.schema.Medal} */
  this.medal_ = new olympia.db.schema.Medal();

};


/** @override */
olympia.db.schema.Database.prototype.name = function() {
  return 'olympia';
};


/** @override */
olympia.db.schema.Database.prototype.version = function() {
  return 1;
};


/** @override */
olympia.db.schema.Database.prototype.tables = function() {
  return [
    this.medal_
  ];
};


/** @return {!olympia.db.schema.Medal} */
olympia.db.schema.Database.prototype.getMedal = function() {
  return this.medal_;
};



/**
 * @extends {lf.schema.Table.<!olympia.db.row.MedalType,
 *     !olympia.db.row.MedalDbType>}
 * @constructor
 */
olympia.db.schema.Medal = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.city = new lf.schema.BaseColumn(
      this, 'city', false, lf.Type.STRING);
  cols.push(this.city);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.color = new lf.schema.BaseColumn(
      this, 'color', false, lf.Type.STRING);
  cols.push(this.color);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.country = new lf.schema.BaseColumn(
      this, 'country', false, lf.Type.STRING);
  cols.push(this.country);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.discipline = new lf.schema.BaseColumn(
      this, 'discipline', false, lf.Type.STRING);
  cols.push(this.discipline);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.eventGender = new lf.schema.BaseColumn(
      this, 'eventGender', false, lf.Type.STRING);
  cols.push(this.eventGender);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.event = new lf.schema.BaseColumn(
      this, 'event', false, lf.Type.STRING);
  cols.push(this.event);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.firstName = new lf.schema.BaseColumn(
      this, 'firstName', false, lf.Type.STRING);
  cols.push(this.firstName);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.gender = new lf.schema.BaseColumn(
      this, 'gender', false, lf.Type.STRING);
  cols.push(this.gender);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.lastName = new lf.schema.BaseColumn(
      this, 'lastName', false, lf.Type.STRING);
  cols.push(this.lastName);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.sport = new lf.schema.BaseColumn(
      this, 'sport', false, lf.Type.STRING);
  cols.push(this.sport);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.year = new lf.schema.BaseColumn(
      this, 'year', false, lf.Type.NUMBER);
  cols.push(this.year);

  var indices = [
    new lf.schema.Index('Medal', 'idx_year', false,
        [{'name': 'year'}]),
    new lf.schema.Index('Medal', 'idx_lastName', false,
        [{'name': 'lastName'}])
  ];

  olympia.db.schema.Medal.base(
      this, 'constructor', 'Medal', cols, indices, false);
};
goog.inherits(olympia.db.schema.Medal, lf.schema.Table);


/** @override */
olympia.db.schema.Medal.prototype.createRow = function(opt_value) {
  return new olympia.db.row.Medal(lf.Row.getNextId(), opt_value);
};


/** @override */
olympia.db.schema.Medal.prototype.deserializeRow = function(dbRecord) {
  return new olympia.db.row.Medal(dbRecord['id'], dbRecord['value']);
};


/** @override */
olympia.db.schema.Medal.prototype.getConstraint = function() {
  var notNullable = [
    this.city,
    this.color,
    this.country,
    this.discipline,
    this.eventGender,
    this.event,
    this.firstName,
    this.gender,
    this.lastName,
    this.sport,
    this.year
  ];
  return new lf.schema.Constraint(null, notNullable, [], []);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
olympia.db.row.MedalType = function() {
  /** @export @type {string} */
  this.city;
  /** @export @type {string} */
  this.color;
  /** @export @type {string} */
  this.country;
  /** @export @type {string} */
  this.discipline;
  /** @export @type {string} */
  this.eventGender;
  /** @export @type {string} */
  this.event;
  /** @export @type {string} */
  this.firstName;
  /** @export @type {string} */
  this.gender;
  /** @export @type {string} */
  this.lastName;
  /** @export @type {string} */
  this.sport;
  /** @export @type {number} */
  this.year;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
olympia.db.row.MedalDbType = function() {
  /** @export @type {string} */
  this.city;
  /** @export @type {string} */
  this.color;
  /** @export @type {string} */
  this.country;
  /** @export @type {string} */
  this.discipline;
  /** @export @type {string} */
  this.eventGender;
  /** @export @type {string} */
  this.event;
  /** @export @type {string} */
  this.firstName;
  /** @export @type {string} */
  this.gender;
  /** @export @type {string} */
  this.lastName;
  /** @export @type {string} */
  this.sport;
  /** @export @type {number} */
  this.year;
};



/**
 * Constructs a new Medal row.
 * @constructor
 * @extends {lf.Row.<!olympia.db.row.MedalType,
 *     !olympia.db.row.MedalDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!olympia.db.row.MedalType=} opt_payload
 */
olympia.db.row.Medal = function(rowId, opt_payload) {
  olympia.db.row.Medal.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(olympia.db.row.Medal, lf.Row);


/** @override */
olympia.db.row.Medal.prototype.defaultPayload = function() {
  var payload = new olympia.db.row.MedalType();
  payload.city = '';
  payload.color = '';
  payload.country = '';
  payload.discipline = '';
  payload.eventGender = '';
  payload.event = '';
  payload.firstName = '';
  payload.gender = '';
  payload.lastName = '';
  payload.sport = '';
  payload.year = 0;
  return payload;
};


/** @override */
olympia.db.row.Medal.prototype.toDbPayload = function() {
  var payload = new olympia.db.row.MedalDbType();
  payload.city = this.payload().city;
  payload.color = this.payload().color;
  payload.country = this.payload().country;
  payload.discipline = this.payload().discipline;
  payload.eventGender = this.payload().eventGender;
  payload.event = this.payload().event;
  payload.firstName = this.payload().firstName;
  payload.gender = this.payload().gender;
  payload.lastName = this.payload().lastName;
  payload.sport = this.payload().sport;
  payload.year = this.payload().year;
  return payload;
};


/** @override */
olympia.db.row.Medal.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Medal.idx_year':
      return this.payload().year;
    case 'Medal.idx_lastName':
      return this.payload().lastName;
    case 'Medal.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
olympia.db.row.Medal.prototype.getCity = function() {
  return this.payload().city;
};


/**
 * @param {string} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setCity = function(value) {
  this.payload().city = value;
  return this;
};


/** @return {string} */
olympia.db.row.Medal.prototype.getColor = function() {
  return this.payload().color;
};


/**
 * @param {string} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setColor = function(value) {
  this.payload().color = value;
  return this;
};


/** @return {string} */
olympia.db.row.Medal.prototype.getCountry = function() {
  return this.payload().country;
};


/**
 * @param {string} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setCountry = function(value) {
  this.payload().country = value;
  return this;
};


/** @return {string} */
olympia.db.row.Medal.prototype.getDiscipline = function() {
  return this.payload().discipline;
};


/**
 * @param {string} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setDiscipline = function(value) {
  this.payload().discipline = value;
  return this;
};


/** @return {string} */
olympia.db.row.Medal.prototype.getEventGender = function() {
  return this.payload().eventGender;
};


/**
 * @param {string} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setEventGender = function(value) {
  this.payload().eventGender = value;
  return this;
};


/** @return {string} */
olympia.db.row.Medal.prototype.getEvent = function() {
  return this.payload().event;
};


/**
 * @param {string} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setEvent = function(value) {
  this.payload().event = value;
  return this;
};


/** @return {string} */
olympia.db.row.Medal.prototype.getFirstName = function() {
  return this.payload().firstName;
};


/**
 * @param {string} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setFirstName = function(value) {
  this.payload().firstName = value;
  return this;
};


/** @return {string} */
olympia.db.row.Medal.prototype.getGender = function() {
  return this.payload().gender;
};


/**
 * @param {string} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setGender = function(value) {
  this.payload().gender = value;
  return this;
};


/** @return {string} */
olympia.db.row.Medal.prototype.getLastName = function() {
  return this.payload().lastName;
};


/**
 * @param {string} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setLastName = function(value) {
  this.payload().lastName = value;
  return this;
};


/** @return {string} */
olympia.db.row.Medal.prototype.getSport = function() {
  return this.payload().sport;
};


/**
 * @param {string} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setSport = function(value) {
  this.payload().sport = value;
  return this;
};


/** @return {number} */
olympia.db.row.Medal.prototype.getYear = function() {
  return this.payload().year;
};


/**
 * @param {number} value
 * @return {!olympia.db.row.Medal}
*/
olympia.db.row.Medal.prototype.setYear = function(value) {
  this.payload().year = value;
  return this;
};
goog.provide('olympia.db');

goog.require('lf.Global');
goog.require('lf.base.BackStoreType');
/** @suppress {extraRequire} */
goog.require('lf.fn');
/** @suppress {extraRequire} */
goog.require('lf.op');
goog.require('lf.proc.Database');
goog.require('lf.service');
goog.require('lf.service.ServiceId');
goog.require('olympia.db.schema.Database');


/**
 * @return {!lf.Global} The Global instance that refers to olympia.db.
 */
olympia.db.getGlobal = function() {
  var namespacedGlobalId = new lf.service.ServiceId('ns_olympia');
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


/** @return {!lf.schema.Database} */
olympia.db.getSchema = function() {
  var global = olympia.db.getGlobal();

  if (!global.isRegistered(lf.service.SCHEMA)) {
    var schema = new olympia.db.schema.Database();
    global.registerService(lf.service.SCHEMA, schema);
  }
  return global.getService(lf.service.SCHEMA);
};


/**
 * @param {!function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @param {boolean=} opt_volatile Default to false
 * @return {!IThenable.<!lf.proc.Database>}
 */
olympia.db.getInstance = function(opt_onUpgrade, opt_volatile) {
  olympia.db.getSchema();
  var db = new lf.proc.Database(olympia.db.getGlobal());
  return db.init(
      opt_onUpgrade,
      opt_volatile ? lf.base.BackStoreType.MEMORY : undefined,
      false);
};
