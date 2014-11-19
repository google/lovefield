goog.provide('movie.db.row.Actor');
goog.provide('movie.db.row.ActorDbType');
goog.provide('movie.db.row.ActorType');
goog.provide('movie.db.row.Director');
goog.provide('movie.db.row.DirectorDbType');
goog.provide('movie.db.row.DirectorType');
goog.provide('movie.db.row.Movie');
goog.provide('movie.db.row.MovieActor');
goog.provide('movie.db.row.MovieActorDbType');
goog.provide('movie.db.row.MovieActorType');
goog.provide('movie.db.row.MovieDbType');
goog.provide('movie.db.row.MovieDirector');
goog.provide('movie.db.row.MovieDirectorDbType');
goog.provide('movie.db.row.MovieDirectorType');
goog.provide('movie.db.row.MovieGenre');
goog.provide('movie.db.row.MovieGenreDbType');
goog.provide('movie.db.row.MovieGenreType');
goog.provide('movie.db.row.MovieType');
goog.provide('movie.db.schema.Actor');
goog.provide('movie.db.schema.Database');
goog.provide('movie.db.schema.Director');
goog.provide('movie.db.schema.Movie');
goog.provide('movie.db.schema.MovieActor');
goog.provide('movie.db.schema.MovieDirector');
goog.provide('movie.db.schema.MovieGenre');

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
movie.db.schema.Database = function() {
  /** @private {!movie.db.schema.Movie} */
  this.movie_ = new movie.db.schema.Movie();

  /** @private {!movie.db.schema.Actor} */
  this.actor_ = new movie.db.schema.Actor();

  /** @private {!movie.db.schema.Director} */
  this.director_ = new movie.db.schema.Director();

  /** @private {!movie.db.schema.MovieGenre} */
  this.movieGenre_ = new movie.db.schema.MovieGenre();

  /** @private {!movie.db.schema.MovieDirector} */
  this.movieDirector_ = new movie.db.schema.MovieDirector();

  /** @private {!movie.db.schema.MovieActor} */
  this.movieActor_ = new movie.db.schema.MovieActor();

};


/** @override */
movie.db.schema.Database.prototype.getName = function() {
  return 'mv';
};


/** @override */
movie.db.schema.Database.prototype.getVersion = function() {
  return 1;
};


/** @override */
movie.db.schema.Database.prototype.getTables = function() {
  return [
    this.movie_,
    this.actor_,
    this.director_,
    this.movieGenre_,
    this.movieDirector_,
    this.movieActor_
  ];
};


/** @return {!movie.db.schema.Movie} */
movie.db.schema.Database.prototype.getMovie = function() {
  return this.movie_;
};


/** @return {!movie.db.schema.Actor} */
movie.db.schema.Database.prototype.getActor = function() {
  return this.actor_;
};


/** @return {!movie.db.schema.Director} */
movie.db.schema.Database.prototype.getDirector = function() {
  return this.director_;
};


/** @return {!movie.db.schema.MovieGenre} */
movie.db.schema.Database.prototype.getMovieGenre = function() {
  return this.movieGenre_;
};


/** @return {!movie.db.schema.MovieDirector} */
movie.db.schema.Database.prototype.getMovieDirector = function() {
  return this.movieDirector_;
};


/** @return {!movie.db.schema.MovieActor} */
movie.db.schema.Database.prototype.getMovieActor = function() {
  return this.movieActor_;
};



/**
 * @extends {lf.schema.Table.<!movie.db.row.MovieType,
 *     !movie.db.row.MovieDbType>}
 * @constructor
 */
