goog.provide('lovefield.db.row.Album');
goog.provide('lovefield.db.row.AlbumDbType');
goog.provide('lovefield.db.row.AlbumType');
goog.provide('lovefield.db.row.Curator');
goog.provide('lovefield.db.row.CuratorDbType');
goog.provide('lovefield.db.row.CuratorType');
goog.provide('lovefield.db.row.Details');
goog.provide('lovefield.db.row.DetailsDbType');
goog.provide('lovefield.db.row.DetailsType');
goog.provide('lovefield.db.row.NullableTable');
goog.provide('lovefield.db.row.NullableTableDbType');
goog.provide('lovefield.db.row.NullableTableType');
goog.provide('lovefield.db.row.Photo');
goog.provide('lovefield.db.row.PhotoCurator');
goog.provide('lovefield.db.row.PhotoCuratorDbType');
goog.provide('lovefield.db.row.PhotoCuratorType');
goog.provide('lovefield.db.row.PhotoDbType');
goog.provide('lovefield.db.row.PhotoType');
goog.provide('lovefield.db.row.SelfLoop');
goog.provide('lovefield.db.row.SelfLoopDbType');
goog.provide('lovefield.db.row.SelfLoopType');
goog.provide('lovefield.db.schema.Album');
goog.provide('lovefield.db.schema.Curator');
goog.provide('lovefield.db.schema.Database');
goog.provide('lovefield.db.schema.Details');
goog.provide('lovefield.db.schema.NullableTable');
goog.provide('lovefield.db.schema.Photo');
goog.provide('lovefield.db.schema.PhotoCurator');
goog.provide('lovefield.db.schema.SelfLoop');

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
lovefield.db.schema.Database = function() {
  /** @private {!Object} */
  this.tableMap_ = {};

  /** @private {!lf.schema.Database.Pragma} */
  this.pragma_ = {
    enableBundledMode: false
  };

  /** @private {!lovefield.db.schema.Album} */
  this.album_ = new lovefield.db.schema.Album();
  this.tableMap_['Album'] = this.album_;

  /** @private {!lovefield.db.schema.Photo} */
  this.photo_ = new lovefield.db.schema.Photo();
  this.tableMap_['Photo'] = this.photo_;

  /** @private {!lovefield.db.schema.Details} */
  this.details_ = new lovefield.db.schema.Details();
  this.tableMap_['Details'] = this.details_;

  /** @private {!lovefield.db.schema.Curator} */
  this.curator_ = new lovefield.db.schema.Curator();
  this.tableMap_['Curator'] = this.curator_;

  /** @private {!lovefield.db.schema.PhotoCurator} */
  this.photoCurator_ = new lovefield.db.schema.PhotoCurator();
  this.tableMap_['PhotoCurator'] = this.photoCurator_;

  /** @private {!lovefield.db.schema.NullableTable} */
  this.nullableTable_ = new lovefield.db.schema.NullableTable();
  this.tableMap_['NullableTable'] = this.nullableTable_;

  /** @private {!lovefield.db.schema.SelfLoop} */
  this.selfLoop_ = new lovefield.db.schema.SelfLoop();
  this.tableMap_['SelfLoop'] = this.selfLoop_;

  /** @private {!lf.schema.Info} */
  this.metaInfo_;
};


/** @override */
lovefield.db.schema.Database.prototype.name = function() {
  return 'db';
};


/** @override */
lovefield.db.schema.Database.prototype.version = function() {
  return 1;
};


/** @override */
lovefield.db.schema.Database.prototype.tables = function() {
  return [
    this.album_,
    this.photo_,
    this.details_,
    this.curator_,
    this.photoCurator_,
    this.nullableTable_,
    this.selfLoop_
  ];
};


/** @override */
lovefield.db.schema.Database.prototype.info = function() {
  if (!this.metaInfo_) {
    this.metaInfo_ = new lf.schema.Info(this);
  }
  return this.metaInfo_;
};


/** @override */
lovefield.db.schema.Database.prototype.table = function(tableName) {
  return this.tableMap_[tableName] || null;
};


/** @override */
lovefield.db.schema.Database.prototype.pragma = function() {
  return this.pragma_;
};


/** @return {!lovefield.db.schema.Album} */
lovefield.db.schema.Database.prototype.getAlbum = function() {
  return this.album_;
};


/** @return {!lovefield.db.schema.Photo} */
lovefield.db.schema.Database.prototype.getPhoto = function() {
  return this.photo_;
};


/** @return {!lovefield.db.schema.Details} */
lovefield.db.schema.Database.prototype.getDetails = function() {
  return this.details_;
};


/** @return {!lovefield.db.schema.Curator} */
lovefield.db.schema.Database.prototype.getCurator = function() {
  return this.curator_;
};


/** @return {!lovefield.db.schema.PhotoCurator} */
lovefield.db.schema.Database.prototype.getPhotoCurator = function() {
  return this.photoCurator_;
};


/** @return {!lovefield.db.schema.NullableTable} */
lovefield.db.schema.Database.prototype.getNullableTable = function() {
  return this.nullableTable_;
};


/** @return {!lovefield.db.schema.SelfLoop} */
lovefield.db.schema.Database.prototype.getSelfLoop = function() {
  return this.selfLoop_;
};



/**
 * @extends {lf.schema.Table.<!lovefield.db.row.AlbumType,
 *     !lovefield.db.row.AlbumDbType>}
 * @constructor
 */
