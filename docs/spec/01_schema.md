# Lovefield Specification

## 1. Schema Definition

Schema is the structure of the relational database. A schema contains a name and
a version number. The origin of the program, the name, and the version number
together uniquely identify a database schema on the persistence store. Please
see [Lovefield Initialization](03_life_of_db.md#31-lovefield-initialization) for
detailed explanation.

The database name must abide [naming rule](#11-naming-rules). Database version
must be an integer greater than 0. This version will be used by Lovefield to
determine if a database needs upgrade. The developers are supposed to do data
migration using [database upgrade](03_life_of_db.md#33-database-upgrade)
mechanism described in the spec.

The following code demonstrates how to use Lovefield-provided APIs to declare
a database schema.

```js
// Begin schema creation.
var ds = lf.schema.create('crdb', 1);

ds.createTable('Asset').
    addColumn('id', lf.Type.STRING).
    addColumn('asset', lf.Type.STRING).
    addColumn('timestamp', lf.Type.INTEGER).
    addPrimaryKey(['id']);

ds.getInstance(/* opt_onUpgrade */ undefined, /* opt_volatile */ true).then(
    // End of schema creation, begin queries.
    function(db) {
      var asset = db.getSchema().table('Asset');
      var query = db.select().from(asset).where(asset['id'].eq('12345'));
      return query.exec();
    }).then(function(results) {
      results.forEach(function(row) {
        console.log(row['id']);
      });
    });
```

### 1.1 Naming Rules

All naming in Lovefield must pass the following JavaScript regex check:

`/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)`

Names that violates this check will result in exceptions.


### 1.2 Initiate Schema Builder

The API used to create schema is `lf.schema.create`:

| Function                            | Returns           |
|:------------------------------------|:------------------|
|`lf.schema.create(dbName, dbVersion)`|`lf.schema.Builder`|

Creates a schema builder to build database schema.

##### Parameters

| Parameter | Type   |Meaning         |
|:----------|:-------|:---------------|
|`dbName`   |`string`|Database name   |
|`dbVersion`|`number`|Database version|

Lovefield APIs are grouped inside the `lf` namespace to avoid polluting the
global namespace. All schema creations start from instantiating a schema
builder.

### 1.3 Class `lf.schema.Builder`

|Section                  |Function      |
|:------------------------|--------------|
|[1.3.1](#131-constructor)|Constructor   |
|[1.3.2](#132-createtable)|`createTable` |
|[1.3.3](#133-getinstance)|`getInstance` |

#### 1.3.1 Constructor

User shall only instantiate this class object through `lf.schema.create`.

#### 1.3.2 `createTable`

| Function               | Returns                |
|:-----------------------|:-----------------------|
|`createTable(tableName)`|`lf.schema.TableBuilder`|

`createTable` instantiates a table builder inside the schema builder, which will
effectively construct a table when the builder is finalized.

| Parameter | Type   |Meaning         |
|:----------|:-------|:---------------|
|`tableName`|`string`|Table name      |

#### 1.3.3 `getInstance`

| Function                                 | Returns          |
|:-----------------------------------------|:-----------------|
|`getInstance(opt_onUpgrade, opt_volatile)`|`lf.proc.Database`|

Finalizes schema building and create a database instance that can be used to run
queries. `lf.schema.Builder` is stateful: it has a building state and a
finalized state. The schema can only be modified in building state. Once
finalized, it will not accept any `createTable()` calls.

| Parameter     | Type             |Meaning         |
|:--------------|:-----------------|:---------------|
|`opt_onUpgrade`|`!function(!lf.raw.BackStore):!Promise=`|Optional DB upgrade function.|
|`opt_volatile` |`boolean=`        |Optional volatile parameter.|

The two parameters are both optional. Their detailed usage is described in
[database upgrade](#03_life_of_db#33-database-upgrade)


### 1.4 Class `lf.schema.TableBuilder`

A table in Lovefield is similar to SQL tables. The user can specify indices and
constraints in the table-level. All member functions of `lf.schema.TableBuilder`
return the object itself to support chaining pattern.

|Section                      |Function         |
|:----------------------------|-----------------|
|[1.4.1](#141-constructor)    |Constructor      |
|[1.4.2](#142-addcolumn)      |`addColumn`      |
|[1.4.3](#143-addprimarykey)  |`addPrimaryKey`  |
|[1.4.4](#144-addforeignkey)  |`addForeignKey`  |
|[1.4.5](#145-addunique)      |`addUnique`      |
|[1.4.6](#146-addnullable)    |`addNullable`    |
|[1.4.7](#147-addindex)       |`addIndex`       |
|[1.4.8](#148-persistentindex)|`persistentIndex`|

#### 1.4.1 Constructor

User shall only instantiate this class object through
`lf.schema.Builder.prototype.createTable`.

#### 1.4.2 `addColumn`

| Function              | Returns                |
|:----------------------|:-----------------------|
|`addColumn(name, type)`|`lf.schema.TableBuilder`|

Adds a column to current table. Columns are identified by column names, and
column names must be unique within the table. Each column must have an
associated data type.

| Parameter     | Type             |Meaning         |
|:--------------|:-----------------|:---------------|
|`name`         |`string`          |Column name     |
|`type`         |`lf.Type`         |Column type     |

The supported data types are listed in `lf.Type`:

| Type                 | Default Value | Nullable | Description               |
|:---------------------|:--------------|:---------|:--------------------------|
|`lf.Type.ARRAY_BUFFER`|`null`    |Yes |JavaScript `ArrayBuffer` object       |
|`lf.Type.BOOLEAN`     |`false`   |No  |                                      |
|`lf.Type.DATE_TIME`   |`Date(0)` |Yes |JavaScript Date, will be converted to timestamp integer internally |
|`lf.Type.INTEGER`     |`0`       |No  |32-bit integer                        |
|`lf.Type.NUMBER`      |`0`       |No  |JavaScript `number` type              |
|`lf.Type.STRING`      |`''`      |Yes |JavaScript `string` type              |
|`lf.Type.OBJECT`      |`null`    |Yes |JavaScript `Object`, store as-is      |

Although `lf.Type.STRING` and `lf.Type.DATE_TIME` can be null, the fields are
defaulted to `NOT NULL`. This is very different from typical SQL engine
behavior. The user needs to specifically call out these fields as nullable by
calling [`addNullable`](#146-addnullable).

Lovefield internally accepts only string or number as index key. Array buffers
and objects are not indexable (i.e. they cannot be put as index or any of the
constraints) nor searchable (i.e. them cannot be part of `WHERE` clause).
Implicit conversions will be performed internally if the following types are
used as index / primary key or being placed as a unique constraint:
* `lf.Type.BOOLEAN`: convert to `lf.Type.STRING`
* `lf.Type.DATE_TIME`: convert to `lf.Type.NUMBER`
* `lf.Type.INTEGER`: convert to `lf.Type.NUMBER`


#### 1.4.3 `addPrimaryKey`

| Function                            | Returns                |
|:------------------------------------|:-----------------------|
|`addPrimaryKey(columns, opt_autoInc)`|`lf.schema.TableBuilder`|

Adds a primary key to table. Each table can only have one primary key. Same as
the SQL world, primary key implies unique and not null.

| Parameter     | Type             |Meaning         |
|:--------------|:-----------------|:---------------|
|`columns`      |`!Array.<string>` or `!Array<{column:string, order:lf.Order}>`|Column(s) to be keyed|
|`opt_autoInc`  |`boolean=`        |Optional, creates an auto-increment key |

There are two overloads for parameter `columns`. The first one specifies primary
key by given only column names with default ascending orders (`lf.Order.ASC`).
The second one allows user to specify different ordering per-column.

Valid ordering are described in `lf.Order`:

| Value         | Meaning                 |
|:--------------|:------------------------|
|`lf.Order.ASC` |Ascending order (default)|
|`lf.Order.DESC`|Descending order         |

When `opt_autoInc` is `true`, there can be only one column in the `columns`
parameter, its type must be `lf.Type.INTEGER`, and its order must be the default
`lf.Order.ASC`. Auto-incremented values start from 1.

#### 1.4.4 `addForeignKey`

| Function                            | Returns                |
|:------------------------------------|:-----------------------|
|`addForeignKey(name, localColumn, remoteTable, remoteColumn, opt_cascade)`|`lf.schema.TableBuilder`|

Creates a foreign key.

| Parameter    | Type     |Meaning                                   |
|:-------------|:---------|:-----------------------------------------|
|`name`        |`string`  |Key name                                  |
|`localColumn` |`string`  |Local column name                         |
|`remoteTable` |`string`  |Remote table name                         |
|`remoteColumn`|`string`  |Remote column name                        |
|`opt_cascade` |`boolean=`|Cascade, optional, default to false       |

Primary key and foreign key constraint violations will cause transaction
rejection, just like what happens in SQL. When `opt_cascade` is true for
a foreign key, Lovefield query engine will perform cascade delete and update
if necessary.

#### 1.4.5 `addUnique`

| Function                            | Returns                |
|:------------------------------------|:-----------------------|
|`addUnique(name, columns)`           |`lf.schema.TableBuilder`|

Adds a unique constraint on column(s). Unique constraints imply implicit
indices. A cross-column unique constraint means the value combinations of these
columns must be unique.

| Parameter   | Type           |Meaning                         |
|:------------|:---------------|:-------------------------------|
|`name`       |`string`        |Key name                        |
|`columns`    |`!Array<string>`|Existing column(s) in schema    |

#### 1.4.6 `addNullable`

| Function                      | Returns                |
|:------------------------------|:-----------------------|
|`addUnique(columns)`           |`lf.schema.TableBuilder`|

Specify nullable columns by their name. *Nullable columns cannot be indexed*.

| Parameter   | Type           |Meaning                         |
|:------------|:---------------|:-------------------------------|
|`columns`    |`!Array<string>`|Existing column(s) in schema    |

#### 1.4.7 `addIndex`

There are two overloads for `addIndex`, both adds an index for the table.
The first form adds an index by column names only:

| Function                                       | Returns                |
|:-----------------------------------------------|:-----------------------|
|`addIndex(name, columns, opt_unique, opt_order)`|`lf.schema.TableBuilder`|

| Parameter  | Type            |Meaning                                    |
|:-----------|:----------------|:------------------------------------------|
|`name`      |`string`         |Name of the index                          |
|`columns`   |`!Array.<string>`|Column(s) to be indexed                    |
|`opt_unique`|`boolean=`       |Optional, values are uniquely constrainted |
|`opt_order` |`lf.Type.Order=` |Optional, order of the column(s), default to `lf.Order.ASC`|

The second form allows customization of ordering, but more complicated:

| Function                                 | Returns                |
|:-----------------------------------------|:-----------------------|
|`addIndex(name, columns, opt_unique)`     |`lf.schema.TableBuilder`|

| Parameter  | Type            |Meaning                                        |
|:-----------|:----------------|:----------------------------------------------|
|`name`      |`string`         |Name of the index                              |
|`columns`   |`!Array.<{column:string, order:lf.Order}>`|Columns to be indexed |
|`opt_unique`|`boolean=`       |Optional, values are uniquely constrainted     |

Indices can be single-column or cross-column. Unlike most SQL engines, Lovefield
has a limit that all values in indexed column must not be null. All unique
constraint also builds implicit index, and therefore creating index with
identical scope will yield in exceptions.

Lovefield does not support custom index. Custom index means creating an index
based on transformations. For example, reverse text of an e-mail address field.
It's not included because it is not possible to persist JavaScript functions
then eval due to Chrome Apps v2 constraints. Users are supposed to do the
transformations in their own JavaScript and store the transformed data.


#### 1.4.8 `persistentIndex`

By default, Lovefield constructs table indices during loading. The indices of a
given table will be persisted if this function is called.

| Function               | Returns                |
|:-----------------------|:-----------------------|
|`persistentIndex(value)`|`lf.schema.TableBuilder`|

| Parameter   | Type           |Meaning                   |
|:------------|:---------------|:-------------------------|
|`value`      |`boolean`       |                          |


### 1.5 Static Schema Construction

Lovefield ships with SPAC (Schema Parser And Code-generator) that can generate
JavaScript source code according to provided schema YAML file. This is
considered advanced topic and is detailed in [its own section](10_spac.md).
