goog.provide('hr.db.row.Country');
goog.provide('hr.db.row.CountryDbType');
goog.provide('hr.db.row.CountryType');
goog.provide('hr.db.row.Department');
goog.provide('hr.db.row.DepartmentDbType');
goog.provide('hr.db.row.DepartmentType');
goog.provide('hr.db.row.DummyTable');
goog.provide('hr.db.row.DummyTableDbType');
goog.provide('hr.db.row.DummyTableType');
goog.provide('hr.db.row.Employee');
goog.provide('hr.db.row.EmployeeDbType');
goog.provide('hr.db.row.EmployeeType');
goog.provide('hr.db.row.Holiday');
goog.provide('hr.db.row.HolidayDbType');
goog.provide('hr.db.row.HolidayType');
goog.provide('hr.db.row.Job');
goog.provide('hr.db.row.JobDbType');
goog.provide('hr.db.row.JobHistory');
goog.provide('hr.db.row.JobHistoryDbType');
goog.provide('hr.db.row.JobHistoryType');
goog.provide('hr.db.row.JobType');
goog.provide('hr.db.row.Location');
goog.provide('hr.db.row.LocationDbType');
goog.provide('hr.db.row.LocationType');
goog.provide('hr.db.row.Region');
goog.provide('hr.db.row.RegionDbType');
goog.provide('hr.db.row.RegionType');
goog.provide('hr.db.schema.Country');
goog.provide('hr.db.schema.Database');
goog.provide('hr.db.schema.Department');
goog.provide('hr.db.schema.DummyTable');
goog.provide('hr.db.schema.Employee');
goog.provide('hr.db.schema.Holiday');
goog.provide('hr.db.schema.Job');
goog.provide('hr.db.schema.JobHistory');
goog.provide('hr.db.schema.Location');
goog.provide('hr.db.schema.Region');

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
hr.db.schema.Database = function() {
  /** @private {!hr.db.schema.Job} */
  this.job_ = new hr.db.schema.Job();

  /** @private {!hr.db.schema.JobHistory} */
  this.jobHistory_ = new hr.db.schema.JobHistory();

  /** @private {!hr.db.schema.Employee} */
  this.employee_ = new hr.db.schema.Employee();

  /** @private {!hr.db.schema.Department} */
  this.department_ = new hr.db.schema.Department();

  /** @private {!hr.db.schema.Location} */
  this.location_ = new hr.db.schema.Location();

  /** @private {!hr.db.schema.Country} */
  this.country_ = new hr.db.schema.Country();

  /** @private {!hr.db.schema.Region} */
  this.region_ = new hr.db.schema.Region();

  /** @private {!hr.db.schema.Holiday} */
  this.holiday_ = new hr.db.schema.Holiday();

  /** @private {!hr.db.schema.DummyTable} */
  this.dummyTable_ = new hr.db.schema.DummyTable();

};


/** @override */
hr.db.schema.Database.prototype.getName = function() {
  return 'hr';
};


/** @override */
hr.db.schema.Database.prototype.getVersion = function() {
  return 1;
};


/** @override */
hr.db.schema.Database.prototype.getTables = function() {
  return [
    this.job_,
    this.jobHistory_,
    this.employee_,
    this.department_,
    this.location_,
    this.country_,
    this.region_,
    this.holiday_,
    this.dummyTable_
  ];
};


/** @return {!hr.db.schema.Job} */
hr.db.schema.Database.prototype.getJob = function() {
  return this.job_;
};


/** @return {!hr.db.schema.JobHistory} */
hr.db.schema.Database.prototype.getJobHistory = function() {
  return this.jobHistory_;
};


/** @return {!hr.db.schema.Employee} */
hr.db.schema.Database.prototype.getEmployee = function() {
  return this.employee_;
};


/** @return {!hr.db.schema.Department} */
hr.db.schema.Database.prototype.getDepartment = function() {
  return this.department_;
};


/** @return {!hr.db.schema.Location} */
hr.db.schema.Database.prototype.getLocation = function() {
  return this.location_;
};


/** @return {!hr.db.schema.Country} */
hr.db.schema.Database.prototype.getCountry = function() {
  return this.country_;
};


/** @return {!hr.db.schema.Region} */
hr.db.schema.Database.prototype.getRegion = function() {
  return this.region_;
};


/** @return {!hr.db.schema.Holiday} */
hr.db.schema.Database.prototype.getHoliday = function() {
  return this.holiday_;
};


/** @return {!hr.db.schema.DummyTable} */
hr.db.schema.Database.prototype.getDummyTable = function() {
  return this.dummyTable_;
};



/**
 * @implements {lf.schema.Table.<!hr.db.row.JobType,
 *     !hr.db.row.JobDbType>}
 * @constructor
 */
