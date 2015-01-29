#Lovefield Design Document
## Backstore

In the beginning of Lovefield design, it was identified that two different
backstore needs to exist: a persistent backstore for applications that need
persistence, and a volatile in-memory backstore for remaining applications and
for testing purposes. By defining the interface of backstore, we hope that the
need to use persistent backstore in tests can be vastly reduced, and backstores
can be swapped for better testability.

> #### Why not persistent storage in testing?
> One cruel fact of testing is that tests can fail, which is the reason why
> tests exist. When tests fail, it needs to clean up after itself. Using a
> persistent storage will make the clean-up way more complicated, especially
> when a test is failed by a JavaScript exception. Moreover, most tests shall
> not involve persistent storage anyway.

As a result, there are two different backstores being created: IndexedDB as
the persistent store, and Memory as the temporary/volatile store.

### Common Nominator
A backstore has three methods:

* `init`: indicate the initialization of a backstore, which typically means
  establishing connection to backstore. The database upgrade process is also
  initiated here. The initialization also identifies maximum row id to-date
  and continue row id generation from there.

* `createTx`: indicate the backstore shall return a transaction object, also
  hint the backstore that an atomic writing operation is going to happen. The
  transaction will be associated with a unique journal which will guarantee
  all the changes are flushed at once.

* `close`: closes the connection to backstore. This is a best-efforts call.

All backstores have to support these methods.

### Memory Store
Memory store internally is a goog.structs.Map which maps table name to table.
The table is also a goog.structs.Map that maps row id to the lf.Row object of
that table. The memory store transaction is a naive Promise that will resolve
on commit and reject on abort.

### IndexedDB Store
Lovefield wraps IndexedDB objects in different classes:

| IndexedDB objects | Wrapper                                           |
|-------------------|---------------------------------------------------|
|`IDBDatabase`      |`lf.backstore.IndexedDB` and `lf.backstore.IndexedDBRawBackstore` (for onupgrade helpers). |
|`IDBTransaction`   |`lf.backstore.IndexedDBTx`                         |
|`IDBObjectStore`   |`lf.backstore.ObjectStore` and `lf.backstore.BundledObjectStore` (for bundled mode). |


The goals of the wrapper:

* Provide a cross-browser shim that minimize browser-dependent code.
* Handle trappy auto-commit for users.
* Use best practice to obtain best performance.
* Handle upgrade process in a more elegant way.

Each IndexedDB transaction is associated with a `Journal` object. The `Journal`
object will carry all changes performed in a logical `lf.Transaction` object,
and flush them all at once via the physical IndexedDB transaction object when
the logical transaction is commited. As a result, the IndexedDB transaction
object is named `Tx` throughout the code to distinguish from the logical
transaction object.


### Database Upgrade
The upgrade process is triggered by bumping up the schema version. Lovefield
will open the database using updated number, and in turn IndexedDB will fire the
`onupgradeneeded` event. In that event, Lovefield will

1. create tables (i.e. objectstores) which exist in schema but not in IndexedDB
2. wrap the database instance into `lf.backstore.IndexedDBRawBackstore`
3. call user-provided `onUpgrade` function with the wrapped instance

This design still exposes the user under the risk of accidentally auto-commit.
However, we could not find a better alternative that works cross-browser.

### Bundled Mode Experiment
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

* Bundled mode is designed mainly for data tables with 50K+ rows. Smaller
  database may experience slower performance by enabling bundle mode. User is
  supposed to benchmark and determine if bundled mode is feasible.
* There is no support for converting non-bundled to bundled database, and vice
  versa. Manual conversion is possible but will not be easy.
* Bundled database is harder to examine via developer tools. The pages serialize
  the payload as string before storing them. This is done so because of way
  greater performance in Chrome (tested on v39.0.2171.36) for large JSON
  objects.
