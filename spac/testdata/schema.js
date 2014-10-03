goog.provide('lovefield.db.row.Album');
goog.provide('lovefield.db.row.AlbumDbType');
goog.provide('lovefield.db.row.AlbumType');
goog.provide('lovefield.db.row.Curator');
goog.provide('lovefield.db.row.CuratorDbType');
goog.provide('lovefield.db.row.CuratorType');
goog.provide('lovefield.db.row.Photo');
goog.provide('lovefield.db.row.PhotoCurator');
goog.provide('lovefield.db.row.PhotoCuratorDbType');
goog.provide('lovefield.db.row.PhotoCuratorType');
goog.provide('lovefield.db.row.PhotoDbType');
goog.provide('lovefield.db.row.PhotoDetails');
goog.provide('lovefield.db.row.PhotoDetailsDbType');
goog.provide('lovefield.db.row.PhotoDetailsType');
goog.provide('lovefield.db.row.PhotoType');
goog.provide('lovefield.db.schema.Album');
goog.provide('lovefield.db.schema.Curator');
goog.provide('lovefield.db.schema.Database');
goog.provide('lovefield.db.schema.Photo');
goog.provide('lovefield.db.schema.PhotoCurator');
goog.provide('lovefield.db.schema.PhotoDetails');

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
lovefield.db.schema.Database = function() {
  /** @private {!lovefield.db.schema.Album} */
  this.album_ = new lovefield.db.schema.Album();

  /** @private {!lovefield.db.schema.Photo} */
  this.photo_ = new lovefield.db.schema.Photo();

  /** @private {!lovefield.db.schema.PhotoDetails} */
  this.photoDetails_ = new lovefield.db.schema.PhotoDetails();

  /** @private {!lovefield.db.schema.Curator} */
  this.curator_ = new lovefield.db.schema.Curator();

  /** @private {!lovefield.db.schema.PhotoCurator} */
  this.photoCurator_ = new lovefield.db.schema.PhotoCurator();

};


/** @override */
lovefield.db.schema.Database.prototype.getName = function() {
  return 'db';
};


/** @override */
lovefield.db.schema.Database.prototype.getVersion = function() {
  return 1;
};


/** @override */
lovefield.db.schema.Database.prototype.getTables = function() {
  return [
    this.album_,
    this.photo_,
    this.photoDetails_,
    this.curator_,
    this.photoCurator_
  ];
};


/** @return {!lovefield.db.schema.Album} */
lovefield.db.schema.Database.prototype.getAlbum = function() {
  return this.album_;
};


/** @return {!lovefield.db.schema.Photo} */
lovefield.db.schema.Database.prototype.getPhoto = function() {
  return this.photo_;
};


/** @return {!lovefield.db.schema.PhotoDetails} */
lovefield.db.schema.Database.prototype.getPhotoDetails = function() {
  return this.photoDetails_;
};


/** @return {!lovefield.db.schema.Curator} */
lovefield.db.schema.Database.prototype.getCurator = function() {
  return this.curator_;
};


/** @return {!lovefield.db.schema.PhotoCurator} */
lovefield.db.schema.Database.prototype.getPhotoCurator = function() {
  return this.photoCurator_;
};



/**
 * @implements {lf.schema.Table.<!lovefield.db.row.AlbumType,
 *     !lovefield.db.row.AlbumDbType>}
 * @constructor
 */
lovefield.db.schema.Album = function() {
  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.isLocal = new lf.schema.BaseColumn(
      this, 'isLocal', false, lf.Type.BOOLEAN);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.createdByAction = new lf.schema.BaseColumn(
      this, 'createdByAction', false, lf.Type.BOOLEAN);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.timestamp = new lf.schema.BaseColumn(
      this, 'timestamp', false, lf.Type.DATE_TIME);

  /** @type {!lf.schema.BaseColumn.<!ArrayBuffer>} */
  this.tacotownJspb = new lf.schema.BaseColumn(
      this, 'tacotownJspb', false, lf.Type.ARRAY_BUFFER);

};


/** @override */
lovefield.db.schema.Album.prototype.getName = function() {
  return 'Album';
};


