# Lovefield Specification

## 2. Data Store

Lovefield stores its data in data store. There are two different type of data
stores:

* Persistent: data are persisted between sessions. The default persistent
  implementation uses IndexedDB.

* Volatile: data are stored in memory and will be lost when session ends. This
  is useful when the user only wants to use Lovefield's query engine but still
  fetch all data from server.

The data store is modeled in an interface, [`lf.raw.BackStore`](
https://github.com/google/lovefield/blob/master/lib/raw.js).

### 2.1 IndexedDB Features and Limitations

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
   rows in a single table, please consider use the [Bundled Mode](99_postfix.md)
   to improve app loading time.


### 2.2 Row

In Lovefield, the unit of storage is a row. A row has a unique row id
across the whole database instance, therefore there is a theoretical limit of
number of rows that Lovefield can hold (`Number.MAX_SAFE_INTEGER`) within a
database instance.

Internally, the row is represented as [`lf.Row`](
https://github.com/google/lovefield/blob/master/lib/row.js). This class is
designed for Lovefield query engine. The results returned from
[select query](04_select.md) are plain JavaScript objects,
not `lf.Row` instances.

On the other hand, users are supposed to use `createRow()` function to prepare
data for `insert()` or `insertOrReplace()`, because this allows Lovefield to
have a chance to safely convert user payload into Lovefield desired rows.
In short, `lf.Row` abstracts how Lovefield serialize/deserialize a row from
underlying data store. Further details will be provided in
[Select](04_select.md) and [Insert](05_insert_update.md).

### 2.3 Persistence

Data persistence is organized in a way that all rows of a given table will be
stored in a grouped area. For example, all rows of a given table will be stored
in the corresponding object store in IndexedDB by default. This allows easier
debugging when the user needs to inspect raw data in the database.

However, Lovefield can not guarantee that raw data will be easily inspectable
from data store. There are cases it's not possible, for example, opting in the
experimental feature [Bundle Mode](99_postfix.md).

### 2.4 Quota Management

Lovefield does not do quota management. The user is responsible for allocating
enough storage quota since it may require UI interactions.