movie.db.schema.Movie = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.INTEGER);
  cols.push(this.id);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.title = new lf.schema.BaseColumn(
      this, 'title', false, lf.Type.STRING);
  cols.push(this.title);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.year = new lf.schema.BaseColumn(
      this, 'year', false, lf.Type.INTEGER);
  cols.push(this.year);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.rating = new lf.schema.BaseColumn(
      this, 'rating', false, lf.Type.STRING);
  cols.push(this.rating);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.company = new lf.schema.BaseColumn(
      this, 'company', false, lf.Type.STRING);
  cols.push(this.company);

  var indices = [
    new lf.schema.Index('Movie', 'pkMovie', true, ['id'])
  ];

  movie.db.schema.Movie.base(
      this, 'constructor', 'Movie', cols, indices, false);
};
goog.inherits(movie.db.schema.Movie, lf.schema.Table);


/** @override */
movie.db.schema.Movie.prototype.createRow = function(opt_value) {
  return new movie.db.row.Movie(lf.Row.getNextId(), opt_value);
};


/** @override */
movie.db.schema.Movie.prototype.deserializeRow = function(dbRecord) {
  return new movie.db.row.Movie(dbRecord['id'], dbRecord['value']);
};


/** @override */
movie.db.schema.Movie.prototype.getConstraint = function() {
  var pk = new lf.schema.Index('Movie', 'pkMovie', true, ['id']);
  var notNullable = [
    this.id,
    this.title,
    this.year,
    this.rating,
    this.company
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(pk, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.MovieType = function() {
  /** @export @type {number} */
  this.id;
  /** @export @type {string} */
  this.title;
  /** @export @type {number} */
  this.year;
  /** @export @type {string} */
  this.rating;
  /** @export @type {string} */
  this.company;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.MovieDbType = function() {
  /** @export @type {number} */
  this.id;
  /** @export @type {string} */
  this.title;
  /** @export @type {number} */
  this.year;
  /** @export @type {string} */
  this.rating;
  /** @export @type {string} */
  this.company;
};



/**
 * Constructs a new Movie row.
 * @constructor
 * @extends {lf.Row.<!movie.db.row.MovieType,
 *     !movie.db.row.MovieDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!movie.db.row.MovieType=} opt_payload
 */
movie.db.row.Movie = function(rowId, opt_payload) {
  movie.db.row.Movie.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(movie.db.row.Movie, lf.Row);


/** @override */
movie.db.row.Movie.prototype.defaultPayload = function() {
  var payload = new movie.db.row.MovieType();
  payload.id = 0;
  payload.title = '';
  payload.year = 0;
  payload.rating = '';
  payload.company = '';
  return payload;
};


/** @override */
movie.db.row.Movie.prototype.toDbPayload = function() {
  var payload = new movie.db.row.MovieDbType();
  payload.id = this.payload().id;
  payload.title = this.payload().title;
  payload.year = this.payload().year;
  payload.rating = this.payload().rating;
  payload.company = this.payload().company;
  return payload;
};


/** @override */
movie.db.row.Movie.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Movie.pkMovie':
      return this.payload().id;
    case 'Movie.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {number} */
movie.db.row.Movie.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {number} value
 * @return {!movie.db.row.Movie}
*/
movie.db.row.Movie.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
movie.db.row.Movie.prototype.getTitle = function() {
  return this.payload().title;
};


/**
 * @param {string} value
 * @return {!movie.db.row.Movie}
*/
movie.db.row.Movie.prototype.setTitle = function(value) {
  this.payload().title = value;
  return this;
};


/** @return {number} */
movie.db.row.Movie.prototype.getYear = function() {
  return this.payload().year;
};


/**
 * @param {number} value
 * @return {!movie.db.row.Movie}
*/
movie.db.row.Movie.prototype.setYear = function(value) {
  this.payload().year = value;
  return this;
};


/** @return {string} */
movie.db.row.Movie.prototype.getRating = function() {
  return this.payload().rating;
};


/**
 * @param {string} value
 * @return {!movie.db.row.Movie}
*/
movie.db.row.Movie.prototype.setRating = function(value) {
  this.payload().rating = value;
  return this;
};


/** @return {string} */
movie.db.row.Movie.prototype.getCompany = function() {
  return this.payload().company;
};


/**
 * @param {string} value
 * @return {!movie.db.row.Movie}
*/
movie.db.row.Movie.prototype.setCompany = function(value) {
  this.payload().company = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!movie.db.row.ActorType,
 *     !movie.db.row.ActorDbType>}
 * @constructor
 */
movie.db.schema.Actor = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.INTEGER);
  cols.push(this.id);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.lastName = new lf.schema.BaseColumn(
      this, 'lastName', false, lf.Type.STRING);
  cols.push(this.lastName);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.firstName = new lf.schema.BaseColumn(
      this, 'firstName', false, lf.Type.STRING);
  cols.push(this.firstName);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.sex = new lf.schema.BaseColumn(
      this, 'sex', false, lf.Type.STRING);
  cols.push(this.sex);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.dateOfBirth = new lf.schema.BaseColumn(
      this, 'dateOfBirth', false, lf.Type.DATE_TIME);
  cols.push(this.dateOfBirth);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.dateOfDeath = new lf.schema.BaseColumn(
      this, 'dateOfDeath', false, lf.Type.DATE_TIME);
  cols.push(this.dateOfDeath);

  var indices = [
    new lf.schema.Index('Actor', 'pkActor', true, ['id'])
  ];

  movie.db.schema.Actor.base(
      this, 'constructor', 'Actor', cols, indices, false);
};
goog.inherits(movie.db.schema.Actor, lf.schema.Table);


/** @override */
movie.db.schema.Actor.prototype.createRow = function(opt_value) {
  return new movie.db.row.Actor(lf.Row.getNextId(), opt_value);
};


/** @override */
movie.db.schema.Actor.prototype.deserializeRow = function(dbRecord) {
  var data = dbRecord['value'];
  var payload = new movie.db.row.ActorType();
  payload.id = data.id;
  payload.lastName = data.lastName;
  payload.firstName = data.firstName;
  payload.sex = data.sex;
  payload.dateOfBirth = new Date(data.dateOfBirth);
  payload.dateOfDeath = goog.isNull(data.dateOfDeath) ?
      null : new Date(data.dateOfDeath);
  return new movie.db.row.Actor(dbRecord['id'], payload);
};


/** @override */
movie.db.schema.Actor.prototype.getConstraint = function() {
  var pk = new lf.schema.Index('Actor', 'pkActor', true, ['id']);
  var notNullable = [
    this.id,
    this.lastName,
    this.firstName,
    this.sex,
    this.dateOfBirth
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(pk, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.ActorType = function() {
  /** @export @type {number} */
  this.id;
  /** @export @type {string} */
  this.lastName;
  /** @export @type {string} */
  this.firstName;
  /** @export @type {string} */
  this.sex;
  /** @export @type {!Date} */
  this.dateOfBirth;
  /** @export @type {?Date} */
  this.dateOfDeath;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.ActorDbType = function() {
  /** @export @type {number} */
  this.id;
  /** @export @type {string} */
  this.lastName;
  /** @export @type {string} */
  this.firstName;
  /** @export @type {string} */
  this.sex;
  /** @export @type {number} */
  this.dateOfBirth;
  /** @export @type {?number} */
  this.dateOfDeath;
};



/**
 * Constructs a new Actor row.
 * @constructor
 * @extends {lf.Row.<!movie.db.row.ActorType,
 *     !movie.db.row.ActorDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!movie.db.row.ActorType=} opt_payload
 */
movie.db.row.Actor = function(rowId, opt_payload) {
  movie.db.row.Actor.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(movie.db.row.Actor, lf.Row);


/** @override */
movie.db.row.Actor.prototype.defaultPayload = function() {
  var payload = new movie.db.row.ActorType();
  payload.id = 0;
  payload.lastName = '';
  payload.firstName = '';
  payload.sex = '';
  payload.dateOfBirth = new Date(0);
  payload.dateOfDeath = null;
  return payload;
};


/** @override */
movie.db.row.Actor.prototype.toDbPayload = function() {
  var payload = new movie.db.row.ActorDbType();
  payload.id = this.payload().id;
  payload.lastName = this.payload().lastName;
  payload.firstName = this.payload().firstName;
  payload.sex = this.payload().sex;
  payload.dateOfBirth = this.payload().dateOfBirth.getTime();
  payload.dateOfDeath = goog.isNull(this.payload().dateOfDeath) ?
      null : this.payload().dateOfDeath.getTime();
  return payload;
};


/** @override */
movie.db.row.Actor.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Actor.pkActor':
      return this.payload().id;
    case 'Actor.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {number} */
movie.db.row.Actor.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {number} value
 * @return {!movie.db.row.Actor}
*/
movie.db.row.Actor.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
movie.db.row.Actor.prototype.getLastName = function() {
  return this.payload().lastName;
};


/**
 * @param {string} value
 * @return {!movie.db.row.Actor}
*/
movie.db.row.Actor.prototype.setLastName = function(value) {
  this.payload().lastName = value;
  return this;
};


/** @return {string} */
movie.db.row.Actor.prototype.getFirstName = function() {
  return this.payload().firstName;
};


/**
 * @param {string} value
 * @return {!movie.db.row.Actor}
*/
movie.db.row.Actor.prototype.setFirstName = function(value) {
  this.payload().firstName = value;
  return this;
};


/** @return {string} */
movie.db.row.Actor.prototype.getSex = function() {
  return this.payload().sex;
};


/**
 * @param {string} value
 * @return {!movie.db.row.Actor}
*/
movie.db.row.Actor.prototype.setSex = function(value) {
  this.payload().sex = value;
  return this;
};


/** @return {!Date} */
movie.db.row.Actor.prototype.getDateOfBirth = function() {
  return this.payload().dateOfBirth;
};


/**
 * @param {!Date} value
 * @return {!movie.db.row.Actor}
*/
movie.db.row.Actor.prototype.setDateOfBirth = function(value) {
  this.payload().dateOfBirth = value;
  return this;
};


/** @return {?Date} */
movie.db.row.Actor.prototype.getDateOfDeath = function() {
  return this.payload().dateOfDeath;
};


/**
 * @param {?Date} value
 * @return {!movie.db.row.Actor}
*/
movie.db.row.Actor.prototype.setDateOfDeath = function(value) {
  this.payload().dateOfDeath = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!movie.db.row.DirectorType,
 *     !movie.db.row.DirectorDbType>}
 * @constructor
 */
movie.db.schema.Director = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.INTEGER);
  cols.push(this.id);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.lastName = new lf.schema.BaseColumn(
      this, 'lastName', false, lf.Type.STRING);
  cols.push(this.lastName);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.firstName = new lf.schema.BaseColumn(
      this, 'firstName', false, lf.Type.STRING);
  cols.push(this.firstName);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.dateOfBirth = new lf.schema.BaseColumn(
      this, 'dateOfBirth', false, lf.Type.DATE_TIME);
  cols.push(this.dateOfBirth);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.dateOfDeath = new lf.schema.BaseColumn(
      this, 'dateOfDeath', false, lf.Type.DATE_TIME);
  cols.push(this.dateOfDeath);

  var indices = [
    new lf.schema.Index('Director', 'pkDirector', true, ['id'])
  ];

  movie.db.schema.Director.base(
      this, 'constructor', 'Director', cols, indices, false);
};
goog.inherits(movie.db.schema.Director, lf.schema.Table);


/** @override */
movie.db.schema.Director.prototype.createRow = function(opt_value) {
  return new movie.db.row.Director(lf.Row.getNextId(), opt_value);
};


/** @override */
movie.db.schema.Director.prototype.deserializeRow = function(dbRecord) {
  var data = dbRecord['value'];
  var payload = new movie.db.row.DirectorType();
  payload.id = data.id;
  payload.lastName = data.lastName;
  payload.firstName = data.firstName;
  payload.dateOfBirth = new Date(data.dateOfBirth);
  payload.dateOfDeath = goog.isNull(data.dateOfDeath) ?
      null : new Date(data.dateOfDeath);
  return new movie.db.row.Director(dbRecord['id'], payload);
};


/** @override */
movie.db.schema.Director.prototype.getConstraint = function() {
  var pk = new lf.schema.Index('Director', 'pkDirector', true, ['id']);
  var notNullable = [
    this.id,
    this.lastName,
    this.firstName,
    this.dateOfBirth
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(pk, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.DirectorType = function() {
  /** @export @type {number} */
  this.id;
  /** @export @type {string} */
  this.lastName;
  /** @export @type {string} */
  this.firstName;
  /** @export @type {!Date} */
  this.dateOfBirth;
  /** @export @type {?Date} */
  this.dateOfDeath;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.DirectorDbType = function() {
  /** @export @type {number} */
  this.id;
  /** @export @type {string} */
  this.lastName;
  /** @export @type {string} */
  this.firstName;
  /** @export @type {number} */
  this.dateOfBirth;
  /** @export @type {?number} */
  this.dateOfDeath;
};



/**
 * Constructs a new Director row.
 * @constructor
 * @extends {lf.Row.<!movie.db.row.DirectorType,
 *     !movie.db.row.DirectorDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!movie.db.row.DirectorType=} opt_payload
 */
movie.db.row.Director = function(rowId, opt_payload) {
  movie.db.row.Director.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(movie.db.row.Director, lf.Row);


/** @override */
movie.db.row.Director.prototype.defaultPayload = function() {
  var payload = new movie.db.row.DirectorType();
  payload.id = 0;
  payload.lastName = '';
  payload.firstName = '';
  payload.dateOfBirth = new Date(0);
  payload.dateOfDeath = null;
  return payload;
};


/** @override */
movie.db.row.Director.prototype.toDbPayload = function() {
  var payload = new movie.db.row.DirectorDbType();
  payload.id = this.payload().id;
  payload.lastName = this.payload().lastName;
  payload.firstName = this.payload().firstName;
  payload.dateOfBirth = this.payload().dateOfBirth.getTime();
  payload.dateOfDeath = goog.isNull(this.payload().dateOfDeath) ?
      null : this.payload().dateOfDeath.getTime();
  return payload;
};


/** @override */
movie.db.row.Director.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Director.pkDirector':
      return this.payload().id;
    case 'Director.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {number} */
movie.db.row.Director.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {number} value
 * @return {!movie.db.row.Director}
*/
movie.db.row.Director.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
movie.db.row.Director.prototype.getLastName = function() {
  return this.payload().lastName;
};


/**
 * @param {string} value
 * @return {!movie.db.row.Director}
*/
movie.db.row.Director.prototype.setLastName = function(value) {
  this.payload().lastName = value;
  return this;
};


/** @return {string} */
movie.db.row.Director.prototype.getFirstName = function() {
  return this.payload().firstName;
};


/**
 * @param {string} value
 * @return {!movie.db.row.Director}
*/
movie.db.row.Director.prototype.setFirstName = function(value) {
  this.payload().firstName = value;
  return this;
};


/** @return {!Date} */
movie.db.row.Director.prototype.getDateOfBirth = function() {
  return this.payload().dateOfBirth;
};


/**
 * @param {!Date} value
 * @return {!movie.db.row.Director}
*/
movie.db.row.Director.prototype.setDateOfBirth = function(value) {
  this.payload().dateOfBirth = value;
  return this;
};


/** @return {?Date} */
movie.db.row.Director.prototype.getDateOfDeath = function() {
  return this.payload().dateOfDeath;
};


/**
 * @param {?Date} value
 * @return {!movie.db.row.Director}
*/
movie.db.row.Director.prototype.setDateOfDeath = function(value) {
  this.payload().dateOfDeath = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!movie.db.row.MovieGenreType,
 *     !movie.db.row.MovieGenreDbType>}
 * @constructor
 */
movie.db.schema.MovieGenre = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.movieId = new lf.schema.BaseColumn(
      this, 'movieId', false, lf.Type.INTEGER);
  cols.push(this.movieId);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.genre = new lf.schema.BaseColumn(
      this, 'genre', false, lf.Type.STRING);
  cols.push(this.genre);

  var indices = [

  ];

  movie.db.schema.MovieGenre.base(
      this, 'constructor', 'MovieGenre', cols, indices, false);
};
goog.inherits(movie.db.schema.MovieGenre, lf.schema.Table);


/** @override */
movie.db.schema.MovieGenre.prototype.createRow = function(opt_value) {
  return new movie.db.row.MovieGenre(lf.Row.getNextId(), opt_value);
};


/** @override */
movie.db.schema.MovieGenre.prototype.deserializeRow = function(dbRecord) {
  return new movie.db.row.MovieGenre(dbRecord['id'], dbRecord['value']);
};


/** @override */
movie.db.schema.MovieGenre.prototype.getConstraint = function() {
  var pk = null;
  var notNullable = [
    this.movieId,
    this.genre
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(pk, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.MovieGenreType = function() {
  /** @export @type {number} */
  this.movieId;
  /** @export @type {string} */
  this.genre;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.MovieGenreDbType = function() {
  /** @export @type {number} */
  this.movieId;
  /** @export @type {string} */
  this.genre;
};



/**
 * Constructs a new MovieGenre row.
 * @constructor
 * @extends {lf.Row.<!movie.db.row.MovieGenreType,
 *     !movie.db.row.MovieGenreDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!movie.db.row.MovieGenreType=} opt_payload
 */
movie.db.row.MovieGenre = function(rowId, opt_payload) {
  movie.db.row.MovieGenre.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(movie.db.row.MovieGenre, lf.Row);


/** @override */
movie.db.row.MovieGenre.prototype.defaultPayload = function() {
  var payload = new movie.db.row.MovieGenreType();
  payload.movieId = 0;
  payload.genre = '';
  return payload;
};


/** @override */
movie.db.row.MovieGenre.prototype.toDbPayload = function() {
  var payload = new movie.db.row.MovieGenreDbType();
  payload.movieId = this.payload().movieId;
  payload.genre = this.payload().genre;
  return payload;
};


/** @override */
movie.db.row.MovieGenre.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'MovieGenre.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {number} */
movie.db.row.MovieGenre.prototype.getMovieId = function() {
  return this.payload().movieId;
};


/**
 * @param {number} value
 * @return {!movie.db.row.MovieGenre}
*/
movie.db.row.MovieGenre.prototype.setMovieId = function(value) {
  this.payload().movieId = value;
  return this;
};


/** @return {string} */
movie.db.row.MovieGenre.prototype.getGenre = function() {
  return this.payload().genre;
};


/**
 * @param {string} value
 * @return {!movie.db.row.MovieGenre}
*/
movie.db.row.MovieGenre.prototype.setGenre = function(value) {
  this.payload().genre = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!movie.db.row.MovieDirectorType,
 *     !movie.db.row.MovieDirectorDbType>}
 * @constructor
 */
movie.db.schema.MovieDirector = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.movieId = new lf.schema.BaseColumn(
      this, 'movieId', false, lf.Type.INTEGER);
  cols.push(this.movieId);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.directorId = new lf.schema.BaseColumn(
      this, 'directorId', false, lf.Type.INTEGER);
  cols.push(this.directorId);

  var indices = [

  ];

  movie.db.schema.MovieDirector.base(
      this, 'constructor', 'MovieDirector', cols, indices, false);
};
goog.inherits(movie.db.schema.MovieDirector, lf.schema.Table);


/** @override */
movie.db.schema.MovieDirector.prototype.createRow = function(opt_value) {
  return new movie.db.row.MovieDirector(lf.Row.getNextId(), opt_value);
};


/** @override */
movie.db.schema.MovieDirector.prototype.deserializeRow = function(dbRecord) {
  return new movie.db.row.MovieDirector(dbRecord['id'], dbRecord['value']);
};


/** @override */
movie.db.schema.MovieDirector.prototype.getConstraint = function() {
  var pk = null;
  var notNullable = [
    this.movieId,
    this.directorId
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(pk, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.MovieDirectorType = function() {
  /** @export @type {number} */
  this.movieId;
  /** @export @type {number} */
  this.directorId;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.MovieDirectorDbType = function() {
  /** @export @type {number} */
  this.movieId;
  /** @export @type {number} */
  this.directorId;
};



/**
 * Constructs a new MovieDirector row.
 * @constructor
 * @extends {lf.Row.<!movie.db.row.MovieDirectorType,
 *     !movie.db.row.MovieDirectorDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!movie.db.row.MovieDirectorType=} opt_payload
 */
movie.db.row.MovieDirector = function(rowId, opt_payload) {
  movie.db.row.MovieDirector.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(movie.db.row.MovieDirector, lf.Row);


/** @override */
movie.db.row.MovieDirector.prototype.defaultPayload = function() {
  var payload = new movie.db.row.MovieDirectorType();
  payload.movieId = 0;
  payload.directorId = 0;
  return payload;
};


/** @override */
movie.db.row.MovieDirector.prototype.toDbPayload = function() {
  var payload = new movie.db.row.MovieDirectorDbType();
  payload.movieId = this.payload().movieId;
  payload.directorId = this.payload().directorId;
  return payload;
};


/** @override */
movie.db.row.MovieDirector.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'MovieDirector.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {number} */
movie.db.row.MovieDirector.prototype.getMovieId = function() {
  return this.payload().movieId;
};


/**
 * @param {number} value
 * @return {!movie.db.row.MovieDirector}
*/
movie.db.row.MovieDirector.prototype.setMovieId = function(value) {
  this.payload().movieId = value;
  return this;
};


/** @return {number} */
movie.db.row.MovieDirector.prototype.getDirectorId = function() {
  return this.payload().directorId;
};


/**
 * @param {number} value
 * @return {!movie.db.row.MovieDirector}
*/
movie.db.row.MovieDirector.prototype.setDirectorId = function(value) {
  this.payload().directorId = value;
  return this;
};



/**
 * @extends {lf.schema.Table.<!movie.db.row.MovieActorType,
 *     !movie.db.row.MovieActorDbType>}
 * @constructor
 */
movie.db.schema.MovieActor = function() {
  var cols = [];

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.movieId = new lf.schema.BaseColumn(
      this, 'movieId', false, lf.Type.INTEGER);
  cols.push(this.movieId);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.actorId = new lf.schema.BaseColumn(
      this, 'actorId', false, lf.Type.INTEGER);
  cols.push(this.actorId);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.role = new lf.schema.BaseColumn(
      this, 'role', false, lf.Type.STRING);
  cols.push(this.role);

  var indices = [

  ];

  movie.db.schema.MovieActor.base(
      this, 'constructor', 'MovieActor', cols, indices, false);
};
goog.inherits(movie.db.schema.MovieActor, lf.schema.Table);


/** @override */
movie.db.schema.MovieActor.prototype.createRow = function(opt_value) {
  return new movie.db.row.MovieActor(lf.Row.getNextId(), opt_value);
};


/** @override */
movie.db.schema.MovieActor.prototype.deserializeRow = function(dbRecord) {
  return new movie.db.row.MovieActor(dbRecord['id'], dbRecord['value']);
};


/** @override */
movie.db.schema.MovieActor.prototype.getConstraint = function() {
  var pk = null;
  var notNullable = [
    this.movieId,
    this.actorId,
    this.role
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(pk, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.MovieActorType = function() {
  /** @export @type {number} */
  this.movieId;
  /** @export @type {number} */
  this.actorId;
  /** @export @type {string} */
  this.role;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
movie.db.row.MovieActorDbType = function() {
  /** @export @type {number} */
  this.movieId;
  /** @export @type {number} */
  this.actorId;
  /** @export @type {string} */
  this.role;
};



/**
 * Constructs a new MovieActor row.
 * @constructor
 * @extends {lf.Row.<!movie.db.row.MovieActorType,
 *     !movie.db.row.MovieActorDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!movie.db.row.MovieActorType=} opt_payload
 */
movie.db.row.MovieActor = function(rowId, opt_payload) {
  movie.db.row.MovieActor.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(movie.db.row.MovieActor, lf.Row);


/** @override */
movie.db.row.MovieActor.prototype.defaultPayload = function() {
  var payload = new movie.db.row.MovieActorType();
  payload.movieId = 0;
  payload.actorId = 0;
  payload.role = '';
  return payload;
};


/** @override */
movie.db.row.MovieActor.prototype.toDbPayload = function() {
  var payload = new movie.db.row.MovieActorDbType();
  payload.movieId = this.payload().movieId;
  payload.actorId = this.payload().actorId;
  payload.role = this.payload().role;
  return payload;
};


/** @override */
movie.db.row.MovieActor.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'MovieActor.#':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {number} */
movie.db.row.MovieActor.prototype.getMovieId = function() {
  return this.payload().movieId;
};


/**
 * @param {number} value
 * @return {!movie.db.row.MovieActor}
*/
movie.db.row.MovieActor.prototype.setMovieId = function(value) {
  this.payload().movieId = value;
  return this;
};


/** @return {number} */
movie.db.row.MovieActor.prototype.getActorId = function() {
  return this.payload().actorId;
};


/**
 * @param {number} value
 * @return {!movie.db.row.MovieActor}
*/
movie.db.row.MovieActor.prototype.setActorId = function(value) {
  this.payload().actorId = value;
  return this;
};


/** @return {string} */
movie.db.row.MovieActor.prototype.getRole = function() {
  return this.payload().role;
};


/**
 * @param {string} value
 * @return {!movie.db.row.MovieActor}
*/
movie.db.row.MovieActor.prototype.setRole = function(value) {
  this.payload().role = value;
  return this;
};
goog.provide('movie.db');

goog.require('lf.Global');
goog.require('lf.base.BackStoreType');
/** @suppress {extraRequire} */
goog.require('lf.fn');
/** @suppress {extraRequire} */
goog.require('lf.op');
goog.require('lf.proc.Database');
goog.require('lf.service');
goog.require('lf.service.ServiceId');
goog.require('movie.db.schema.Database');


/**
 * @return {!lf.Global} The Global instance that refers to movie.db.
 */
movie.db.getGlobal = function() {
  var namespacedGlobalId = new lf.service.ServiceId('ns_mv');
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
movie.db.getSchema = function() {
  var global = movie.db.getGlobal();

  if (!global.isRegistered(lf.service.SCHEMA)) {
    var schema = new movie.db.schema.Database();
    global.registerService(lf.service.SCHEMA, schema);
  }
  return global.getService(lf.service.SCHEMA);
};


/**
 * @param {!function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @param {boolean=} opt_volatile Default to false
 * @return {!IThenable.<!lf.proc.Database>}
 */
movie.db.getInstance = function(opt_onUpgrade, opt_volatile) {
  movie.db.getSchema();
  var db = new lf.proc.Database(movie.db.getGlobal());
  return db.init(
      opt_onUpgrade,
      opt_volatile ? lf.base.BackStoreType.MEMORY : undefined,
      false);
};