/** @override */
lovefield.db.schema.Album.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.Album(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.Album.prototype.deserializeRow = function(dbRecord) {
  var rowId = dbRecord['id'];
  var data = dbRecord['value'];
  var payload = new lovefield.db.row.AlbumType();
  payload.id = data.id;
  payload.isLocal = data.isLocal;
  payload.createdByAction = data.createdByAction;
  payload.timestamp = new Date(data.timestamp);
  payload.tacotownJspb = /** @type {!ArrayBuffer} */ (
      lf.Row.hexToBin(data.tacotownJspb));
  return new lovefield.db.row.Album(rowId, payload);
};


/** @override */
lovefield.db.schema.Album.prototype.getIndices = function() {
  return [
    new lf.schema.Index('Album', 'pkAlbum', true, ['id']),
    new lf.schema.Index('Album', 'idx_timestamp', false, ['timestamp']),
    new lf.schema.Index('Album', 'idx_localId', false, ['isLocal', 'id'])
  ];
};


/** @override */
lovefield.db.schema.Album.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('Album', 'pkAlbum', true, ['id']);
  var nullable = [];
  var foreignKeys = [];
  var unique = [];
  return new lf.schema.Constraint(
      primaryKey, nullable, foreignKeys, unique);
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
  /** @export @type {!ArrayBuffer} */
  this.tacotownJspb;
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
  /** @export @type {string} */
  this.tacotownJspb;
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
  payload.tacotownJspb = new ArrayBuffer(0);
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
  return payload;
};


/** @override */
lovefield.db.row.Album.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Album.pkAlbum':
      return this.payload().id;
    case 'Album.idx_timestamp':
      return this.payload().timestamp.getTime();
    case 'Album.idx_localId':
      return this.payload().isLocal.toString() + '_' + this.payload().id;
    case '##row_id##':
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


/** @return {!ArrayBuffer} */
lovefield.db.row.Album.prototype.getTacotownJspb = function() {
  return this.payload().tacotownJspb;
};


/**
 * @param {!ArrayBuffer} value
 * @return {!lovefield.db.row.Album}
*/
lovefield.db.row.Album.prototype.setTacotownJspb = function(value) {
  this.payload().tacotownJspb = value;
  return this;
};



/**
 * @implements {lf.schema.Table.<!lovefield.db.row.PhotoType,
 *     !lovefield.db.row.PhotoDbType>}
 * @constructor
 */
