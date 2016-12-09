# Lovefield Specification

## 2. Data Store

Lovefield stores its data in data store. Lovefield currently supports following
data stores:

| Data Store Type | Persistent | Status | Description |
|-----------------|------------|--------|-------------|
|`lf.schema.DataStoreType.INDEXED_DB`|Yes (in browser)|Released|Data store using IndexedDB that persists data between sessions.|
|`lf.schema.DataStoreType.MEMORY`|No|Released|Volatile store that only works for current session.|
|`lf.schema.DataStoreType.FIREBASE`|Yes (in the cloud)|Released|Data store using Firebase that persists data in the cloud.|
|`lf.schema.DataStoreType.WEB_SQL`|Yes (in browser)|Deprecated||

### 2.1 Row

In Lovefield, the unit of storage is a row. A row has a unique row id
across the whole database instance, therefore there is a theoretical limit of
number of rows that Lovefield can hold (`Number.MAX_SAFE_INTEGER`) within a
database instance.

Internally, the row is represented as [`lf.Row`](
https://github.com/google/lovefield/blob/master/lib/row.js). This class is
designed for Lovefield query engine. The results returned from
[select query](04_query.md) are plain JavaScript objects,
not `lf.Row` instances.

On the other hand, users are supposed to use `createRow()` function to prepare
data for `insert()` or `insertOrReplace()`, because this allows Lovefield to
have a chance to safely convert user payload into Lovefield desired format.
In short, `lf.Row` abstracts how Lovefield serialize/deserialize a row from
underlying data store. Further details will be provided in
[Select and Insert](04_query.md).

### 2.2 Persistence

Data persistence is organized in a way that best suits the performance need for
underlying data store. Detailed internal storage formats are documented in
[Design Document](../dd/02_data_store.md). Lovefield can not guarantee that raw
data will be easily inspectable from data store. There are cases it's not
possible, for example, opting in the experimental feature
[Bundle Mode](99_postfix.md).

Firebase data store actually stores data in the cloud (i.e. Firebase servers).
They could not be retrieved if there were no network connectivity. Lovefield
also assumes an authenticated Firebase instance is provided with sufficient
privilege for Lovefield to read/write.

Lovefield does not do quota management. The user is responsible for allocating
enough storage quota since it may require UI interactions.

### 2.3 Experimental Stores

The deprecated WebSQL back store was created for legacy Safari. As of Safari 10,
everything is fully supported. Please move away from WebSQL backstore since it
will be removed from Lovefield in near future.

There is a LocalStorage-based store for Lovefield testing and will not be public
unless sufficient interests arisen.
