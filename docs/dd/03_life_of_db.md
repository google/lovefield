# Lovefield Design Document

## 3. Life of a Database

In the [specification](../spec/03_life_of_db.md), the lifecycle of a database is
described. In this section, the implementation of this behavior will be
detailed.

### 3.1 Global Object

Lovefield registers an `lf.Global.instance_` object in the global namespace (
i.e. `window`). This instance is unique and shared across all connections in
the session.

Each connection will [register](
https://github.com/google/lovefield/blob/31f14db4995bb89fa053c99261a4b7501f87eb8d/lib/schema/builder.js#L75-L85)
its own global object with this session-unique instance. This global object
serves as the service registry for that connection. Since Lovefield assumes
one connection to a DB instance on data store at a given session, the
global object for that connection will be unique, too.

#### 3.1.1 Services

There are some connection-unique components that are required to support the
query engine. These services are documented in [`service.js`](
https://github.com/google/lovefield/blob/master/lib/service.js).
Most services are created and registered during database initialization.

### 3.2 Database Initialization

#### 3.2.1 Connect to Database

"Connect" in Lovefield means establish association between the library and the
database on data store. It has nothing to do with network connectivity.
Connection is performed via calling either `lf.schema.Builder#connect()`, or
SPAC generated `<namespace>.connect()`.

The flow of `connect`:

* Initialize Global object and register schema.
* Initialize the database
  * Create and register row cache and data store object
  * [Initialize data store object](#322-indexeddb-initialization), perform
    upgrade if needed
  * [Service initialization](#323-service-initialization)
  * [Prefetch data](#324-prefetch-data)

#### 3.2.2 IndexedDB Initialization

IndexedDB requires a name and the version number to open connection to
specified database, which are provided in schema. It will fire the
`onupgradeneeded` or `onerror` event if it detects version mismatch.
Lovefield provides some helper functions to assist the user perform database
upgrade, which is already [documented in the spec](
../spec/03_life_of_db.md#33-database-upgrade).

After the `IDBDatabase` object is successfully returned from IndexedDB APIs,
Lovefield will scan every table to identify the maximum row id of a table.
Then, it will gather all the information and determine the next row id to
use for this connection. All the ids are indexed by IndexedDB and theoretically
the scan shall be done in O(N) time where N is the number of tables in schema.


#### 3.2.3 Firebase Initialization

For Firebase initialization, it first will attempt to obtain `@db/version` and
`@rev/R` for database version and change revision. When there is a version
mismatch, Lovefield will call your `onUpgrade` handler, but this time the name
is a bit deceiving. In the case of Firebase, this typically means that the user
is running a cached JS on browser, and what you really want to do is to have
them refresh the session and reload an updated binary.

#### 3.2.3 Service Initialization

Object instances of the cache (`lf.cache.DefaultCache`), query engine
(`lf.proc.DefaultQueryEngine`), transaction runner (`lf.proc.Runner`), index
store (`lf.index.MemoryStore`), and observer registry (`lf.ObserverRegistry`)
will be created during database initialization.

The row cache is conceptually a big map of row ids to rows (and that is why
Lovefield has unique row ids across the board). Currently the cache is a "dumb"
cache: it contains exact replica of what are persisted in the IndexedDB. The
reason for doing that is to workaround IndexedDB inefficiency of handing bulk
I/O, as described in [backstore section](
03_backstore.md#bundled-mode-experiment). By caching all rows in memory,
Lovefield avoids any additional round-trip required to load data from IndexedDB,
with the price of memory usage.

Currently Lovefield has only in-memory index store. The index store
initialization will scan all indices specified in the schema and create empty
indices accordingly.

#### 3.2.4 Prefetch Data

The prefetcher (`lf.cache.Prefetcher`) is responsible for prefetching data from
data store into the cache. All table data will be loaded into the cache.

The prefetcher loads one table at a time. If the table's schema does not have
the pragma `persistentIndex`, then all indices in that table will be constructed
on-the-fly during prefetching, otherwise they will be deserialized from data
store.

By default, Lovefield does not persist index data. This is done so to improve
write speed. This configuration is subjected to change once more in-field data
is collected.

Lovefield made the design trade-off to have prefetcher perform bulk loading
during database initialization, which is not optimal especially for large data
sets. In the future, Lovefield plans to implement an MRU-based lazy-load cache
that loads data in the background on demand.

#### 3.2.5 Special Handling for Firebase

For Firebase, the prefetch data will actually trigger Firebase to load data
over the wire during the initialization of database. This generally is not a
problem since Firebase.js may already had those data. If you had a large amount
of data, you will need to fine tune your code and the Firebase server-side
settings to overcome this issue.

### 3.3 Life of Query

Once the database is fully initialized, it can start accepting queries. The life
of query consists of three stages:

1. Build query context
2. (Optional) Bind values to parametrized query
3. Create query plan
4. Execute query plan

#### 3.3.1 Build Query Context

Query context is built from one of the query builders (`lf.query.*`). The query
builders inherit common base class `lf.query.BaseBuilder` and implement one of
the query builder interfaces (`lf.query.Select/Insert/Update/Delete`). The query
builders perform the following major tasks:

1. Create the query context
2. Validate input and syntax
3. Bind values for parametrized queries

Once the query context is successfully built, the builder can be used to
generate the query plan through its `exec()` or `explain()` method.

#### 3.3.2 Parameter Binding

Parameterized query works similarily to Oracle's or SQLite's parametrized query
API. The general idea is to put a placeholder in query context, and replace the
value with runtime values (i.e. *bind* the parameters).

There are two different scenarios in parametrized query:

* Search condition
* Update set

The search condition binding is achieved via [value predicates](
https://github.com/google/lovefield/blob/master/lib/pred/value_predicate.js).
The `lf.bind` will return an `lf.Binder` object. When value predicate is
constructed with `lf.Binder` (for most operators) or array of `lf.Binder` (in
the case of `IN` or `BETWEEN`), it will keep the binder reference internally.
When `bind` method is called, it will update its internally stored `value` to
the value(s) given in `bind`. When the `eval` method is called, the predicate
will return the bound value, or throws an error if unbound.

The update set binding is done in [`update_builder.js`](
https://github.com/google/lovefield/blob/master/lib/query/update_builder.js),
since all the set values are kept internally in that class.

#### 3.3.3 Create Query Plan

This is the main task of the [Query Engine](04_query_engine.md) and is
documented separately.

#### 3.3.4 Execute Query Plan

The query plans are executed withing a transaction context, which is documented
separately in [Transaction](05_transaction.md).

