# Lovefield Design Document

## 2. Data Store

In the beginning of Lovefield design, it was identified that two types of
data stores need to exist: persistent data store for applications that need
persistence, and volatile data store for remaining applications and testing.
As time goes by, there are more needs to integrate with different
persistent storage technologies. For example, the integration of Firebase allows
developers to have the best of both worlds: a relational query engine on the
browser-side, and a fully synchronized database among all clients on the
Firebase server.

As a result, Lovefield uses a plug-in architecture for data stores. All data
stores implement `lf.BackStore` interface so that query engine can be decoupled
from actual storage technology.

For databases that features "upgrade mode", an `lf.raw.BackStore` interface is
provided to handle that special case.

### 2.1 Common Nominator

All data stores has three methods in common:

* `init`: indicate the initialization of a data store, which typically means
  establishing connection to a persisted instance. The database upgrade process
  is also initiated here when needed. The initialization also identifies
  maximum row id to-date and continue row id generation from there.

* `createTx`: return a transaction object from data store, and hint the data
  store that an atomic writing operation is going to happen. The transaction
  will be associated with a unique journal which will guarantee all the changes
  are flushed at once. Lovefield only requires the data store to support atomic
  writes. Lovefield manages its own transactions and will group all writes
  of a transaction into one single flush.

* `close`: closes the connection to persisted instance. This call is
  best-effort due to technical limitations (e.g. both IndexedDB and WebSQL have
  no reliable `close` call).

### 2.2 Memory Store

Memory store internally is a lf.structs.Map which maps table name to table.
The table is also a lf.structs.Map that maps row id to the lf.Row object of
that table. The memory store transaction is a naive Promise that will resolve
on commit and reject on abort.

### 2.3 IndexedDB Store

There are some interesting caveats caused by IndexedDB specification, and they
affects the specification design of Lovefield quite a bit. The features that
affect Lovefield design are listed below:

1. __Auto commit__: IndexedDB will automatically commit the transaction if the
   transaction has gone out of its message loop. For example, an XHR call to the
   server in IndexedDB event callback will effectively commit the transaction.

2. __Upgrade__: IndexedDB schema can only be changed in the handler of
   `onupgradeneeded` event. The event can only be triggered when database is
   opened. As a result, to alter schema of Lovefield database, one can only do
   it during initialization time. IndexedDB does not provide a way of renaming
   table, therefore renaming a table will require recreating a table with exact
   contents and deleting the old table, which cannot be done safely within the
   upgrade transaction and user is supposed to do it manually outside of the
   `onUpgrade` function.

3. __Best effort closing__: IndexedDB does not guarantee the database fully
   closed if there are connections to the database. As a result, Lovefield could
   not offer a reliable way to ensure a database instance has brought down
   completely and then opens it again to alter schema.

4. __First writer wins__: IndexedDB supports multiple connections, which means
   multiple processes/tabs can connect to the same database instance. IndexedDB
   currently does not provide any cross-process locking and therefore the first
   writer reaches the database will win, and the other writers with conflict
   scope will be rolled back. IndexedDB also does not offer observer/events for
   changes caused by other session/process/tab.

5. __Event happy__: IndexedDB offers a variety of events for the developer to
   listen and utilize. Unfortunately this also means a lot of unused events
   fired by the browser during bulk load. If the database has more than 10K
   rows in a single table, users need to consider using experimental bundled
   mode to improve app loading time.

Lovefield wraps IndexedDB objects in different classes:

| IndexedDB objects | Wrapper                                           |
|-------------------|---------------------------------------------------|
|`IDBDatabase`      |`lf.backstore.IndexedDB` and `lf.backstore.IndexedDBRawBackstore` (for `onupgrade` helpers). |
|`IDBTransaction`   |`lf.backstore.IndexedDBTx`                         |
|`IDBObjectStore`   |`lf.backstore.ObjectStore` and `lf.backstore.BundledObjectStore` (for bundled mode). |


The goals of the wrapper:

* Provide a cross-browser shim that minimize browser-dependent code.
* Handle transaction auto-commit for users.
* Use best practice to obtain best performance.
* Handle upgrade process in a more elegant way.

Each IndexedDB transaction is associated with a `Journal` object. The `Journal`
object will carry all changes performed in a logical `lf.Transaction` object,
and flush them all at once via the physical IndexedDB transaction object when
the logical transaction is committed. As a result, the IndexedDB transaction
object is named `Tx` throughout the code to distinguish from the logical
transaction object.

#### 2.3.1 Storage Format

The data will be stored in IndexedDB using following hierarchy

* The whole database will be stored in an IndexedDB using database's name
* Each table corresponds to an object store
* Each row corresponds to an object in object store. A row contains two fields:
  * id: unique row id across database
  * value: actual payload of the row, each field in this object corresponds to
    a column in schema

