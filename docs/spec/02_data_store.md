# Lovefield Specification

## 2. Data Store

Lovefield stores its data in data store. There are two different type of data
stores:

* Persistent: data are persisted between sessions. The default persistent
  implementation uses IndexedDB.

* Volatile: data are stored in memory and will be lost when session ends. This
  is useful when the user only wants to use Lovefield's query engine but still
  fetch all data from server.

The data store is modeled in an interface, `lf.raw.BackStore`.

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
   it during initialization time.

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

### 2.2 `lf.raw.BackStore`

This interface models data store behavior __only during database upgrades__. See
[Life of DB](03_life_of_db.md) for more details.

|Section                        |Function            |
|:------------------------------|--------------------|
|[2.2.1](#221-constructor)      |Constructor         |
|[2.2.2](#222-getrawdbinstance) |`getRawDBInstance`  |
|[2.2.3](#223-getrawtransaction)|`getRawTransaction` |
|[2.2.4](#224-droptable)        |`dropTable`         |
|[2.2.5](#225-renametablecolumn)|`renameTableColumn` |
|[2.2.6](#226-createrow)        |`createRow`         |
|[2.2.7](#227-getversion)       |`getVersion`        |
|[2.2.8](#228-dump)             |`dump`              |

#### 2.2.1 Constructor

The `lf.raw.BackStore` object can only be acquired through the `opt_onUpgrade`
callback in `getInstance()` call of database initialization.

#### 2.2.2 `getRawDBInstance`

| Function               | Returns                |
|:-----------------------|:-----------------------|
|`getRawDBInstance()`    |`RawDB` template        |

This is only effective for IndexedDB data store. It returns an `IDBDatabase`
object as documented in [IndexedDB spec](http://www.w3.org/TR/IndexedDB).

#### 2.2.3 `getRawTransaction`

| Function               | Returns                |
|:-----------------------|:-----------------------|
|`getRawTransaction()`   |`RawTx` template        |

This is only effective for IndexedDB data store. It returns an `versionchange`
transaction as documented in [IndexedDB spec](http://www.w3.org/TR/IndexedDB).

#### 2.2.4 `dropTable`

| Function               | Returns                |
|:-----------------------|:-----------------------|
|`dropTable(tableName)`  |`Promise`               |

| Parameter | Type   |Meaning         |
|:----------|:-------|:---------------|
|`tableName`|`string`|Table name      |

Removes a table from data store. Lovefield does not support automatic dropping
table. Users must call `dropTable` manually during upgrade to purge table(s)
that are no longer used from database.

#### 2.2.5 `addTableColumn`

| Function                                            | Returns |
|:----------------------------------------------------|:--------|
|`addTableColumn(tableName, columnName, defaultValue)`|`Promise`|

| Parameter    | Type   |Meaning         |
|:-------------|:-------|:---------------|
|`tableName`   |`string`|Table name      |
|`columnName`  |`string`|Column name     |
|`defaultValue`|`*`     |Default value   |

Adds a column to existing table rows. This API does not provide any consistency
check. Callers are solely responsible for making sure the values of `columnName`
and `defaultValue` are consistent with the new schema.

#### 2.2.6 `renameTableColumn`

| Function                                                   | Returns |
|:-----------------------------------------------------------|:--------|
|`renameTableColumn(tableName, oldColumnName, newColumnName)`|`Promise`|

| Parameter     | Type   |Meaning         |
|:--------------|:-------|:---------------|
|`tableName`    |`string`|Table name      |
|`oldColumnName`|`string`|Old column name |
|`newColumnName`|`string`|New column name |

Renames a column for all existing table rows.

#### 2.2.7 `createRow`

| Function           | Returns |
|:-------------------|:--------|
|`createRow(payload)`|`lf.Row` |

| Parameter    | Type   |Meaning         |
|:-------------|:-------|:---------------|
|`payload     `|`Object`|                |

Creates a Lovefield row structure that can be stored into raw DB instance via
raw transaction.

#### 2.2.8 `getVersion`

| Function           | Returns |
|:-------------------|:--------|
|`getVersion()`      |number   |

Returns version of existing DB.

#### 2.2.9 `dump`

| Function           | Returns |
|:-------------------|:--------|
|`dump()`            |`Promise`|

Offers last resort for data rescue. This function dumps all rows in the database
to one single JSON object in the following format:

```json
{
  "table1": [ <row1>, <row2>, ..., <rowN> ],
  "table2": [ ... ],
  ...
  "tableM": [ ... ]
}
```