lovefield.db.schema.Photo = function() {
  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.imageHash = new lf.schema.BaseColumn(
      this, 'imageHash', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.isLocal = new lf.schema.BaseColumn(
      this, 'isLocal', false, lf.Type.BOOLEAN);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.createdByAction = new lf.schema.BaseColumn(
      this, 'createdByAction', false, lf.Type.BOOLEAN);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.timestamp = new lf.schema.BaseColumn(
      this, 'timestamp', false, lf.Type.DATE_TIME);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.accessTimestamp = new lf.schema.BaseColumn(
      this, 'accessTimestamp', false, lf.Type.DATE_TIME);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.albumId = new lf.schema.BaseColumn(
      this, 'albumId', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.isCoverPhoto = new lf.schema.BaseColumn(
      this, 'isCoverPhoto', false, lf.Type.BOOLEAN);

  /** @type {!lf.schema.BaseColumn.<!ArrayBuffer>} */
  this.tacotownJspb = new lf.schema.BaseColumn(
      this, 'tacotownJspb', false, lf.Type.ARRAY_BUFFER);

};


/** @override */
lovefield.db.schema.Photo.prototype.getName = function() {
  return 'Photo';
};


/** @override */
lovefield.db.schema.Photo.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.Photo(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.Photo.prototype.deserializeRow = function(dbRecord) {
  var rowId = dbRecord['id'];
  var data = dbRecord['value'];
  var payload = new lovefield.db.row.PhotoType();
  payload.id = data.id;
  payload.imageHash = data.imageHash;
  payload.isLocal = data.isLocal;
  payload.createdByAction = data.createdByAction;
  payload.timestamp = new Date(data.timestamp);
  payload.accessTimestamp = goog.isNull(data.accessTimestamp) ?
      null : new Date(data.accessTimestamp);
  payload.albumId = data.albumId;
  payload.isCoverPhoto = data.isCoverPhoto;
  payload.tacotownJspb = lf.Row.hexToBin(data.tacotownJspb);
  return new lovefield.db.row.Photo(rowId, payload);
};


/** @override */
lovefield.db.schema.Photo.prototype.getIndices = function() {
  return [
    new lf.schema.Index('Photo', 'pkPhoto', true, ['id']),
    new lf.schema.Index('Photo', 'idx_timestamp', false, ['timestamp'])
  ];
};


/** @override */
lovefield.db.schema.Photo.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('Photo', 'pkPhoto', true, ['id']);
  var nullable = [this.tacotownJspb, this.accessTimestamp, this.imageHash];
  var foreignKeys = [];
  var unique = [];
  return new lf.schema.Constraint(
      primaryKey, nullable, foreignKeys, unique);
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
  /** @export @type {?string} */
  this.imageHash;
  /** @export @type {boolean} */
  this.isLocal;
  /** @export @type {boolean} */
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
  /** @export @type {?string} */
  this.imageHash;
  /** @export @type {boolean} */
  this.isLocal;
  /** @export @type {boolean} */
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
  payload.imageHash = null;
  payload.isLocal = false;
  payload.createdByAction = false;
  payload.timestamp = new Date(0);
  payload.accessTimestamp = null;
  payload.albumId = '';
  payload.isCoverPhoto = false;
  payload.tacotownJspb = null;
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
  payload.accessTimestamp = goog.isNull(this.payload().accessTimestamp) ?
      null : this.payload().accessTimestamp.getTime();
  payload.albumId = this.payload().albumId;
  payload.isCoverPhoto = this.payload().isCoverPhoto;
  payload.tacotownJspb = lf.Row.binToHex(this.payload().tacotownJspb);
  return payload;
};


/** @override */
lovefield.db.row.Photo.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Photo.pkPhoto':
      return this.payload().id;
    case 'Photo.idx_timestamp':
      return this.payload().timestamp.getTime();
    case '##row_id##':
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


/** @return {?string} */
lovefield.db.row.Photo.prototype.getImageHash = function() {
  return this.payload().imageHash;
};


/**
 * @param {?string} value
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


/** @return {boolean} */
lovefield.db.row.Photo.prototype.getCreatedByAction = function() {
  return this.payload().createdByAction;
};


/**
 * @param {boolean} value
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



/**
 * @implements {lf.schema.Table.<!lovefield.db.row.PhotoDetailsType,
 *     !lovefield.db.row.PhotoDetailsDbType>}
 * @constructor
 */
lovefield.db.schema.PhotoDetails = function() {
  /** @type {!lf.schema.BaseColumn.<string>} */
  this.photoId = new lf.schema.BaseColumn(
      this, 'photoId', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.albumId = new lf.schema.BaseColumn(
      this, 'albumId', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.totalComments = new lf.schema.BaseColumn(
      this, 'totalComments', false, lf.Type.INTEGER);

};


/** @override */
lovefield.db.schema.PhotoDetails.prototype.getName = function() {
  return 'PhotoDetails';
};


/** @override */
lovefield.db.schema.PhotoDetails.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.PhotoDetails(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.PhotoDetails.prototype.deserializeRow = function(dbRecord) {
  var rowId = dbRecord['id'];
  var data = dbRecord['value'];
  var payload = new lovefield.db.row.PhotoDetailsType();
  payload.photoId = data.photoId;
  payload.albumId = data.albumId;
  payload.totalComments = data.totalComments;
  return new lovefield.db.row.PhotoDetails(rowId, payload);
};


/** @override */
lovefield.db.schema.PhotoDetails.prototype.getIndices = function() {
  return [
    new lf.schema.Index('PhotoDetails', 'idx_id', false, ['albumId', 'photoId'])
  ];
};


/** @override */
lovefield.db.schema.PhotoDetails.prototype.getConstraint = function() {
  var primaryKey = null;
  var nullable = [];
  var foreignKeys = [];
  var unique = [];
  return new lf.schema.Constraint(
      primaryKey, nullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
lovefield.db.row.PhotoDetailsType = function() {
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
lovefield.db.row.PhotoDetailsDbType = function() {
  /** @export @type {string} */
  this.photoId;
  /** @export @type {string} */
  this.albumId;
  /** @export @type {number} */
  this.totalComments;
};



/**
 * Constructs a new PhotoDetails row.
 * @constructor
 * @extends {lf.Row.<!lovefield.db.row.PhotoDetailsType,
 *     !lovefield.db.row.PhotoDetailsDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!lovefield.db.row.PhotoDetailsType=} opt_payload
 */
lovefield.db.row.PhotoDetails = function(rowId, opt_payload) {
  lovefield.db.row.PhotoDetails.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(lovefield.db.row.PhotoDetails, lf.Row);


/** @override */
lovefield.db.row.PhotoDetails.prototype.defaultPayload = function() {
  var payload = new lovefield.db.row.PhotoDetailsType();
  payload.photoId = '';
  payload.albumId = '';
  payload.totalComments = 0;
  return payload;
};


/** @override */
lovefield.db.row.PhotoDetails.prototype.toDbPayload = function() {
  var payload = new lovefield.db.row.PhotoDetailsDbType();
  payload.photoId = this.payload().photoId;
  payload.albumId = this.payload().albumId;
  payload.totalComments = this.payload().totalComments;
  return payload;
};


/** @override */
lovefield.db.row.PhotoDetails.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'PhotoDetails.idx_id':
      return this.payload().albumId + '_' + this.payload().photoId;
    case '##row_id##':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
lovefield.db.row.PhotoDetails.prototype.getPhotoId = function() {
  return this.payload().photoId;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.PhotoDetails}
*/
lovefield.db.row.PhotoDetails.prototype.setPhotoId = function(value) {
  this.payload().photoId = value;
  return this;
};


/** @return {string} */
lovefield.db.row.PhotoDetails.prototype.getAlbumId = function() {
  return this.payload().albumId;
};


/**
 * @param {string} value
 * @return {!lovefield.db.row.PhotoDetails}
*/
lovefield.db.row.PhotoDetails.prototype.setAlbumId = function(value) {
  this.payload().albumId = value;
  return this;
};


/** @return {number} */
lovefield.db.row.PhotoDetails.prototype.getTotalComments = function() {
  return this.payload().totalComments;
};


/**
 * @param {number} value
 * @return {!lovefield.db.row.PhotoDetails}
*/
lovefield.db.row.PhotoDetails.prototype.setTotalComments = function(value) {
  this.payload().totalComments = value;
  return this;
};



/**
 * @implements {lf.schema.Table.<!lovefield.db.row.CuratorType,
 *     !lovefield.db.row.CuratorDbType>}
 * @constructor
 */
lovefield.db.schema.Curator = function() {
  /** @type {!lf.schema.BaseColumn.<number>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.INTEGER);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.name = new lf.schema.BaseColumn(
      this, 'name', false, lf.Type.STRING);

};


/** @override */
lovefield.db.schema.Curator.prototype.getName = function() {
  return 'Curator';
};


/** @override */
lovefield.db.schema.Curator.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.Curator(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.Curator.prototype.deserializeRow = function(dbRecord) {
  var rowId = dbRecord['id'];
  var data = dbRecord['value'];
  var payload = new lovefield.db.row.CuratorType();
  payload.id = data.id;
  payload.name = data.name;
  return new lovefield.db.row.Curator(rowId, payload);
};


/** @override */
lovefield.db.schema.Curator.prototype.getIndices = function() {
  return [
    new lf.schema.Index('Curator', 'pkCurator', true, ['id'])
  ];
};


/** @override */
lovefield.db.schema.Curator.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('Curator', 'pkCurator', true, ['id']);
  var nullable = [];
  var foreignKeys = [];
  var unique = [];
  return new lf.schema.Constraint(
      primaryKey, nullable, foreignKeys, unique);
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
  return payload;
};


/** @override */
lovefield.db.row.Curator.prototype.toDbPayload = function() {
  var payload = new lovefield.db.row.CuratorDbType();
  payload.id = this.payload().id;
  payload.name = this.payload().name;
  return payload;
};


/** @override */
lovefield.db.row.Curator.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Curator.pkCurator':
      return this.payload().id;
    case '##row_id##':
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



/**
 * @implements {lf.schema.Table.<!lovefield.db.row.PhotoCuratorType,
 *     !lovefield.db.row.PhotoCuratorDbType>}
 * @constructor
 */
lovefield.db.schema.PhotoCurator = function() {
  /** @type {!lf.schema.BaseColumn.<string>} */
  this.photoId = new lf.schema.BaseColumn(
      this, 'photoId', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.curator = new lf.schema.BaseColumn(
      this, 'curator', false, lf.Type.INTEGER);

};


/** @override */
lovefield.db.schema.PhotoCurator.prototype.getName = function() {
  return 'PhotoCurator';
};


/** @override */
lovefield.db.schema.PhotoCurator.prototype.createRow = function(opt_value) {
  return new lovefield.db.row.PhotoCurator(lf.Row.getNextId(), opt_value);
};


/** @override */
lovefield.db.schema.PhotoCurator.prototype.deserializeRow = function(dbRecord) {
  var rowId = dbRecord['id'];
  var data = dbRecord['value'];
  var payload = new lovefield.db.row.PhotoCuratorType();
  payload.photoId = data.photoId;
  payload.curator = data.curator;
  return new lovefield.db.row.PhotoCurator(rowId, payload);
};


/** @override */
lovefield.db.schema.PhotoCurator.prototype.getIndices = function() {
  return [

  ];
};


/** @override */
lovefield.db.schema.PhotoCurator.prototype.getConstraint = function() {
  var primaryKey = null;
  var nullable = [];
  var foreignKeys = [];
  var unique = [];
  return new lf.schema.Constraint(
      primaryKey, nullable, foreignKeys, unique);
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
  return payload;
};


/** @override */
lovefield.db.row.PhotoCurator.prototype.toDbPayload = function() {
  var payload = new lovefield.db.row.PhotoCuratorDbType();
  payload.photoId = this.payload().photoId;
  payload.curator = this.payload().curator;
  return payload;
};


/** @override */
lovefield.db.row.PhotoCurator.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case '##row_id##':
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