lovefield.db.schema.Album = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, false, lf.Type.STRING);
  cols.push(this.id);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.isLocal = new lf.schema.BaseColumn(
      this, 'isLocal', false, false, lf.Type.BOOLEAN);
  cols.push(this.isLocal);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.createdByAction = new lf.schema.BaseColumn(
      this, 'createdByAction', false, false, lf.Type.BOOLEAN);
  cols.push(this.createdByAction);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.timestamp = new lf.schema.BaseColumn(
      this, 'timestamp', false, false, lf.Type.DATE_TIME);
  cols.push(this.timestamp);

  /** @type {!lf.schema.BaseColumn.<!ArrayBuffer>} */
  this.tacotownJspb = new lf.schema.BaseColumn(
      this, 'tacotownJspb', false, true, lf.Type.ARRAY_BUFFER);
  cols.push(this.tacotownJspb);

  /** @type {!lf.schema.BaseColumn.<!Object>} */
  this.proto = new lf.schema.BaseColumn(
      this, 'proto', false, true, lf.Type.OBJECT);
  cols.push(this.proto);

  var indices = [
    new lf.schema.Index('Album', 'pkAlbum', true,
        [
          {schema: this.id, order: lf.Order.ASC, autoIncrement: false}
        ]),
    new lf.schema.Index('Album', 'idx_timestamp', false,
        [
          {schema: this.timestamp, order: lf.Order.DESC}
        ])
  ];

  /** @private {!lf.schema.Constraint} */
  this.constraint_;

  lovefield.db.schema.Album.base(
      this, 'constructor', 'Album', cols, indices, false);
};
goog.inherits(lovefield.db.schema.Album, lf.schema.Table);