hr.db.schema.Job = function() {
  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_;

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.title = new lf.schema.BaseColumn(
      this, 'title', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.minSalary = new lf.schema.BaseColumn(
      this, 'minSalary', false, lf.Type.NUMBER);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.maxSalary = new lf.schema.BaseColumn(
      this, 'maxSalary', false, lf.Type.NUMBER);

};


/** @override */
hr.db.schema.Job.prototype.getName = function() {
  return 'Job';
};


/** @override */
hr.db.schema.Job.prototype.createRow = function(opt_value) {
  return new hr.db.row.Job(lf.Row.getNextId(), opt_value);
};


/** @override */
hr.db.schema.Job.prototype.deserializeRow = function(dbRecord) {
  return new hr.db.row.Job(dbRecord['id'], dbRecord['value']);
};


/** @override */
hr.db.schema.Job.prototype.getIndices = function() {
  if (!this.indices_) {
    this.indices_ = [
      new lf.schema.Index('Job', 'pkJob', true, ['id']),
      new lf.schema.Index('Job', 'idx_maxSalary', false, ['maxSalary'])
    ];
  }
  return this.indices_;
};


/** @override */
hr.db.schema.Job.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('Job', 'pkJob', true, ['id']);
  var notNullable = [
    this.id,
    this.title,
    this.minSalary,
    this.maxSalary
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(
      primaryKey, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.JobType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.title;
  /** @export @type {number} */
  this.minSalary;
  /** @export @type {number} */
  this.maxSalary;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.JobDbType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.title;
  /** @export @type {number} */
  this.minSalary;
  /** @export @type {number} */
  this.maxSalary;
};



/**
 * Constructs a new Job row.
 * @constructor
 * @extends {lf.Row.<!hr.db.row.JobType,
 *     !hr.db.row.JobDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!hr.db.row.JobType=} opt_payload
 */
hr.db.row.Job = function(rowId, opt_payload) {
  hr.db.row.Job.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(hr.db.row.Job, lf.Row);


/** @override */
hr.db.row.Job.prototype.defaultPayload = function() {
  var payload = new hr.db.row.JobType();
  payload.id = '';
  payload.title = '';
  payload.minSalary = 0;
  payload.maxSalary = 0;
  return payload;
};


/** @override */
hr.db.row.Job.prototype.toDbPayload = function() {
  var payload = new hr.db.row.JobDbType();
  payload.id = this.payload().id;
  payload.title = this.payload().title;
  payload.minSalary = this.payload().minSalary;
  payload.maxSalary = this.payload().maxSalary;
  return payload;
};


/** @override */
hr.db.row.Job.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Job.pkJob':
      return this.payload().id;
    case 'Job.idx_maxSalary':
      return this.payload().maxSalary;
    case '##row_id##':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
hr.db.row.Job.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Job}
*/
hr.db.row.Job.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
hr.db.row.Job.prototype.getTitle = function() {
  return this.payload().title;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Job}
*/
hr.db.row.Job.prototype.setTitle = function(value) {
  this.payload().title = value;
  return this;
};


/** @return {number} */
hr.db.row.Job.prototype.getMinSalary = function() {
  return this.payload().minSalary;
};


/**
 * @param {number} value
 * @return {!hr.db.row.Job}
*/
hr.db.row.Job.prototype.setMinSalary = function(value) {
  this.payload().minSalary = value;
  return this;
};


/** @return {number} */
hr.db.row.Job.prototype.getMaxSalary = function() {
  return this.payload().maxSalary;
};


/**
 * @param {number} value
 * @return {!hr.db.row.Job}
*/
hr.db.row.Job.prototype.setMaxSalary = function(value) {
  this.payload().maxSalary = value;
  return this;
};



/**
 * @implements {lf.schema.Table.<!hr.db.row.JobHistoryType,
 *     !hr.db.row.JobHistoryDbType>}
 * @constructor
 */
hr.db.schema.JobHistory = function() {
  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_;

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.employeeId = new lf.schema.BaseColumn(
      this, 'employeeId', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.startDate = new lf.schema.BaseColumn(
      this, 'startDate', false, lf.Type.DATE_TIME);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.endDate = new lf.schema.BaseColumn(
      this, 'endDate', false, lf.Type.DATE_TIME);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.jobId = new lf.schema.BaseColumn(
      this, 'jobId', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.departmentId = new lf.schema.BaseColumn(
      this, 'departmentId', false, lf.Type.STRING);

};


/** @override */
hr.db.schema.JobHistory.prototype.getName = function() {
  return 'JobHistory';
};


/** @override */
hr.db.schema.JobHistory.prototype.createRow = function(opt_value) {
  return new hr.db.row.JobHistory(lf.Row.getNextId(), opt_value);
};


/** @override */
hr.db.schema.JobHistory.prototype.deserializeRow = function(dbRecord) {
  var data = dbRecord['value'];
  var payload = new hr.db.row.JobHistoryType();
  payload.employeeId = data.employeeId;
  payload.startDate = new Date(data.startDate);
  payload.endDate = new Date(data.endDate);
  payload.jobId = data.jobId;
  payload.departmentId = data.departmentId;
  return new hr.db.row.JobHistory(dbRecord['id'], payload);
};


/** @override */
hr.db.schema.JobHistory.prototype.getIndices = function() {
  if (!this.indices_) {
    this.indices_ = [

    ];
  }
  return this.indices_;
};


/** @override */
hr.db.schema.JobHistory.prototype.getConstraint = function() {
  var primaryKey = null;
  var notNullable = [
    this.employeeId,
    this.startDate,
    this.endDate,
    this.jobId,
    this.departmentId
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(
      primaryKey, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.JobHistoryType = function() {
  /** @export @type {string} */
  this.employeeId;
  /** @export @type {!Date} */
  this.startDate;
  /** @export @type {!Date} */
  this.endDate;
  /** @export @type {string} */
  this.jobId;
  /** @export @type {string} */
  this.departmentId;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.JobHistoryDbType = function() {
  /** @export @type {string} */
  this.employeeId;
  /** @export @type {number} */
  this.startDate;
  /** @export @type {number} */
  this.endDate;
  /** @export @type {string} */
  this.jobId;
  /** @export @type {string} */
  this.departmentId;
};



/**
 * Constructs a new JobHistory row.
 * @constructor
 * @extends {lf.Row.<!hr.db.row.JobHistoryType,
 *     !hr.db.row.JobHistoryDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!hr.db.row.JobHistoryType=} opt_payload
 */
hr.db.row.JobHistory = function(rowId, opt_payload) {
  hr.db.row.JobHistory.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(hr.db.row.JobHistory, lf.Row);


/** @override */
hr.db.row.JobHistory.prototype.defaultPayload = function() {
  var payload = new hr.db.row.JobHistoryType();
  payload.employeeId = '';
  payload.startDate = new Date(0);
  payload.endDate = new Date(0);
  payload.jobId = '';
  payload.departmentId = '';
  return payload;
};


/** @override */
hr.db.row.JobHistory.prototype.toDbPayload = function() {
  var payload = new hr.db.row.JobHistoryDbType();
  payload.employeeId = this.payload().employeeId;
  payload.startDate = this.payload().startDate.getTime();
  payload.endDate = this.payload().endDate.getTime();
  payload.jobId = this.payload().jobId;
  payload.departmentId = this.payload().departmentId;
  return payload;
};


/** @override */
hr.db.row.JobHistory.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case '##row_id##':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
hr.db.row.JobHistory.prototype.getEmployeeId = function() {
  return this.payload().employeeId;
};


/**
 * @param {string} value
 * @return {!hr.db.row.JobHistory}
*/
hr.db.row.JobHistory.prototype.setEmployeeId = function(value) {
  this.payload().employeeId = value;
  return this;
};


/** @return {!Date} */
hr.db.row.JobHistory.prototype.getStartDate = function() {
  return this.payload().startDate;
};


/**
 * @param {!Date} value
 * @return {!hr.db.row.JobHistory}
*/
hr.db.row.JobHistory.prototype.setStartDate = function(value) {
  this.payload().startDate = value;
  return this;
};


/** @return {!Date} */
hr.db.row.JobHistory.prototype.getEndDate = function() {
  return this.payload().endDate;
};


/**
 * @param {!Date} value
 * @return {!hr.db.row.JobHistory}
*/
hr.db.row.JobHistory.prototype.setEndDate = function(value) {
  this.payload().endDate = value;
  return this;
};


/** @return {string} */
hr.db.row.JobHistory.prototype.getJobId = function() {
  return this.payload().jobId;
};


/**
 * @param {string} value
 * @return {!hr.db.row.JobHistory}
*/
hr.db.row.JobHistory.prototype.setJobId = function(value) {
  this.payload().jobId = value;
  return this;
};


/** @return {string} */
hr.db.row.JobHistory.prototype.getDepartmentId = function() {
  return this.payload().departmentId;
};


/**
 * @param {string} value
 * @return {!hr.db.row.JobHistory}
*/
hr.db.row.JobHistory.prototype.setDepartmentId = function(value) {
  this.payload().departmentId = value;
  return this;
};



/**
 * @implements {lf.schema.Table.<!hr.db.row.EmployeeType,
 *     !hr.db.row.EmployeeDbType>}
 * @constructor
 */
hr.db.schema.Employee = function() {
  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_;

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.firstName = new lf.schema.BaseColumn(
      this, 'firstName', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.lastName = new lf.schema.BaseColumn(
      this, 'lastName', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.email = new lf.schema.BaseColumn(
      this, 'email', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.phoneNumber = new lf.schema.BaseColumn(
      this, 'phoneNumber', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.hireDate = new lf.schema.BaseColumn(
      this, 'hireDate', false, lf.Type.DATE_TIME);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.jobId = new lf.schema.BaseColumn(
      this, 'jobId', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.salary = new lf.schema.BaseColumn(
      this, 'salary', false, lf.Type.NUMBER);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.commissionPercent = new lf.schema.BaseColumn(
      this, 'commissionPercent', false, lf.Type.NUMBER);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.managerId = new lf.schema.BaseColumn(
      this, 'managerId', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.departmentId = new lf.schema.BaseColumn(
      this, 'departmentId', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<!ArrayBuffer>} */
  this.photo = new lf.schema.BaseColumn(
      this, 'photo', false, lf.Type.ARRAY_BUFFER);

};


/** @override */
hr.db.schema.Employee.prototype.getName = function() {
  return 'Employee';
};


/** @override */
hr.db.schema.Employee.prototype.createRow = function(opt_value) {
  return new hr.db.row.Employee(lf.Row.getNextId(), opt_value);
};


/** @override */
hr.db.schema.Employee.prototype.deserializeRow = function(dbRecord) {
  var data = dbRecord['value'];
  var payload = new hr.db.row.EmployeeType();
  payload.id = data.id;
  payload.firstName = data.firstName;
  payload.lastName = data.lastName;
  payload.email = data.email;
  payload.phoneNumber = data.phoneNumber;
  payload.hireDate = goog.isNull(data.hireDate) ?
      null : new Date(data.hireDate);
  payload.jobId = data.jobId;
  payload.salary = data.salary;
  payload.commissionPercent = data.commissionPercent;
  payload.managerId = data.managerId;
  payload.departmentId = data.departmentId;
  payload.photo = /** @type {!ArrayBuffer} */ (
      lf.Row.hexToBin(data.photo));
  return new hr.db.row.Employee(dbRecord['id'], payload);
};


/** @override */
hr.db.schema.Employee.prototype.getIndices = function() {
  if (!this.indices_) {
    this.indices_ = [
      new lf.schema.Index('Employee', 'pkEmployee', true, ['id']),
      new lf.schema.Index('Employee', 'idx_salary', false, ['salary'])
    ];
  }
  return this.indices_;
};


/** @override */
hr.db.schema.Employee.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('Employee', 'pkEmployee', true, ['id']);
  var notNullable = [
    this.id,
    this.firstName,
    this.lastName,
    this.email,
    this.phoneNumber,
    this.jobId,
    this.salary,
    this.commissionPercent,
    this.managerId,
    this.departmentId,
    this.photo
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(
      primaryKey, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.EmployeeType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.firstName;
  /** @export @type {string} */
  this.lastName;
  /** @export @type {string} */
  this.email;
  /** @export @type {string} */
  this.phoneNumber;
  /** @export @type {?Date} */
  this.hireDate;
  /** @export @type {string} */
  this.jobId;
  /** @export @type {number} */
  this.salary;
  /** @export @type {number} */
  this.commissionPercent;
  /** @export @type {string} */
  this.managerId;
  /** @export @type {string} */
  this.departmentId;
  /** @export @type {!ArrayBuffer} */
  this.photo;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.EmployeeDbType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.firstName;
  /** @export @type {string} */
  this.lastName;
  /** @export @type {string} */
  this.email;
  /** @export @type {string} */
  this.phoneNumber;
  /** @export @type {?number} */
  this.hireDate;
  /** @export @type {string} */
  this.jobId;
  /** @export @type {number} */
  this.salary;
  /** @export @type {number} */
  this.commissionPercent;
  /** @export @type {string} */
  this.managerId;
  /** @export @type {string} */
  this.departmentId;
  /** @export @type {string} */
  this.photo;
};



/**
 * Constructs a new Employee row.
 * @constructor
 * @extends {lf.Row.<!hr.db.row.EmployeeType,
 *     !hr.db.row.EmployeeDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!hr.db.row.EmployeeType=} opt_payload
 */
hr.db.row.Employee = function(rowId, opt_payload) {
  hr.db.row.Employee.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(hr.db.row.Employee, lf.Row);


/** @override */
hr.db.row.Employee.prototype.defaultPayload = function() {
  var payload = new hr.db.row.EmployeeType();
  payload.id = '';
  payload.firstName = '';
  payload.lastName = '';
  payload.email = '';
  payload.phoneNumber = '';
  payload.hireDate = null;
  payload.jobId = '';
  payload.salary = 0;
  payload.commissionPercent = 0;
  payload.managerId = '';
  payload.departmentId = '';
  payload.photo = new ArrayBuffer(0);
  return payload;
};


/** @override */
hr.db.row.Employee.prototype.toDbPayload = function() {
  var payload = new hr.db.row.EmployeeDbType();
  payload.id = this.payload().id;
  payload.firstName = this.payload().firstName;
  payload.lastName = this.payload().lastName;
  payload.email = this.payload().email;
  payload.phoneNumber = this.payload().phoneNumber;
  payload.hireDate = goog.isNull(this.payload().hireDate) ?
      null : this.payload().hireDate.getTime();
  payload.jobId = this.payload().jobId;
  payload.salary = this.payload().salary;
  payload.commissionPercent = this.payload().commissionPercent;
  payload.managerId = this.payload().managerId;
  payload.departmentId = this.payload().departmentId;
  payload.photo = lf.Row.binToHex(this.payload().photo);
  return payload;
};


/** @override */
hr.db.row.Employee.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Employee.pkEmployee':
      return this.payload().id;
    case 'Employee.idx_salary':
      return this.payload().salary;
    case '##row_id##':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
hr.db.row.Employee.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
hr.db.row.Employee.prototype.getFirstName = function() {
  return this.payload().firstName;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setFirstName = function(value) {
  this.payload().firstName = value;
  return this;
};


/** @return {string} */
hr.db.row.Employee.prototype.getLastName = function() {
  return this.payload().lastName;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setLastName = function(value) {
  this.payload().lastName = value;
  return this;
};


/** @return {string} */
hr.db.row.Employee.prototype.getEmail = function() {
  return this.payload().email;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setEmail = function(value) {
  this.payload().email = value;
  return this;
};


/** @return {string} */
hr.db.row.Employee.prototype.getPhoneNumber = function() {
  return this.payload().phoneNumber;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setPhoneNumber = function(value) {
  this.payload().phoneNumber = value;
  return this;
};


/** @return {?Date} */
hr.db.row.Employee.prototype.getHireDate = function() {
  return this.payload().hireDate;
};


/**
 * @param {?Date} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setHireDate = function(value) {
  this.payload().hireDate = value;
  return this;
};


/** @return {string} */
hr.db.row.Employee.prototype.getJobId = function() {
  return this.payload().jobId;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setJobId = function(value) {
  this.payload().jobId = value;
  return this;
};


/** @return {number} */
hr.db.row.Employee.prototype.getSalary = function() {
  return this.payload().salary;
};


/**
 * @param {number} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setSalary = function(value) {
  this.payload().salary = value;
  return this;
};


/** @return {number} */
hr.db.row.Employee.prototype.getCommissionPercent = function() {
  return this.payload().commissionPercent;
};


/**
 * @param {number} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setCommissionPercent = function(value) {
  this.payload().commissionPercent = value;
  return this;
};


/** @return {string} */
hr.db.row.Employee.prototype.getManagerId = function() {
  return this.payload().managerId;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setManagerId = function(value) {
  this.payload().managerId = value;
  return this;
};


/** @return {string} */
hr.db.row.Employee.prototype.getDepartmentId = function() {
  return this.payload().departmentId;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setDepartmentId = function(value) {
  this.payload().departmentId = value;
  return this;
};


/** @return {!ArrayBuffer} */
hr.db.row.Employee.prototype.getPhoto = function() {
  return this.payload().photo;
};


/**
 * @param {!ArrayBuffer} value
 * @return {!hr.db.row.Employee}
*/
hr.db.row.Employee.prototype.setPhoto = function(value) {
  this.payload().photo = value;
  return this;
};



/**
 * @implements {lf.schema.Table.<!hr.db.row.DepartmentType,
 *     !hr.db.row.DepartmentDbType>}
 * @constructor
 */
hr.db.schema.Department = function() {
  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_;

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.name = new lf.schema.BaseColumn(
      this, 'name', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.managerId = new lf.schema.BaseColumn(
      this, 'managerId', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.locationId = new lf.schema.BaseColumn(
      this, 'locationId', false, lf.Type.STRING);

};


/** @override */
hr.db.schema.Department.prototype.getName = function() {
  return 'Department';
};


/** @override */
hr.db.schema.Department.prototype.createRow = function(opt_value) {
  return new hr.db.row.Department(lf.Row.getNextId(), opt_value);
};


/** @override */
hr.db.schema.Department.prototype.deserializeRow = function(dbRecord) {
  return new hr.db.row.Department(dbRecord['id'], dbRecord['value']);
};


/** @override */
hr.db.schema.Department.prototype.getIndices = function() {
  if (!this.indices_) {
    this.indices_ = [
      new lf.schema.Index('Department', 'pkDepartment', true, ['id'])
    ];
  }
  return this.indices_;
};


/** @override */
hr.db.schema.Department.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('Department', 'pkDepartment', true, ['id']);
  var notNullable = [
    this.id,
    this.name,
    this.managerId,
    this.locationId
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(
      primaryKey, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.DepartmentType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.name;
  /** @export @type {string} */
  this.managerId;
  /** @export @type {string} */
  this.locationId;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.DepartmentDbType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.name;
  /** @export @type {string} */
  this.managerId;
  /** @export @type {string} */
  this.locationId;
};



/**
 * Constructs a new Department row.
 * @constructor
 * @extends {lf.Row.<!hr.db.row.DepartmentType,
 *     !hr.db.row.DepartmentDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!hr.db.row.DepartmentType=} opt_payload
 */
hr.db.row.Department = function(rowId, opt_payload) {
  hr.db.row.Department.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(hr.db.row.Department, lf.Row);


/** @override */
hr.db.row.Department.prototype.defaultPayload = function() {
  var payload = new hr.db.row.DepartmentType();
  payload.id = '';
  payload.name = '';
  payload.managerId = '';
  payload.locationId = '';
  return payload;
};


/** @override */
hr.db.row.Department.prototype.toDbPayload = function() {
  var payload = new hr.db.row.DepartmentDbType();
  payload.id = this.payload().id;
  payload.name = this.payload().name;
  payload.managerId = this.payload().managerId;
  payload.locationId = this.payload().locationId;
  return payload;
};


/** @override */
hr.db.row.Department.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Department.pkDepartment':
      return this.payload().id;
    case '##row_id##':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
hr.db.row.Department.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Department}
*/
hr.db.row.Department.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
hr.db.row.Department.prototype.getName = function() {
  return this.payload().name;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Department}
*/
hr.db.row.Department.prototype.setName = function(value) {
  this.payload().name = value;
  return this;
};


/** @return {string} */
hr.db.row.Department.prototype.getManagerId = function() {
  return this.payload().managerId;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Department}
*/
hr.db.row.Department.prototype.setManagerId = function(value) {
  this.payload().managerId = value;
  return this;
};


/** @return {string} */
hr.db.row.Department.prototype.getLocationId = function() {
  return this.payload().locationId;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Department}
*/
hr.db.row.Department.prototype.setLocationId = function(value) {
  this.payload().locationId = value;
  return this;
};



/**
 * @implements {lf.schema.Table.<!hr.db.row.LocationType,
 *     !hr.db.row.LocationDbType>}
 * @constructor
 */
hr.db.schema.Location = function() {
  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_;

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.streetAddress = new lf.schema.BaseColumn(
      this, 'streetAddress', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.postalCode = new lf.schema.BaseColumn(
      this, 'postalCode', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.city = new lf.schema.BaseColumn(
      this, 'city', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.stateProvince = new lf.schema.BaseColumn(
      this, 'stateProvince', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.countryId = new lf.schema.BaseColumn(
      this, 'countryId', false, lf.Type.STRING);

};


/** @override */
hr.db.schema.Location.prototype.getName = function() {
  return 'Location';
};


/** @override */
hr.db.schema.Location.prototype.createRow = function(opt_value) {
  return new hr.db.row.Location(lf.Row.getNextId(), opt_value);
};


/** @override */
hr.db.schema.Location.prototype.deserializeRow = function(dbRecord) {
  return new hr.db.row.Location(dbRecord['id'], dbRecord['value']);
};


/** @override */
hr.db.schema.Location.prototype.getIndices = function() {
  if (!this.indices_) {
    this.indices_ = [
      new lf.schema.Index('Location', 'pkLocation', true, ['id'])
    ];
  }
  return this.indices_;
};


/** @override */
hr.db.schema.Location.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('Location', 'pkLocation', true, ['id']);
  var notNullable = [
    this.id,
    this.streetAddress,
    this.postalCode,
    this.city,
    this.stateProvince,
    this.countryId
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(
      primaryKey, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.LocationType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.streetAddress;
  /** @export @type {string} */
  this.postalCode;
  /** @export @type {string} */
  this.city;
  /** @export @type {string} */
  this.stateProvince;
  /** @export @type {string} */
  this.countryId;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.LocationDbType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.streetAddress;
  /** @export @type {string} */
  this.postalCode;
  /** @export @type {string} */
  this.city;
  /** @export @type {string} */
  this.stateProvince;
  /** @export @type {string} */
  this.countryId;
};



/**
 * Constructs a new Location row.
 * @constructor
 * @extends {lf.Row.<!hr.db.row.LocationType,
 *     !hr.db.row.LocationDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!hr.db.row.LocationType=} opt_payload
 */
hr.db.row.Location = function(rowId, opt_payload) {
  hr.db.row.Location.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(hr.db.row.Location, lf.Row);


/** @override */
hr.db.row.Location.prototype.defaultPayload = function() {
  var payload = new hr.db.row.LocationType();
  payload.id = '';
  payload.streetAddress = '';
  payload.postalCode = '';
  payload.city = '';
  payload.stateProvince = '';
  payload.countryId = '';
  return payload;
};


/** @override */
hr.db.row.Location.prototype.toDbPayload = function() {
  var payload = new hr.db.row.LocationDbType();
  payload.id = this.payload().id;
  payload.streetAddress = this.payload().streetAddress;
  payload.postalCode = this.payload().postalCode;
  payload.city = this.payload().city;
  payload.stateProvince = this.payload().stateProvince;
  payload.countryId = this.payload().countryId;
  return payload;
};


/** @override */
hr.db.row.Location.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Location.pkLocation':
      return this.payload().id;
    case '##row_id##':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
hr.db.row.Location.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Location}
*/
hr.db.row.Location.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
hr.db.row.Location.prototype.getStreetAddress = function() {
  return this.payload().streetAddress;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Location}
*/
hr.db.row.Location.prototype.setStreetAddress = function(value) {
  this.payload().streetAddress = value;
  return this;
};


/** @return {string} */
hr.db.row.Location.prototype.getPostalCode = function() {
  return this.payload().postalCode;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Location}
*/
hr.db.row.Location.prototype.setPostalCode = function(value) {
  this.payload().postalCode = value;
  return this;
};


/** @return {string} */
hr.db.row.Location.prototype.getCity = function() {
  return this.payload().city;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Location}
*/
hr.db.row.Location.prototype.setCity = function(value) {
  this.payload().city = value;
  return this;
};


/** @return {string} */
hr.db.row.Location.prototype.getStateProvince = function() {
  return this.payload().stateProvince;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Location}
*/
hr.db.row.Location.prototype.setStateProvince = function(value) {
  this.payload().stateProvince = value;
  return this;
};


/** @return {string} */
hr.db.row.Location.prototype.getCountryId = function() {
  return this.payload().countryId;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Location}
*/
hr.db.row.Location.prototype.setCountryId = function(value) {
  this.payload().countryId = value;
  return this;
};



/**
 * @implements {lf.schema.Table.<!hr.db.row.CountryType,
 *     !hr.db.row.CountryDbType>}
 * @constructor
 */
hr.db.schema.Country = function() {
  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_;

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.name = new lf.schema.BaseColumn(
      this, 'name', false, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.regionId = new lf.schema.BaseColumn(
      this, 'regionId', false, lf.Type.STRING);

};


/** @override */
hr.db.schema.Country.prototype.getName = function() {
  return 'Country';
};


/** @override */
hr.db.schema.Country.prototype.createRow = function(opt_value) {
  return new hr.db.row.Country(lf.Row.getNextId(), opt_value);
};


/** @override */
hr.db.schema.Country.prototype.deserializeRow = function(dbRecord) {
  return new hr.db.row.Country(dbRecord['id'], dbRecord['value']);
};


/** @override */
hr.db.schema.Country.prototype.getIndices = function() {
  if (!this.indices_) {
    this.indices_ = [
      new lf.schema.Index('Country', 'pkCountry', true, ['id'])
    ];
  }
  return this.indices_;
};


/** @override */
hr.db.schema.Country.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('Country', 'pkCountry', true, ['id']);
  var notNullable = [
    this.id,
    this.name,
    this.regionId
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(
      primaryKey, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.CountryType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.name;
  /** @export @type {string} */
  this.regionId;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.CountryDbType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.name;
  /** @export @type {string} */
  this.regionId;
};



/**
 * Constructs a new Country row.
 * @constructor
 * @extends {lf.Row.<!hr.db.row.CountryType,
 *     !hr.db.row.CountryDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!hr.db.row.CountryType=} opt_payload
 */
hr.db.row.Country = function(rowId, opt_payload) {
  hr.db.row.Country.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(hr.db.row.Country, lf.Row);


/** @override */
hr.db.row.Country.prototype.defaultPayload = function() {
  var payload = new hr.db.row.CountryType();
  payload.id = '';
  payload.name = '';
  payload.regionId = '';
  return payload;
};


/** @override */
hr.db.row.Country.prototype.toDbPayload = function() {
  var payload = new hr.db.row.CountryDbType();
  payload.id = this.payload().id;
  payload.name = this.payload().name;
  payload.regionId = this.payload().regionId;
  return payload;
};


/** @override */
hr.db.row.Country.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Country.pkCountry':
      return this.payload().id;
    case '##row_id##':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
hr.db.row.Country.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Country}
*/
hr.db.row.Country.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
hr.db.row.Country.prototype.getName = function() {
  return this.payload().name;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Country}
*/
hr.db.row.Country.prototype.setName = function(value) {
  this.payload().name = value;
  return this;
};


/** @return {string} */
hr.db.row.Country.prototype.getRegionId = function() {
  return this.payload().regionId;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Country}
*/
hr.db.row.Country.prototype.setRegionId = function(value) {
  this.payload().regionId = value;
  return this;
};



/**
 * @implements {lf.schema.Table.<!hr.db.row.RegionType,
 *     !hr.db.row.RegionDbType>}
 * @constructor
 */
hr.db.schema.Region = function() {
  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_;

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.id = new lf.schema.BaseColumn(
      this, 'id', true, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.name = new lf.schema.BaseColumn(
      this, 'name', false, lf.Type.STRING);

};


/** @override */
hr.db.schema.Region.prototype.getName = function() {
  return 'Region';
};


/** @override */
hr.db.schema.Region.prototype.createRow = function(opt_value) {
  return new hr.db.row.Region(lf.Row.getNextId(), opt_value);
};


/** @override */
hr.db.schema.Region.prototype.deserializeRow = function(dbRecord) {
  return new hr.db.row.Region(dbRecord['id'], dbRecord['value']);
};


/** @override */
hr.db.schema.Region.prototype.getIndices = function() {
  if (!this.indices_) {
    this.indices_ = [
      new lf.schema.Index('Region', 'pkRegion', true, ['id'])
    ];
  }
  return this.indices_;
};


/** @override */
hr.db.schema.Region.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('Region', 'pkRegion', true, ['id']);
  var notNullable = [
    this.id,
    this.name
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(
      primaryKey, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.RegionType = function() {
  /** @export @type {string} */
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
hr.db.row.RegionDbType = function() {
  /** @export @type {string} */
  this.id;
  /** @export @type {string} */
  this.name;
};



/**
 * Constructs a new Region row.
 * @constructor
 * @extends {lf.Row.<!hr.db.row.RegionType,
 *     !hr.db.row.RegionDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!hr.db.row.RegionType=} opt_payload
 */
hr.db.row.Region = function(rowId, opt_payload) {
  hr.db.row.Region.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(hr.db.row.Region, lf.Row);


/** @override */
hr.db.row.Region.prototype.defaultPayload = function() {
  var payload = new hr.db.row.RegionType();
  payload.id = '';
  payload.name = '';
  return payload;
};


/** @override */
hr.db.row.Region.prototype.toDbPayload = function() {
  var payload = new hr.db.row.RegionDbType();
  payload.id = this.payload().id;
  payload.name = this.payload().name;
  return payload;
};


/** @override */
hr.db.row.Region.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Region.pkRegion':
      return this.payload().id;
    case '##row_id##':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
hr.db.row.Region.prototype.getId = function() {
  return this.payload().id;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Region}
*/
hr.db.row.Region.prototype.setId = function(value) {
  this.payload().id = value;
  return this;
};


/** @return {string} */
hr.db.row.Region.prototype.getName = function() {
  return this.payload().name;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Region}
*/
hr.db.row.Region.prototype.setName = function(value) {
  this.payload().name = value;
  return this;
};



/**
 * @implements {lf.schema.Table.<!hr.db.row.HolidayType,
 *     !hr.db.row.HolidayDbType>}
 * @constructor
 */
hr.db.schema.Holiday = function() {
  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_;

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.name = new lf.schema.BaseColumn(
      this, 'name', true, lf.Type.STRING);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.begin = new lf.schema.BaseColumn(
      this, 'begin', false, lf.Type.DATE_TIME);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.end = new lf.schema.BaseColumn(
      this, 'end', false, lf.Type.DATE_TIME);

};


/** @override */
hr.db.schema.Holiday.prototype.getName = function() {
  return 'Holiday';
};


/** @override */
hr.db.schema.Holiday.prototype.createRow = function(opt_value) {
  return new hr.db.row.Holiday(lf.Row.getNextId(), opt_value);
};


/** @override */
hr.db.schema.Holiday.prototype.deserializeRow = function(dbRecord) {
  var data = dbRecord['value'];
  var payload = new hr.db.row.HolidayType();
  payload.name = data.name;
  payload.begin = new Date(data.begin);
  payload.end = new Date(data.end);
  return new hr.db.row.Holiday(dbRecord['id'], payload);
};


/** @override */
hr.db.schema.Holiday.prototype.getIndices = function() {
  if (!this.indices_) {
    this.indices_ = [
      new lf.schema.Index('Holiday', 'pkHoliday', true, ['name']),
      new lf.schema.Index('Holiday', 'idx_begin', false, ['begin'])
    ];
  }
  return this.indices_;
};


/** @override */
hr.db.schema.Holiday.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('Holiday', 'pkHoliday', true, ['name']);
  var notNullable = [
    this.name,
    this.begin,
    this.end
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(
      primaryKey, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.HolidayType = function() {
  /** @export @type {string} */
  this.name;
  /** @export @type {!Date} */
  this.begin;
  /** @export @type {!Date} */
  this.end;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.HolidayDbType = function() {
  /** @export @type {string} */
  this.name;
  /** @export @type {number} */
  this.begin;
  /** @export @type {number} */
  this.end;
};



/**
 * Constructs a new Holiday row.
 * @constructor
 * @extends {lf.Row.<!hr.db.row.HolidayType,
 *     !hr.db.row.HolidayDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!hr.db.row.HolidayType=} opt_payload
 */
hr.db.row.Holiday = function(rowId, opt_payload) {
  hr.db.row.Holiday.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(hr.db.row.Holiday, lf.Row);


/** @override */
hr.db.row.Holiday.prototype.defaultPayload = function() {
  var payload = new hr.db.row.HolidayType();
  payload.name = '';
  payload.begin = new Date(0);
  payload.end = new Date(0);
  return payload;
};


/** @override */
hr.db.row.Holiday.prototype.toDbPayload = function() {
  var payload = new hr.db.row.HolidayDbType();
  payload.name = this.payload().name;
  payload.begin = this.payload().begin.getTime();
  payload.end = this.payload().end.getTime();
  return payload;
};


/** @override */
hr.db.row.Holiday.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'Holiday.pkHoliday':
      return this.payload().name;
    case 'Holiday.idx_begin':
      return this.payload().begin.getTime();
    case '##row_id##':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {string} */
hr.db.row.Holiday.prototype.getName = function() {
  return this.payload().name;
};


/**
 * @param {string} value
 * @return {!hr.db.row.Holiday}
*/
hr.db.row.Holiday.prototype.setName = function(value) {
  this.payload().name = value;
  return this;
};


/** @return {!Date} */
hr.db.row.Holiday.prototype.getBegin = function() {
  return this.payload().begin;
};


/**
 * @param {!Date} value
 * @return {!hr.db.row.Holiday}
*/
hr.db.row.Holiday.prototype.setBegin = function(value) {
  this.payload().begin = value;
  return this;
};


/** @return {!Date} */
hr.db.row.Holiday.prototype.getEnd = function() {
  return this.payload().end;
};


/**
 * @param {!Date} value
 * @return {!hr.db.row.Holiday}
*/
hr.db.row.Holiday.prototype.setEnd = function(value) {
  this.payload().end = value;
  return this;
};



/**
 * @implements {lf.schema.Table.<!hr.db.row.DummyTableType,
 *     !hr.db.row.DummyTableDbType>}
 * @constructor
 */
hr.db.schema.DummyTable = function() {
  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_;

  /** @type {!lf.schema.BaseColumn.<!ArrayBuffer>} */
  this.arraybuffer = new lf.schema.BaseColumn(
      this, 'arraybuffer', false, lf.Type.ARRAY_BUFFER);

  /** @type {!lf.schema.BaseColumn.<boolean>} */
  this.boolean = new lf.schema.BaseColumn(
      this, 'boolean', false, lf.Type.BOOLEAN);

  /** @type {!lf.schema.BaseColumn.<!Date>} */
  this.datetime = new lf.schema.BaseColumn(
      this, 'datetime', false, lf.Type.DATE_TIME);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.integer = new lf.schema.BaseColumn(
      this, 'integer', false, lf.Type.INTEGER);

  /** @type {!lf.schema.BaseColumn.<number>} */
  this.number = new lf.schema.BaseColumn(
      this, 'number', false, lf.Type.NUMBER);

  /** @type {!lf.schema.BaseColumn.<string>} */
  this.string = new lf.schema.BaseColumn(
      this, 'string', true, lf.Type.STRING);

};


/** @override */
hr.db.schema.DummyTable.prototype.getName = function() {
  return 'DummyTable';
};


/** @override */
hr.db.schema.DummyTable.prototype.createRow = function(opt_value) {
  return new hr.db.row.DummyTable(lf.Row.getNextId(), opt_value);
};


/** @override */
hr.db.schema.DummyTable.prototype.deserializeRow = function(dbRecord) {
  var data = dbRecord['value'];
  var payload = new hr.db.row.DummyTableType();
  payload.arraybuffer = /** @type {!ArrayBuffer} */ (
      lf.Row.hexToBin(data.arraybuffer));
  payload.boolean = data.boolean;
  payload.datetime = new Date(data.datetime);
  payload.integer = data.integer;
  payload.number = data.number;
  payload.string = data.string;
  return new hr.db.row.DummyTable(dbRecord['id'], payload);
};


/** @override */
hr.db.schema.DummyTable.prototype.getIndices = function() {
  if (!this.indices_) {
    this.indices_ = [
      new lf.schema.Index('DummyTable', 'pkDummyTable', true, ['string'])
    ];
  }
  return this.indices_;
};


/** @override */
hr.db.schema.DummyTable.prototype.getConstraint = function() {
  var primaryKey = new lf.schema.Index('DummyTable', 'pkDummyTable', true, ['string']);
  var notNullable = [
    this.arraybuffer,
    this.boolean,
    this.datetime,
    this.integer,
    this.number,
    this.string
  ];
  var foreignKeys = [];
  var unique = [
  ];
  return new lf.schema.Constraint(
      primaryKey, notNullable, foreignKeys, unique);
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.DummyTableType = function() {
  /** @export @type {!ArrayBuffer} */
  this.arraybuffer;
  /** @export @type {boolean} */
  this.boolean;
  /** @export @type {!Date} */
  this.datetime;
  /** @export @type {number} */
  this.integer;
  /** @export @type {number} */
  this.number;
  /** @export @type {string} */
  this.string;
};



/**
 * @export
 * @constructor
 * @struct
 * @final
 */
hr.db.row.DummyTableDbType = function() {
  /** @export @type {string} */
  this.arraybuffer;
  /** @export @type {boolean} */
  this.boolean;
  /** @export @type {number} */
  this.datetime;
  /** @export @type {number} */
  this.integer;
  /** @export @type {number} */
  this.number;
  /** @export @type {string} */
  this.string;
};



/**
 * Constructs a new DummyTable row.
 * @constructor
 * @extends {lf.Row.<!hr.db.row.DummyTableType,
 *     !hr.db.row.DummyTableDbType>}
 *
 * @param {number} rowId The row ID.
 * @param {!hr.db.row.DummyTableType=} opt_payload
 */
hr.db.row.DummyTable = function(rowId, opt_payload) {
  hr.db.row.DummyTable.base(this, 'constructor', rowId, opt_payload);
};
goog.inherits(hr.db.row.DummyTable, lf.Row);


/** @override */
hr.db.row.DummyTable.prototype.defaultPayload = function() {
  var payload = new hr.db.row.DummyTableType();
  payload.arraybuffer = new ArrayBuffer(0);
  payload.boolean = false;
  payload.datetime = new Date(0);
  payload.integer = 0;
  payload.number = 0;
  payload.string = '';
  return payload;
};


/** @override */
hr.db.row.DummyTable.prototype.toDbPayload = function() {
  var payload = new hr.db.row.DummyTableDbType();
  payload.arraybuffer = lf.Row.binToHex(this.payload().arraybuffer);
  payload.boolean = this.payload().boolean;
  payload.datetime = this.payload().datetime.getTime();
  payload.integer = this.payload().integer;
  payload.number = this.payload().number;
  payload.string = this.payload().string;
  return payload;
};


/** @override */
hr.db.row.DummyTable.prototype.keyOfIndex = function(indexName) {
  switch (indexName) {
    case 'DummyTable.pkDummyTable':
      return this.payload().string;
    case '##row_id##':
      return this.id();
    default:
      break;
  }
  return null;
};


/** @return {!ArrayBuffer} */
hr.db.row.DummyTable.prototype.getArraybuffer = function() {
  return this.payload().arraybuffer;
};


/**
 * @param {!ArrayBuffer} value
 * @return {!hr.db.row.DummyTable}
*/
hr.db.row.DummyTable.prototype.setArraybuffer = function(value) {
  this.payload().arraybuffer = value;
  return this;
};


/** @return {boolean} */
hr.db.row.DummyTable.prototype.getBoolean = function() {
  return this.payload().boolean;
};


/**
 * @param {boolean} value
 * @return {!hr.db.row.DummyTable}
*/
hr.db.row.DummyTable.prototype.setBoolean = function(value) {
  this.payload().boolean = value;
  return this;
};


/** @return {!Date} */
hr.db.row.DummyTable.prototype.getDatetime = function() {
  return this.payload().datetime;
};


/**
 * @param {!Date} value
 * @return {!hr.db.row.DummyTable}
*/
hr.db.row.DummyTable.prototype.setDatetime = function(value) {
  this.payload().datetime = value;
  return this;
};


/** @return {number} */
hr.db.row.DummyTable.prototype.getInteger = function() {
  return this.payload().integer;
};


/**
 * @param {number} value
 * @return {!hr.db.row.DummyTable}
*/
hr.db.row.DummyTable.prototype.setInteger = function(value) {
  this.payload().integer = value;
  return this;
};


/** @return {number} */
hr.db.row.DummyTable.prototype.getNumber = function() {
  return this.payload().number;
};


/**
 * @param {number} value
 * @return {!hr.db.row.DummyTable}
*/
hr.db.row.DummyTable.prototype.setNumber = function(value) {
  this.payload().number = value;
  return this;
};


/** @return {string} */
hr.db.row.DummyTable.prototype.getString = function() {
  return this.payload().string;
};


/**
 * @param {string} value
 * @return {!hr.db.row.DummyTable}
*/
hr.db.row.DummyTable.prototype.setString = function(value) {
  this.payload().string = value;
  return this;
};