#### 2.3.2 Bundled Mode Experiment

In bundled mode, Lovefield will store rows differently. Internally Lovefield
assigns a unique row id to each logical row. In bundled mode, Lovefield will
bundle multiple (up to 512) logical rows into one physical row in IndexedDB.

Per [current IndexedDB spec](http://www.w3.org/TR/2013/CR-IndexedDB-20130704/),
the only way to load all rows from an IndexedDB table is

```js
var req = objectStore.openCursor();
req.onsuccess = function() {
  if (cursor) {
    // get one row by using cursor.value
    cursor.continue();
  } else {
    // finished
  }
};
```

This code snippet involves N calls of cursor.continue and N eventing of
`onsuccess`, which is very expensive when N is big. WebKit needs 57us for
firing an event on an HP Z620, and the wall clock time for loading 100K rows
just for firing N onsuccess events will be 5.7 seconds, not to mention the
callback processing time. Lovefield provides this bundled mode to accelerate
initial bootstrapping speed by bundling logical rows together. There can be
other performance-related consequences for this approach and thus this feature
is marked as experimental.

Users who enabled bundled mode needs to keep the following facts in mind:

* Writing or updating a row for bundled mode is slower, because it needs
  to pay the tax of extra grouping. Benchmark shows that updating 10K rows is
  about 300-500 ms slower. In exchange, the bulk load is many seconds faster.
* Bundled mode is designed mainly for data tables with 10K+ rows. Smaller
  database may experience slower performance by enabling bundle mode. User is
  supposed to benchmark and determine if bundled mode is feasible.
* To convert non-bundled to bundled database or the other way around:
  * `db.export()` to get the JavaScript representation of the whole database
  * Completely delete the original database using `window.deleteDatabase()`
  * Recreate the database again using `connect()`
  * Use `db.import()` to import previously exported data
* Bundled database is harder to examine via developer tools. The pages serialize
  the payload as string before storing them. This is done so because of way
  greater performance in Chrome (tested on v39.0.2171.36) for large JSON
  objects.

### 2.4 Firebase Store

Lovefield can sit on top of [Firebase](https://www.firebase.com). Lovefield uses
Firebase as a cloud backstore. As a result, one must follow these three rules
when use Lovefield on top of Firebase:

1. All clients accessing the database must use Lovefield.
2. Only one client can be used to create the database.
3. Database upgrade needs to be carried out in a different manner: clients other
   than the upgrading one must not be using the database shall there be a
   database upgrade (this is typically done using Firebase security control
   instead).

#### 2.4.1 Storage Format

For performance reasons, Lovefield stores data in Firebase very differently.
The store is structured like this:

```js
<schema_name>: {
  "@rev": {
    R: <N>,
  },
  "@db": {
    version: <schema version>
  },
  "@table": {
    <table_name>: <table_id>
  },
  <row id 1>: { R: <N1>, T: <T1>, P: <object1> },
  <row id 2>: { R: <N2>, T: <T2>, P: <object2> },
  ...
}
```

R stands for revision, T stands for table id, and P stands for payload. It's
abbreviated to ensure optimal over-the-wire transmission.

### 2.5 WebSQL Store

DEPRECATED. Please upgrade to Safari 10 and stop using this data store.

#### 2.5.1 Storage Format

WebSQL stores data similar to IndexedDB's structure:

* The whole database will be stored in a WebSQL instance using database's name
* A special table named `__lf_ver` that stores metadata for the whole database
* Each table corresponds to a WebSQL table
* Each row corresponds to a row in WebSQL table. A row contains two fields:
  * id: unique row id across database
  * value: serialized JSON string of the row's payload

### 2.6 Database Upgrade

The upgrade process is triggered by bumping up the schema version. Lovefield
will open the database using updated number, and in turn IndexedDB will fire the
`onupgradeneeded` event. In that event, Lovefield will

1. create tables (i.e. `objectstores`) which exist in schema but not in
   IndexedDB
2. wrap the database connection into `lf.backstore.IndexedDBRawBackstore`
3. call user-provided `onUpgrade` function with the wrapped instance

This design still exposes the user under the risk of accidentally auto-commit.
However, there existed no known better alternative that works cross-browser.

### 2.7 External Change

Contents inside a data store can be changed by other sessions or even other
clients. Most data stores lack external change notifications. As a result,
for cross-tab implementations, one need to use Web Worker or Service Worker to
host the database. Lovefield team is aware of this problem and working closely
with IndexedDB team to pursue a change notification standard for IndexedDB.

Local Storage and Firebase change notifications to inform Lovefield that the
contents have changed by external sources. By default, Lovefield listens to
these changes, and will update

* Database cache
* Indices
* Observed queries
