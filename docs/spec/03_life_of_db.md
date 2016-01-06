# Lovefield Specification

## 3. Life of a Lovefield Database

Lovefield database is scoped per-origin, like IndexedDB, and (origin, DB name,
DB version) uniquely identify a database instance. The database is stored in a
[Data Store](02_data_store.md).

### 3.1 Lovefield Initialization

Lovefield initialization is performed through [schema builder's `connect()`
method](
https://github.com/google/lovefield/blob/31f14db4995bb89fa053c99261a4b7501f87eb8d/lib/schema/builder.js#L91-L109).
The `connect()` method will implicitly invoke Lovefield initialization.
It will do the following:

* Create the database instance if there is nothing on the persistent store.
* Open and return a database connection if version matches.
* Perform upgrade procedure
  * If persisted schema version is newer than requested, throw an exception.
  * If persisted schema version is older than requested, upgrade database.

`connect()` shall be called only once each session. In rare circumstances,
one can call `close()` on the opened connection first, then call `connect()`
again. However, this is not guaranteed to work due to IndexedDB limitations,
see [Data Store](02_data_store.md) for details. Calling `connect()` when an
open connection exists will result in an exception.

Users are free to connect to two or more databases simultaneously in the same
session. Users shall not connect to the same database more than once in the same
session (i.e. `connect()` in main HTML and do another `connect()` in an iframe).

#### 3.1.1 Connect Options

The `connect()` function accepts a plain JSON object as its optional parameter,
which can be used to customize the behavior of the establishing connection.
The JSON object accepts following fields:

|Property   |Type                                    |Meaning                |
|:----------|:---------------------------------------|:----------------------|
|`onUpgrade`|`function(!lf.raw.BackStore):!IThenable`|Database upgrade logic.|
|`storeType`|`lf.schema.DataStoreType`               |Data store to use.     |
|`firebase` |`Firebase`                              |Firebase instance      |

The `onUpgrade` property is a function that is called back when Lovefield
needs to [perform database upgrade](#33-database-upgrade).

The `storeType` property allows the user to specify what data store to use.

* `lf.schema.DataStoreType.INDEXED_DB`: this is the default, which uses
  browser-provided IndexedDB.

* `lf.schema.DataStoreType.MEMORY`: provides a purely memory-based data store,
  which does not persist data after session ends. If this type is specified,
  `onUpgrade` must be `undefined` since upgrading volatile data store is not
  applicable.

* `lf.schema.DataStoreType.FIREBASE`: uses user-supplied Firebase instance as
  data store. If this options is chosen, user *MUST* also supply property
  `firebase` to provide an already connected and authenticated Firebase
  instance. Field `firebase` will be ignored for all other data store types.

* `lf.schema.DataStoreType.WEB_SQL`: uses browser-provided WebSQL as data store.
  This is provided to work around issues on Safari and iOS Chrome, see
  [Design Doc](../dd/02_data_store.md#25-websql-store) for details.

If `storeType` is not defined, the following algorithm will be used to select
a store type:

* If browser supports IndexedDB, use `lf.schema.DataStoreType.INDEXED_DB`.
* If browser does not support IndexedDB, but supports WebSQL, use
  `lf.schema.DataStoreType.WEB_SQL`.
* If neither IndexedDB nor WebSQL is supported, use
  `lf.schema.DataStoreType.MEMORY`.

### 3.2 Multi-Process Connection

Lovefield assumes that at a given time, there is only one connection to a
database instance. By design the tuple (origin, schema name, version)
uniquely identify a database instance on data store. If there are multiple
pages or tabs connected to the same database, there can be a problem of data
inconsistency. Users shall be aware of this problem and plan accordingly.

In Lovefield's current status, the query engine may have inconsistent in-memory
snapshot if there are more than one connections making write request to a
database. There are several proposals for solving this issue and they are under
evaluations. Current best practice is to use a dedicated background component
(in the form of background page, WebWorker, or ServiceWorker) to handle all
Lovefield operations, and the other tabs/windows postMessage to that component
to perform DB operations.

If different processes attempted to open the same database instance with
different Lovefield versions, the behavior is currently undefined and Lovefield
team will work on this issue once the multi-process access model settles.

### 3.3 Database Upgrade

Lovefield will open the database using the version specified in schema
(see [Schema Definition](01_schema.md)). When the version mismatch, the database
upgrade mechanism will be triggered.

The first step of database upgrade is to create new tables. Lovefield checks the
tables that are not in database but in the schema, and creates them accordingly.
After this is done, Lovefield will call the user-provided upgrade function.

User needs to provide the custom upgrade function as a parameter of
`connect()` if the upgrade involves deleting or transforming table data. The
function will be given a raw database instance that is capable of doing table
schema alternation. The function must return a promise. After the promise is
resolved, a new database instance will be created, and the connection to this
new instance will be returned. If the promise is rejected, the `connect()` call
will also be rejected.

Users do not need to worry about new indices or altering indices for version
upgrades. Query engine will detect index schema change and recreate all the
indices when needed.  Query engine will drop all persisted indices and recreate
them in the scenario of database upgrade to ensure data consistency.

For the case of deleting table, user is responsible to perform the deletion in
upgrade function. Lovefield does not provide auto-drop due to data safety
concerns. IndexedDB does not provide a way of renaming table, therefore renaming
a table will require recreating a table with exact contents and deleting the old
table, which cannot be done safely within the upgrade transaction and user is
supposed to do it manually outside of the `onUpgrade` function.

For the case of altering table, if the transformation is renaming column, adding
a nullable/fixed value column, or deleting a column, user can use helper
functions provided, otherwise user needs to do row-by-row transformation. For
renaming, user is responsible for making sure the renamed column has exactly the
same schema as old table, and the renamed column has exactly the same type as it
was. For transformation case, user is responsible for making sure the
transformed rows will fit in new schema and does not violate constraints.
Failing to do so may cause exceptions to be thrown during query execution.
Lovefield disallows altering column types directly.

The following is a sample code snippet demonstrating database upgrades.

```js
// Open database, perform database creation or upgrade if necessary.
schemaBuilder.connect({onUpgrade: onUpgrade}).then(
  // All new/upgrade related stuff has been completed.
  /** @param {lf.Database} db */
  function(db) {
    // new db connection starts here
  });

/**
 * User provided upgrade function which is called after Lovefield
 * created new tables.
 *
 * NOTE: if the function incurs any asynchronous operations other
 * than working on the database, the upgrade transaction will be
 * committed immediately and very likely to fail the upgrade process
 * thanks to the IndexedDB auto-commit trap.
 * @param {lf.raw.BackStore} rawDb
 */
function onUpgrade(rawDb) {
  // Show the version currently persisted.
  console.log(rawDb.getVersion());

  // DROP TABLE Progress.
  // This call is synchronous.
  rawDb.dropTable('Progress');

  // All async upgrade helpers are supposed to chain one after another.

  // Add column agent (type string) to Purchase with default value 'Smith'.
  return rawDb.addTableColumn('Purchase', 'agent', 'Smith').then(function() {
    // Delete column metadata from Photo.
    return rawDb.dropTableColumn('Photo', 'metadata');
  }).then(function() {
    // Rename Photo.isLocal to Photo.local.
    return rawDb.renameTableColumn('Photo', 'isLocal', 'local');
  }).then(function() {
    // Transformations are not supported because of IndexedDB auto-commit:
    // Firefox immediately commits the transaction when Lovefield tries to
    // return a promise from scanning existing object stores. Users are
    // supposed to do a dump and make the transformation outside of onUpgrade
    // routine.

    // DUMP the whole DB into a JS object.
    return rawDb.dump();
  });
}
```

Users shall not assume that Lovefield will upgrade all data in-place. In certain
circumstances, Lovefield may require to recreate a completely new database and
copy the data over (which will be the last resort, for example, implementing a
new and more efficient storage format). Since the database upgrade can be
time-consuming, user is responsible for defining their own progress event and
fire within the callback function.

The interface [`lf.raw.BackStore`](
https://github.com/google/lovefield/blob/master/lib/raw.js) contains detailed
documentation for each of its member function.

#### 3.3.1 Firebase-Specific Limitations

For Firebase, there are two special rules to be observed:

1. Only one client can be used to create the database.
2. Database upgrade needs to be carried out in a different manner: clients other
   than the upgrading one must not be using the database shall there be a
   database upgrade (this is typically done using Firebase security control
   instead).

### 3.4 `lf.Database`

If the schema version matches, or the database upgrade procedure completed, the
resolve function of the returning promise will receive a database connection
object implementing [`lf.Database`](
https://github.com/google/lovefield/blob/master/lib/database.js) interface. The
interface provides:

* Retrieve corresponding schema (`getSchema()`)
* Create query builders (`select()`, `insert()`, `insertOrReplace()`,
  `update()`, and `delete()`)
* Create transactions (`createTransaction()`)
* Manage observers (`observe()` and `unobserve()`)
* Close database (`close()`)

#### 3.4.1 Database Schema

Although the schema can be retrieved from schema builder, the suggested way of
retrieving the database schema is to get them from `lf.Database#getSchema()`
call, which will return an [`lf.schema.Database`](
https://github.com/google/lovefield/blob/11e206f865b2782a0311bcc0abfd3a97acf68642/lib/schema/schema.js#L64-L88)
object that represents the schema of that instance.

The schema is used to support query building, such as providing filters and
building blocks for search conditions. The schema is hierarchical, and the
following table list the components of it:

|Class               |Meaning                                                  |
|:-------------------|:--------------------------------------------------------|
|`lf.schema.Database`|Representation of the whole database, container of table.|
|`lf.schema.Table`   |Representation of a table, container of column.          |
|`lf.schema.Column`  |Representation of table column, used by query builders.  |

#### 3.4.2 Query Builders and Transactions

All query builders implement the interface [`lf.query.Builder`](
https://github.com/google/lovefield/blob/0146b8c1a951ecc2cf282075e6653d63aac1aed9/lib/query.js#L28-L62).
Their main responsibility is to generate query objects that will be accepted and
executed by query execution engine. A query object can be reused multiple times
if same query is desired.

All queries are executed in the context of transactions. Transactions can be
either implicit or explicit. Explicit transactions are created by the
`createTransaction()` call, which is equivalent to `BEGIN TRANSACTION` in SQL.
Implicit transactions are created by the query engine when the `exec()` method
of a query builder is called, and that query builder had not attached to any
explicit transaction.

Query execution and transactions will be detailed in [Transactions](
05_transaction.md).

#### 3.4.3 Observers

Observers are used for data binding, which is documented in [its own section](
04_query.md#46-observers).

#### 3.4.4 Closing Database

Calling `close()` of a database instance will reset the database instance object
to its initial state (unopened) and is *__not__* mandatory nor recommended. Due
to IndexedDB limitations, there is no guarantee that `close()` and
`connect()` again will yield only one database connection.

### 3.5 Query Execution

After connecting to the database, one can start using it by submitting queries.
The query building and the transaction model is documented at
[Query](04_query.md) and [Transaction](05_transaction.md).

### 3.6 Delete Database

Lovefield does not support deleting a database, unfortunately. User is required
to use IndexedDB API to delete the database if required.

### 3.7 Import/Export

Lovefield supports data backup and restore through `export()` and `import()`
APIs provided in `lf.Database`. The `export()` API will export all data in the
database (except persistent indices) into a big JavaScript object in following
format:

```js
{
  "name": <database_name>,
  "version": <database_version>,
  "tables": {
    <table_name>: [
      {
        <column_name>: <value>,
        <column_name>: <value>,
        ...
      },
      { ... },
      ...
    ],
    <table_name>: [ ... ],
    ...
  }
}
```

Users can then take this object and store it somewhere else (e.g. over the
network to a server).

The `import()` *MUST* be performed on an empty database, and the provided data
object must have same name and version. Lovefield *DOES NOT* check for data
integrity during import. Most constraint checks, except primary keys and unique
keys, will be turned off during import. Users are responsible for ensuring
data integrity if the data does not come from Lovefield's `export()`.

Both `import()` and `export()` will lock the database so that no transactions
can be performed until the import/export is done. The code snippet below shows
the usage of `import()` and `export()`:

```js
db.export().then(function(data) {
  // The data object contains the contents of database
});

db.import(data).then(function() {
  // Object data has successfully imported, you can use database as normal.
});
```