/** @override */
lovefield.db.schema.Album.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.Album(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.Album.prototype.deserializeRow =
    function(dbRecord) {
  var data = dbRecord['value'];
  data.timestamp = new Date(data.timestamp);
  data.tacotownJspb = lf.Row.hexToBin(data.tacotownJspb);
  return new lovefield.db.row.Album(dbRecord['id'], data);
};


/** @override */
lovefield.db.schema.Album.prototype.getConstraint = function() {
  if (goog.isDefAndNotNull(this.constraint_)) {
    return this.constraint_;
  }

  var pk = this.getIndices()[0];
  var notNullable = [
    this.id,
    this.isLocal,
    this.createdByAction,
    this.timestamp
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
lovefield.db.row.AlbumType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {boolean} */
  this.isLocal;
  /** @export @type {boolean} */
  this.createdByAction;
  /** @export @type {!Date} */
  this.timestamp;
  /** @export @type {?ArrayBuffer} */
  this.tacotownJspb;
  /** @export @type {?Object} */
  this.proto;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
lovefield.db.row.AlbumDbType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {boolean} */
  this.isLocal;
  /** @export @type {boolean} */
  this.createdByAction;
  /** @export @type {number} */
  this.timestamp;
  /** @export @type {?string} */
  this.tacotownJspb;
  /** @export @type {?Object} */
  this.proto;
};



/**
 * Constructs a new Album row.
 * @constructor
 * @extends {lf.Row.<!lovefield.db.row.AlbumType,
 *     !lovefield.db.row.AlbumDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!lovefield.db.row.AlbumType=} opt_payload
 */
lovefield.db.row.Album = function(rowId, opt_payload) {
  lovefield.db.row.Album.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(lovefield.db.row.Album, lf.Row);


/** @override */
lovefield.db.row.Album.prototype.defaultPayload = function() {
  var payload = new lovefield.db.row.AlbumType();
  payload.id = '';
  payload.isLocal = false;
  payload.createdByAction = false;
  payload.timestamp = new Date(0);
  payload.tacotownJspb = null;
  payload.proto = null;
  return payload;
};


/** @override */
lovefield.db.row.Album.prototype.toDbPayload = function() {
  var payload = new lovefield.db.row.AlbumDbType();
  payload.id = this.payload().id;
  payload.isLocal = this.payload().isLocal;
  payload.createdByAction = this.payload().createdByAction;
  payload.timestamp = this.payload().timestamp.getTime();
  payload.tacotownJspb = lf.Row.binToHex(this.payload().tacotownJspb);
  payload.proto =
      goog.isDefAndNotNull(this.payload().proto) ?
      this.payload().proto : null;
  return payload;
};


/** @override */
lovefield.db.row.Album.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Album.pkAlbum':
      return this.payload().id;
    case 'Album.idx_timestamp':
      return this.payload().timestamp.getTime();
    case 'Album.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
lovefield.db.row.Album.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.Album}
*/
lovefield.db.row.Album.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {boolean} */
lovefield.db.row.Album.prototype.getIsLocal = function() {
  return this.payload().isLocal;
};


/**
 * @param {boolean} value
 * @return {!lovefield.db.row.Album}
*/
lovefield.db.row.Album.prototype.setIsLocal = function(value) {
  this.payload().isLocal = value;
  return this;
};


/** @return {boolean} */
lovefield.db.row.Album.prototype.getCreatedByAction = function() {
  return this.payload().createdByAction;
};


/**
 * @param {boolean} value
 * @return {!lovefield.db.row.Album}
*/
lovefield.db.row.Album.prototype.setCreatedByAction = function(value) {
  this.payload().createdByAction = value;
  return this;
};


/** @return {!Date} */
lovefield.db.row.Album.prototype.getTimestamp = function() {
  return this.payload().timestamp;
};


/**
 * @param {!Date} value
 * @return {!lovefield.db.row.Album}
*/
lovefield.db.row.Album.prototype.setTimestamp = function(value) {
  this.payload().timestamp = value;
  return this;
};


/** @return {?ArrayBuffer} */
lovefield.db.row.Album.prototype.getTacotownJspb = function() {
  return this.payload().tacotownJspb;
};


/**
 * @param {?ArrayBuffer} value
 * @return {!lovefield.db.row.Album}
*/
lovefield.db.row.Album.prototype.setTacotownJspb = function(value) {
  this.payload().tacotownJspb = value;
  return this;
};


/** @return {?Object} */
lovefield.db.row.Album.prototype.getProto = function() {
  return this.payload().proto;
};


/**
 * @param {?Object} value
 * @return {!lovefield.db.row.Album}
*/
lovefield.db.row.Album.prototype.setProto = function(value) {
  this.payload().proto = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!lovefield.db.row.PhotoType,
 *     !lovefield.db.row.PhotoDbType>}
 * @constructor
 */
lovefield.db.schema.Photo = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, false, lf.Type.STRING);
  cols.push(this.id);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.imageHash = new lf.schema.BaseColumn(
      this, 'imageHash', true, false, lf.Type.STRING);
  cols.push(this.imageHash);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.isLocal = new lf.schema.BaseColumn(
      this, 'isLocal', false, false, lf.Type.BOOLEAN);
  cols.push(this.isLocal);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.createdByAction = new lf.schema.BaseColumn(
      this, 'createdByAction', false, true, lf.Type.BOOLEAN);
  cols.push(this.createdByAction);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.timestamp = new lf.schema.BaseColumn(
      this, 'timestamp', false, false, lf.Type.DATE_TIME);
  cols.push(this.timestamp);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.accessTimestamp = new lf.schema.BaseColumn(
      this, 'accessTimestamp', false, true, lf.Type.DATE_TIME);
  cols.push(this.accessTimestamp);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.albumId = new lf.schema.BaseColumn(
      this, 'albumId', false, false, lf.Type.STRING);
  cols.push(this.albumId);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.isCoverPhoto = new lf.schema.BaseColumn(
      this, 'isCoverPhoto', false, false, lf.Type.BOOLEAN);
  cols.push(this.isCoverPhoto);

  /** @type {!lf.schema.BaseColumn.<!ArrayBuffer>} */
  this.tacotownJspb = new lf.schema.BaseColumn(
      this, 'tacotownJspb', false, true, lf.Type.ARRAY_BUFFER);
  cols.push(this.tacotownJspb);

  /** @type {!lf.schema.BaseColumn.<!Object>} */
  this.proto = new lf.schema.BaseColumn(
      this, 'proto', false, true, lf.Type.OBJECT);
  cols.push(this.proto);

  var indices = [
    new lf.schema.Index('Photo', 'pkPhoto', true,
        [
          {schema: this.id, order: lf.Order.ASC, autoIncrement: false}
        ]),
    new lf.schema.Index('Photo', 'fk_albumId', false,
        [
          {schema: this.albumId, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('Photo', 'idx_timestamp', false,
        [
          {schema: this.timestamp, order: lf.Order.DESC}
        ]),
    new lf.schema.Index('Photo', 'idx_imageHash', true,
        [
          {schema: this.imageHash, order: lf.Order.DESC}
        ])
  ];

  /** @private {!lf.schema.Constraint} */
  this.constraint_;

  lovefield.db.schema.Photo.base(
      this, 'constructor', 'Photo', cols, indices, false);
};
goog.inherits(lovefield.db.schema.Photo, lf.schema.Table);


/** @override */
lovefield.db.schema.Photo.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.Photo(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.Photo.prototype.deserializeRow =
    function(dbRecord) {
  var data = dbRecord['value'];
  data.timestamp = new Date(data.timestamp);
  data.accessTimestamp = goog.isDefAndNotNull(data.accessTimestamp) ?
      new Date(data.accessTimestamp) : null;
  data.tacotownJspb = lf.Row.hexToBin(data.tacotownJspb);
  return new lovefield.db.row.Photo(dbRecord['id'], data);
};


/** @override */
lovefield.db.schema.Photo.prototype.getConstraint = function() {
  if (goog.isDefAndNotNull(this.constraint_)) {
    return this.constraint_;
  }

  var pk = this.getIndices()[0];
  var notNullable = [
    this.id,
    this.imageHash,
    this.isLocal,
    this.timestamp,
    this.albumId,
    this.isCoverPhoto
  ];
  var foreignKeys = [
    new lf.schema.ForeignKeySpec(
        {
          'local': 'albumId',
          'ref': 'Album.id',
          'action': lf.ConstraintAction.CASCADE,
          'timing': lf.ConstraintTiming.IMMEDIATE
        }, 'Photo', 'fk_albumId')
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
lovefield.db.row.PhotoType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.imageHash;
  /** @export @type {boolean} */
  this.isLocal;
  /** @export @type {?boolean} */
  this.createdByAction;
  /** @export @type {!Date} */
  this.timestamp;
  /** @export @type {?Date} */
  this.accessTimestamp;
  /** @export @type {string} */
  this.albumId;
  /** @export @type {boolean} */
  this.isCoverPhoto;
  /** @export @type {?ArrayBuffer} */
  this.tacotownJspb;
  /** @export @type {?Object} */
  this.proto;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
lovefield.db.row.PhotoDbType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.imageHash;
  /** @export @type {boolean} */
  this.isLocal;
  /** @export @type {?boolean} */
  this.createdByAction;
  /** @export @type {number} */
  this.timestamp;
  /** @export @type {?number} */
  this.accessTimestamp;
  /** @export @type {string} */
  this.albumId;
  /** @export @type {boolean} */
  this.isCoverPhoto;
  /** @export @type {?string} */
  this.tacotownJspb;
  /** @export @type {?Object} */
  this.proto;
};



/**
 * Constructs a new Photo row.
 * @constructor
 * @extends {lf.Row.<!lovefield.db.row.PhotoType,
 *     !lovefield.db.row.PhotoDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!lovefield.db.row.PhotoType=} opt_payload
 */
lovefield.db.row.Photo = function(rowId, opt_payload) {
  lovefield.db.row.Photo.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(lovefield.db.row.Photo, lf.Row);


/** @override */
lovefield.db.row.Photo.prototype.defaultPayload = function() {
  var payload = new lovefield.db.row.PhotoType();
  payload.id = '';
  payload.imageHash = '';
  payload.isLocal = false;
  payload.createdByAction = null;
  payload.timestamp = new Date(0);
  payload.accessTimestamp = null;
  payload.albumId = '';
  payload.isCoverPhoto = false;
  payload.tacotownJspb = null;
  payload.proto = null;
  return payload;
};


/** @override */
lovefield.db.row.Photo.prototype.toDbPayload = function() {
  var payload = new lovefield.db.row.PhotoDbType();
  payload.id = this.payload().id;
  payload.imageHash = this.payload().imageHash;
  payload.isLocal = this.payload().isLocal;
  payload.createdByAction = this.payload().createdByAction;
  payload.timestamp = this.payload().timestamp.getTime();
  payload.accessTimestamp =
      goog.isDefAndNotNull(this.payload().accessTimestamp) ?
      this.payload().accessTimestamp.getTime() : null;
  payload.albumId = this.payload().albumId;
  payload.isCoverPhoto = this.payload().isCoverPhoto;
  payload.tacotownJspb = lf.Row.binToHex(this.payload().tacotownJspb);
  payload.proto =
      goog.isDefAndNotNull(this.payload().proto) ?
      this.payload().proto : null;
  return payload;
};


/** @override */
lovefield.db.row.Photo.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Photo.pkPhoto':
      return this.payload().id;
    case 'Photo.fk_albumId':
      return this.payload().albumId;
    case 'Photo.idx_timestamp':
      return this.payload().timestamp.getTime();
    case 'Photo.idx_imageHash':
      return this.payload().imageHash;
    case 'Photo.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
lovefield.db.row.Photo.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.Photo}
*/
lovefield.db.row.Photo.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
lovefield.db.row.Photo.prototype.getImageHash = function() {
  return this.payload().imageHash;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.Photo}
*/
lovefield.db.row.Photo.prototype.setImageHash = function(value) {
  this.payload().imageHash = value;
  return this;
};


/** @return {boolean} */
lovefield.db.row.Photo.prototype.getIsLocal = function() {
  return this.payload().isLocal;
};


/**
 * @param {boolean} value
 * @return {!lovefield.db.row.Photo}
*/
lovefield.db.row.Photo.prototype.setIsLocal = function(value) {
  this.payload().isLocal = value;
  return this;
};


/** @return {?boolean} */
lovefield.db.row.Photo.prototype.getCreatedByAction = function() {
  return this.payload().createdByAction;
};


/**
 * @param {?boolean} value
 * @return {!lovefield.db.row.Photo}
*/
lovefield.db.row.Photo.prototype.setCreatedByAction = function(value) {
  this.payload().createdByAction = value;
  return this;
};


/** @return {!Date} */
lovefield.db.row.Photo.prototype.getTimestamp = function() {
  return this.payload().timestamp;
};


/**
 * @param {!Date} value
 * @return {!lovefield.db.row.Photo}
*/
lovefield.db.row.Photo.prototype.setTimestamp = function(value) {
  this.payload().timestamp = value;
  return this;
};


/** @return {?Date} */
lovefield.db.row.Photo.prototype.getAccessTimestamp = function() {
  return this.payload().accessTimestamp;
};


/**
 * @param {?Date} value
 * @return {!lovefield.db.row.Photo}
*/
lovefield.db.row.Photo.prototype.setAccessTimestamp = function(value) {
  this.payload().accessTimestamp = value;
  return this;
};


/** @return {string} */
lovefield.db.row.Photo.prototype.getAlbumId = function() {
  return this.payload().albumId;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.Photo}
*/
lovefield.db.row.Photo.prototype.setAlbumId = function(value) {
  this.payload().albumId = value;
  return this;
};


/** @return {boolean} */
lovefield.db.row.Photo.prototype.getIsCoverPhoto = function() {
  return this.payload().isCoverPhoto;
};


/**
 * @param {boolean} value
 * @return {!lovefield.db.row.Photo}
*/
lovefield.db.row.Photo.prototype.setIsCoverPhoto = function(value) {
  this.payload().isCoverPhoto = value;
  return this;
};


/** @return {?ArrayBuffer} */
lovefield.db.row.Photo.prototype.getTacotownJspb = function() {
  return this.payload().tacotownJspb;
};


/**
 * @param {?ArrayBuffer} value
 * @return {!lovefield.db.row.Photo}
*/
lovefield.db.row.Photo.prototype.setTacotownJspb = function(value) {
  this.payload().tacotownJspb = value;
  return this;
};


/** @return {?Object} */
lovefield.db.row.Photo.prototype.getProto = function() {
  return this.payload().proto;
};


/**
 * @param {?Object} value
 * @return {!lovefield.db.row.Photo}
*/
lovefield.db.row.Photo.prototype.setProto = function(value) {
  this.payload().proto = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!lovefield.db.row.DetailsType,
 *     !lovefield.db.row.DetailsDbType>}
 * @constructor
 */
lovefield.db.schema.Details = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id1 = new lf.schema.BaseColumn(
      this, 'id1', false, false, lf.Type.STRING);
  cols.push(this.id1);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.id2 = new lf.schema.BaseColumn(
      this, 'id2', false, false, lf.Type.NUMBER);
  cols.push(this.id2);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.photoId = new lf.schema.BaseColumn(
      this, 'photoId', true, false, lf.Type.STRING);
  cols.push(this.photoId);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.albumId = new lf.schema.BaseColumn(
      this, 'albumId', false, false, lf.Type.STRING);
  cols.push(this.albumId);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.totalComments = new lf.schema.BaseColumn(
      this, 'totalComments', false, false, lf.Type.INTEGER);
  cols.push(this.totalComments);

  var indices = [
    new lf.schema.Index('Details', 'pkDetails', true,
        [
          {schema: this.id1, order: lf.Order.ASC, autoIncrement: false},
          {schema: this.id2, order: lf.Order.ASC, autoIncrement: false}
        ]),
    new lf.schema.Index('Details', 'uq_photoId', true,
        [
          {schema: this.photoId, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('Details', 'fk_photoId', true,
        [
          {schema: this.photoId, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('Details', 'fk_albumId', false,
        [
          {schema: this.albumId, order: lf.Order.ASC}
        ])
  ];

  /** @private {!lf.schema.Constraint} */
  this.constraint_;

  lovefield.db.schema.Details.base(
      this, 'constructor', 'Details', cols, indices, false);
};
goog.inherits(lovefield.db.schema.Details, lf.schema.Table);


/** @override */
lovefield.db.schema.Details.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.Details(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.Details.prototype.deserializeRow =
    function(dbRecord) {
  var data = dbRecord['value'];
  return new lovefield.db.row.Details(dbRecord['id'], data);
};


/** @override */
lovefield.db.schema.Details.prototype.getConstraint = function() {
  if (goog.isDefAndNotNull(this.constraint_)) {
    return this.constraint_;
  }

  var pk = this.getIndices()[0];
  var notNullable = [
    this.id1,
    this.id2,
    this.photoId,
    this.albumId,
    this.totalComments
  ];
  var foreignKeys = [
    new lf.schema.ForeignKeySpec(
        {
          'local': 'photoId',
          'ref': 'Photo.id',
          'action': lf.ConstraintAction.CASCADE,
          'timing': lf.ConstraintTiming.IMMEDIATE
        }, 'Details', 'fk_photoId'),
    new lf.schema.ForeignKeySpec(
        {
          'local': 'albumId',
          'ref': 'Album.id',
          'action': lf.ConstraintAction.CASCADE,
          'timing': lf.ConstraintTiming.IMMEDIATE
        }, 'Details', 'fk_albumId')
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
lovefield.db.row.DetailsType = function() {
  /** @export @type {string} */
  this.id1;
  /** @export @type {number} */
  this.id2;
  /** @export @type {string} */
  this.photoId;
  /** @export @type {string} */
  this.albumId;
  /** @export @type {number} */
  this.totalComments;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
lovefield.db.row.DetailsDbType = function() {
  /** @export @type {string} */
  this.id1;
  /** @export @type {number} */
  this.id2;
  /** @export @type {string} */
  this.photoId;
  /** @export @type {string} */
  this.albumId;
  /** @export @type {number} */
  this.totalComments;
};



/**
 * Constructs a new Details row.
 * @constructor
 * @extends {lf.Row.<!lovefield.db.row.DetailsType,
 *     !lovefield.db.row.DetailsDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!lovefield.db.row.DetailsType=} opt_payload
 */
lovefield.db.row.Details = function(rowId, opt_payload) {
  lovefield.db.row.Details.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(lovefield.db.row.Details, lf.Row);


/** @override */
lovefield.db.row.Details.prototype.defaultPayload = function() {
  var payload = new lovefield.db.row.DetailsType();
  payload.id1 = '';
  payload.id2 = 0;
  payload.photoId = '';
  payload.albumId = '';
  payload.totalComments = 0;
  return payload;
};


/** @override */
lovefield.db.row.Details.prototype.toDbPayload = function() {
  var payload = new lovefield.db.row.DetailsDbType();
  payload.id1 = this.payload().id1;
  payload.id2 = this.payload().id2;
  payload.photoId = this.payload().photoId;
  payload.albumId = this.payload().albumId;
  payload.totalComments = this.payload().totalComments;
  return payload;
};


/** @override */
lovefield.db.row.Details.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Details.pkDetails':
      return [
        this.payload().id1,
        this.payload().id2
      ];
    case 'Details.uq_photoId':
      return this.payload().photoId;
    case 'Details.fk_photoId':
      return this.payload().photoId;
    case 'Details.fk_albumId':
      return this.payload().albumId;
    case 'Details.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
lovefield.db.row.Details.prototype.getId1 = function() {
  return this.payload().id1;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.Details}
*/
lovefield.db.row.Details.prototype.setId1 = function(value) {
  this.payload().id1 = value;
  return this;
};


/** @return {number} */
lovefield.db.row.Details.prototype.getId2 = function() {
  return this.payload().id2;
};


/**
 * @param {number} value
 * @return {!lovefield.db.row.Details}
*/
lovefield.db.row.Details.prototype.setId2 = function(value) {
  this.payload().id2 = value;
  return this;
};


/** @return {string} */
lovefield.db.row.Details.prototype.getPhotoId = function() {
  return this.payload().photoId;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.Details}
*/
lovefield.db.row.Details.prototype.setPhotoId = function(value) {
  this.payload().photoId = value;
  return this;
};


/** @return {string} */
lovefield.db.row.Details.prototype.getAlbumId = function() {
  return this.payload().albumId;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.Details}
*/
lovefield.db.row.Details.prototype.setAlbumId = function(value) {
  this.payload().albumId = value;
  return this;
};


/** @return {number} */
lovefield.db.row.Details.prototype.getTotalComments = function() {
  return this.payload().totalComments;
};


/**
 * @param {number} value
 * @return {!lovefield.db.row.Details}
*/
lovefield.db.row.Details.prototype.setTotalComments = function(value) {
  this.payload().totalComments = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!lovefield.db.row.CuratorType,
 *     !lovefield.db.row.CuratorDbType>}
 * @constructor
 */
lovefield.db.schema.Curator = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, false, lf.Type.INTEGER);
  cols.push(this.id);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.name = new lf.schema.BaseColumn(
      this, 'name', false, false, lf.Type.STRING);
  cols.push(this.name);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.timestamp = new lf.schema.BaseColumn(
      this, 'timestamp', false, false, lf.Type.INTEGER);
  cols.push(this.timestamp);

  var indices = [
    new lf.schema.Index('Curator', 'pkCurator', true,
        [
          {schema: this.id, order: lf.Order.ASC, autoIncrement: true}
        ]),
    new lf.schema.Index('Curator', 'uq_creation', true,
        [
          {schema: this.name, order: lf.Order.ASC},
          {schema: this.timestamp, order: lf.Order.ASC}
        ])
  ];

  /** @private {!lf.schema.Constraint} */
  this.constraint_;

  lovefield.db.schema.Curator.base(
      this, 'constructor', 'Curator', cols, indices, false);
};
goog.inherits(lovefield.db.schema.Curator, lf.schema.Table);


/** @override */
lovefield.db.schema.Curator.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.Curator(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.Curator.prototype.deserializeRow =
    function(dbRecord) {
  var data = dbRecord['value'];
  return new lovefield.db.row.Curator(dbRecord['id'], data);
};


/** @override */
lovefield.db.schema.Curator.prototype.getConstraint = function() {
  if (goog.isDefAndNotNull(this.constraint_)) {
    return this.constraint_;
  }

  var pk = this.getIndices()[0];
  var notNullable = [
    this.id,
    this.name,
    this.timestamp
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
lovefield.db.row.CuratorType = function() {
  /** @export @type {number} */
  this.id;
  /** @export @type {string} */
  this.name;
  /** @export @type {number} */
  this.timestamp;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
lovefield.db.row.CuratorDbType = function() {
  /** @export @type {number} */
  this.id;
  /** @export @type {string} */
  this.name;
  /** @export @type {number} */
  this.timestamp;
};



/**
 * Constructs a new Curator row.
 * @constructor
 * @extends {lf.Row.<!lovefield.db.row.CuratorType,
 *     !lovefield.db.row.CuratorDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!lovefield.db.row.CuratorType=} opt_payload
 */
lovefield.db.row.Curator = function(rowId, opt_payload) {
  lovefield.db.row.Curator.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(lovefield.db.row.Curator, lf.Row);


/** @override */
lovefield.db.row.Curator.prototype.defaultPayload = function() {
  var payload = new lovefield.db.row.CuratorType();
  payload.id = 0;
  payload.name = '';
  payload.timestamp = 0;
  return payload;
};


/** @override */
lovefield.db.row.Curator.prototype.toDbPayload = function() {
  var payload = new lovefield.db.row.CuratorDbType();
  payload.id = this.payload().id;
  payload.name = this.payload().name;
  payload.timestamp = this.payload().timestamp;
  return payload;
};


/** @override */
lovefield.db.row.Curator.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Curator.pkCurator':
      return this.payload().id;
    case 'Curator.uq_creation':
      return [
        this.payload().name,
        this.payload().timestamp
      ];
    case 'Curator.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {number} */
lovefield.db.row.Curator.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {number} value
 * @return {!lovefield.db.row.Curator}
*/
lovefield.db.row.Curator.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
lovefield.db.row.Curator.prototype.getName = function() {
  return this.payload().name;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.Curator}
*/
lovefield.db.row.Curator.prototype.setName = function(value) {
  this.payload().name = value;
  return this;
};


/** @return {number} */
lovefield.db.row.Curator.prototype.getTimestamp = function() {
  return this.payload().timestamp;
};


/**
 * @param {number} value
 * @return {!lovefield.db.row.Curator}
*/
lovefield.db.row.Curator.prototype.setTimestamp = function(value) {
  this.payload().timestamp = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!lovefield.db.row.PhotoCuratorType,
 *     !lovefield.db.row.PhotoCuratorDbType>}
 * @constructor
 */
lovefield.db.schema.PhotoCurator = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.photoId = new lf.schema.BaseColumn(
      this, 'photoId', false, false, lf.Type.STRING);
  cols.push(this.photoId);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.curator = new lf.schema.BaseColumn(
      this, 'curator', false, false, lf.Type.INTEGER);
  cols.push(this.curator);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.topic = new lf.schema.BaseColumn(
      this, 'topic', true, false, lf.Type.STRING);
  cols.push(this.topic);

  var indices = [
    new lf.schema.Index('PhotoCurator', 'uq_topic', true,
        [
          {schema: this.topic, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('PhotoCurator', 'fk_photoId', false,
        [
          {schema: this.photoId, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('PhotoCurator', 'fk_curator', false,
        [
          {schema: this.curator, order: lf.Order.ASC}
        ])
  ];

  /** @private {!lf.schema.Constraint} */
  this.constraint_;

  lovefield.db.schema.PhotoCurator.base(
      this, 'constructor', 'PhotoCurator', cols, indices, false);
};
goog.inherits(lovefield.db.schema.PhotoCurator, lf.schema.Table);


/** @override */
lovefield.db.schema.PhotoCurator.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.PhotoCurator(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.PhotoCurator.prototype.deserializeRow =
    function(dbRecord) {
  var data = dbRecord['value'];
  return new lovefield.db.row.PhotoCurator(dbRecord['id'], data);
};


/** @override */
lovefield.db.schema.PhotoCurator.prototype.getConstraint = function() {
  if (goog.isDefAndNotNull(this.constraint_)) {
    return this.constraint_;
  }

  var pk = null;
  var notNullable = [
    this.photoId,
    this.curator,
    this.topic
  ];
  var foreignKeys = [
    new lf.schema.ForeignKeySpec(
        {
          'local': 'photoId',
          'ref': 'Photo.id',
          'action': lf.ConstraintAction.CASCADE,
          'timing': lf.ConstraintTiming.IMMEDIATE
        }, 'PhotoCurator', 'fk_photoId'),
    new lf.schema.ForeignKeySpec(
        {
          'local': 'curator',
          'ref': 'Curator.id',
          'action': lf.ConstraintAction.CASCADE,
          'timing': lf.ConstraintTiming.IMMEDIATE
        }, 'PhotoCurator', 'fk_curator')
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
lovefield.db.row.PhotoCuratorType = function() {
  /** @export @type {string} */
  this.photoId;
  /** @export @type {number} */
  this.curator;
  /** @export @type {string} */
  this.topic;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
lovefield.db.row.PhotoCuratorDbType = function() {
  /** @export @type {string} */
  this.photoId;
  /** @export @type {number} */
  this.curator;
  /** @export @type {string} */
  this.topic;
};



/**
 * Constructs a new PhotoCurator row.
 * @constructor
 * @extends {lf.Row.<!lovefield.db.row.PhotoCuratorType,
 *     !lovefield.db.row.PhotoCuratorDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!lovefield.db.row.PhotoCuratorType=} opt_payload
 */
lovefield.db.row.PhotoCurator = function(rowId, opt_payload) {
  lovefield.db.row.PhotoCurator.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(lovefield.db.row.PhotoCurator, lf.Row);


/** @override */
lovefield.db.row.PhotoCurator.prototype.defaultPayload = function() {
  var payload = new lovefield.db.row.PhotoCuratorType();
  payload.photoId = '';
  payload.curator = 0;
  payload.topic = '';
  return payload;
};


/** @override */
lovefield.db.row.PhotoCurator.prototype.toDbPayload = function() {
  var payload = new lovefield.db.row.PhotoCuratorDbType();
  payload.photoId = this.payload().photoId;
  payload.curator = this.payload().curator;
  payload.topic = this.payload().topic;
  return payload;
};


/** @override */
lovefield.db.row.PhotoCurator.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'PhotoCurator.uq_topic':
      return this.payload().topic;
    case 'PhotoCurator.fk_photoId':
      return this.payload().photoId;
    case 'PhotoCurator.fk_curator':
      return this.payload().curator;
    case 'PhotoCurator.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
lovefield.db.row.PhotoCurator.prototype.getPhotoId = function() {
  return this.payload().photoId;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.PhotoCurator}
*/
lovefield.db.row.PhotoCurator.prototype.setPhotoId = function(value) {
  this.payload().photoId = value;
  return this;
};


/** @return {number} */
lovefield.db.row.PhotoCurator.prototype.getCurator = function() {
  return this.payload().curator;
};


/**
 * @param {number} value
 * @return {!lovefield.db.row.PhotoCurator}
*/
lovefield.db.row.PhotoCurator.prototype.setCurator = function(value) {
  this.payload().curator = value;
  return this;
};


/** @return {string} */
lovefield.db.row.PhotoCurator.prototype.getTopic = function() {
  return this.payload().topic;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.PhotoCurator}
*/
lovefield.db.row.PhotoCurator.prototype.setTopic = function(value) {
  this.payload().topic = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!lovefield.db.row.NullableTableType,
 *     !lovefield.db.row.NullableTableDbType>}
 * @constructor
 */
lovefield.db.schema.NullableTable = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.boolean = new lf.schema.BaseColumn(
      this, 'boolean', false, true, lf.Type.BOOLEAN);
  cols.push(this.boolean);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.datetime = new lf.schema.BaseColumn(
      this, 'datetime', false, true, lf.Type.DATE_TIME);
  cols.push(this.datetime);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.integer = new lf.schema.BaseColumn(
      this, 'integer', false, true, lf.Type.INTEGER);
  cols.push(this.integer);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.number = new lf.schema.BaseColumn(
      this, 'number', false, true, lf.Type.NUMBER);
  cols.push(this.number);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.string = new lf.schema.BaseColumn(
      this, 'string', false, true, lf.Type.STRING);
  cols.push(this.string);

  var indices = [
    new lf.schema.Index('NullableTable', 'idx_boolean', false,
        [
          {schema: this.boolean, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('NullableTable', 'idx_datetime', false,
        [
          {schema: this.datetime, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('NullableTable', 'idx_integer', false,
        [
          {schema: this.integer, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('NullableTable', 'idx_number', false,
        [
          {schema: this.number, order: lf.Order.ASC}
        ]),
    new lf.schema.Index('NullableTable', 'idx_string', false,
        [
          {schema: this.string, order: lf.Order.ASC}
        ])
  ];

  /** @private {!lf.schema.Constraint} */
  this.constraint_;

  lovefield.db.schema.NullableTable.base(
      this, 'constructor', 'NullableTable', cols, indices, false);
};
goog.inherits(lovefield.db.schema.NullableTable, lf.schema.Table);


/** @override */
lovefield.db.schema.NullableTable.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.NullableTable(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.NullableTable.prototype.deserializeRow =
    function(dbRecord) {
  var data = dbRecord['value'];
  data.datetime = goog.isDefAndNotNull(data.datetime) ?
      new Date(data.datetime) : null;
  return new lovefield.db.row.NullableTable(dbRecord['id'], data);
};


/** @override */
lovefield.db.schema.NullableTable.prototype.getConstraint = function() {
  if (goog.isDefAndNotNull(this.constraint_)) {
    return this.constraint_;
  }

  var pk = null;
  var notNullable = [

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
lovefield.db.row.NullableTableType = function() {
  /** @export @type {?boolean} */
  this.boolean;
  /** @export @type {?Date} */
  this.datetime;
  /** @export @type {?number} */
  this.integer;
  /** @export @type {?number} */
  this.number;
  /** @export @type {?string} */
  this.string;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
lovefield.db.row.NullableTableDbType = function() {
  /** @export @type {?boolean} */
  this.boolean;
  /** @export @type {?number} */
  this.datetime;
  /** @export @type {?number} */
  this.integer;
  /** @export @type {?number} */
  this.number;
  /** @export @type {?string} */
  this.string;
};



/**
 * Constructs a new NullableTable row.
 * @constructor
 * @extends {lf.Row.<!lovefield.db.row.NullableTableType,
 *     !lovefield.db.row.NullableTableDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!lovefield.db.row.NullableTableType=} opt_payload
 */
lovefield.db.row.NullableTable = function(rowId, opt_payload) {
  lovefield.db.row.NullableTable.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(lovefield.db.row.NullableTable, lf.Row);


/** @override */
lovefield.db.row.NullableTable.prototype.defaultPayload = function() {
  var payload = new lovefield.db.row.NullableTableType();
  payload.boolean = null;
  payload.datetime = null;
  payload.integer = null;
  payload.number = null;
  payload.string = null;
  return payload;
};


/** @override */
lovefield.db.row.NullableTable.prototype.toDbPayload = function() {
  var payload = new lovefield.db.row.NullableTableDbType();
  payload.boolean = this.payload().boolean;
  payload.datetime =
      goog.isDefAndNotNull(this.payload().datetime) ?
      this.payload().datetime.getTime() : null;
  payload.integer = this.payload().integer;
  payload.number = this.payload().number;
  payload.string = this.payload().string;
  return payload;
};


/** @override */
lovefield.db.row.NullableTable.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'NullableTable.idx_boolean':
      var value = this.payload().boolean;
      return goog.isDefAndNotNull(value) ? (value ? 1 : 0) : null;
    case 'NullableTable.idx_datetime':
      var value = this.payload().datetime;
      return goog.isDefAndNotNull(value) ? value.getTime() : null;
    case 'NullableTable.idx_integer':
      return this.payload().integer;
    case 'NullableTable.idx_number':
      return this.payload().number;
    case 'NullableTable.idx_string':
      return this.payload().string;
    case 'NullableTable.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {?boolean} */
lovefield.db.row.NullableTable.prototype.getBoolean = function() {
  return this.payload().boolean;
};


/**
 * @param {?boolean} value
 * @return {!lovefield.db.row.NullableTable}
*/
lovefield.db.row.NullableTable.prototype.setBoolean = function(value) {
  this.payload().boolean = value;
  return this;
};


/** @return {?Date} */
lovefield.db.row.NullableTable.prototype.getDatetime = function() {
  return this.payload().datetime;
};


/**
 * @param {?Date} value
 * @return {!lovefield.db.row.NullableTable}
*/
lovefield.db.row.NullableTable.prototype.setDatetime = function(value) {
  this.payload().datetime = value;
  return this;
};


/** @return {?number} */
lovefield.db.row.NullableTable.prototype.getInteger = function() {
  return this.payload().integer;
};


/**
 * @param {?number} value
 * @return {!lovefield.db.row.NullableTable}
*/
lovefield.db.row.NullableTable.prototype.setInteger = function(value) {
  this.payload().integer = value;
  return this;
};


/** @return {?number} */
lovefield.db.row.NullableTable.prototype.getNumber = function() {
  return this.payload().number;
};


/**
 * @param {?number} value
 * @return {!lovefield.db.row.NullableTable}
*/
lovefield.db.row.NullableTable.prototype.setNumber = function(value) {
  this.payload().number = value;
  return this;
};


/** @return {?string} */
lovefield.db.row.NullableTable.prototype.getString = function() {
  return this.payload().string;
};


/**
 * @param {?string} value
 * @return {!lovefield.db.row.NullableTable}
*/
lovefield.db.row.NullableTable.prototype.setString = function(value) {
  this.payload().string = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!lovefield.db.row.SelfLoopType,
 *     !lovefield.db.row.SelfLoopDbType>}
 * @constructor
 */
lovefield.db.schema.SelfLoop = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, false, lf.Type.STRING);
  cols.push(this.id);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.associate = new lf.schema.BaseColumn(
      this, 'associate', false, false, lf.Type.STRING);
  cols.push(this.associate);

  var indices = [
    new lf.schema.Index('SelfLoop', 'pkSelfLoop', true,
        [
          {schema: this.id, order: lf.Order.ASC, autoIncrement: false}
        ]),
    new lf.schema.Index('SelfLoop', 'fkAssociate', false,
        [
          {schema: this.associate, order: lf.Order.ASC}
        ])
  ];

  /** @private {!lf.schema.Constraint} */
  this.constraint_;

  lovefield.db.schema.SelfLoop.base(
      this, 'constructor', 'SelfLoop', cols, indices, false);
};
goog.inherits(lovefield.db.schema.SelfLoop, lf.schema.Table);


/** @override */
lovefield.db.schema.SelfLoop.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.SelfLoop(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.SelfLoop.prototype.deserializeRow =
    function(dbRecord) {
  var data = dbRecord['value'];
  return new lovefield.db.row.SelfLoop(dbRecord['id'], data);
};


/** @override */
lovefield.db.schema.SelfLoop.prototype.getConstraint = function() {
  if (goog.isDefAndNotNull(this.constraint_)) {
    return this.constraint_;
  }

  var pk = this.getIndices()[0];
  var notNullable = [
    this.id,
    this.associate
  ];
  var foreignKeys = [
    new lf.schema.ForeignKeySpec(
        {
          'local': 'associate',
          'ref': 'SelfLoop.id',
          'action': lf.ConstraintAction.CASCADE,
          'timing': lf.ConstraintTiming.IMMEDIATE
        }, 'SelfLoop', 'fkAssociate')
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
lovefield.db.row.SelfLoopType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.associate;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
lovefield.db.row.SelfLoopDbType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.associate;
};



/**
 * Constructs a new SelfLoop row.
 * @constructor
 * @extends {lf.Row.<!lovefield.db.row.SelfLoopType,
 *     !lovefield.db.row.SelfLoopDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!lovefield.db.row.SelfLoopType=} opt_payload
 */
lovefield.db.row.SelfLoop = function(rowId, opt_payload) {
  lovefield.db.row.SelfLoop.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(lovefield.db.row.SelfLoop, lf.Row);


/** @override */
lovefield.db.row.SelfLoop.prototype.defaultPayload = function() {
  var payload = new lovefield.db.row.SelfLoopType();
  payload.id = '';
  payload.associate = '';
  return payload;
};


/** @override */
lovefield.db.row.SelfLoop.prototype.toDbPayload = function() {
  var payload = new lovefield.db.row.SelfLoopDbType();
  payload.id = this.payload().id;
  payload.associate = this.payload().associate;
  return payload;
};


/** @override */
lovefield.db.row.SelfLoop.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'SelfLoop.pkSelfLoop':
      return this.payload().id;
    case 'SelfLoop.fkAssociate':
      return this.payload().associate;
    case 'SelfLoop.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
lovefield.db.row.SelfLoop.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.SelfLoop}
*/
lovefield.db.row.SelfLoop.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
lovefield.db.row.SelfLoop.prototype.getAssociate = function() {
  return this.payload().associate;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.SelfLoop}
*/
lovefield.db.row.SelfLoop.prototype.setAssociate = function(value) {
  this.payload().associate = value;
  return this;
};
