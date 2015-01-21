# Lovefield Specification

## 1. Schema Definition

Lovefield provides two different ways of defining database schema: static and
dynamic. The static way of schema definition is to use a YAML file to describe
the schema, and SPAC (Schema Parser And Code-generator) will read the file and
generate corresponding classes and code, similar to what has been done in
protobuf: define a proto file, and then use protoc to generate code for it.
The dynamic way is to create database schema programmatically without using a
YAML schema, at the cost of losing some syntactic sugars that static schema
provides. The dynamic schema creation and its limitations are detailed on
[Dynamic Schema Creation](01_schema.md#15-dynamic-schema-creation).

The static schema YAML file looks like the following:

```yaml
%YAML 1.2
---
name: <string>  # Required
version: <integer>  # Required, must be positive integer >= 1
table:  # Required, at least one table definition must exist
  <table1_definition>
  <table2_definition>
  ...
```
A schema contains a name to uniquely identify a database schema on the
persistence store and will be forged onto generated code. The origin and schema
name uniquely identifies a database, please see
[Lovefield Initialization](03_life_of_db.md#31-lovefield-initialization) for
detailed explanation.

Database version must be an integer greater than 0. This version will be used by
Lovefield to determine if a database needs upgrade. The developers are supposed
to do data migration using
[database upgrade](03_life_of_db.md#33-database-upgrade) mechanism described
below.

### 1.1 Table Definition

A table definition is a [YAML](http://www.yaml.org) object using following
syntax:

```yaml
<table_name>:
  column:  # required, each table must have at least one column
    <column1_name>: <type>
    <column2_name>: <type>
    ...
  constraint:  # optional
    <constraint_definition>
  index:  # optional
    <index1_definition>
    <index2_definition>
    ...
```

A table must have a unique name in the database. All names in schema definition
must consist only alphanumeric characters or underscore. The names are
case-sensitive (contrary to SQL's case-insensitiveness). For best readability
of generated code, it is suggested to use Camel style for names.

Please note that although names are case-sensitive, the SPAC may still emit
errors if it is not able to generate unique names for them. For example, if you
have two tables, one named “hd” and the other named “Hd”, SPAC will not be able
to auto-generate code for that and will reject the schema.

### 1.2 Column Definition

A column definition is a YAML field:

```yaml
<column_name>: <type>
```

Columns are identified by column names, and column names must be unique within
the table. Each column must have an associated data type. The supported data
types are:

* `arraybuffer` (the ArrayBuffer in JavaScript, default to null)
* `boolean` (default to false)
* `datetime` (pseudo, will convert to timestamp integer internally, but nullable)
* `integer` (32-bit integer, default to 0)
* `number` (default to 0)
* `object` (nullable generic JavaScript object, will be stored verbatim)
* `string` (default to empty string, but nullable)

Integer is called out from number because of its wide usage. Boolean, integer,
and number fields are not nullable. Lovefield does not allow undefined in any
of the field value.

Lovefield accepts only string or number as index key. Array buffers and objects
are not indexable (i.e. you cannot put them as index or any of the constraints)
nor searchable (i.e. you cannot put them as part of `WHERE` clause). Implicit
conversions will be performed internally if the following types are used as
index / primary key or being placed as a unique constraint:
* `boolean`: convert to string
* `datetime`: convert to number
* `integer`: convert to number

Array buffers may be converted to hex strings when stored into the backstore
since some browser implementations disallow direct blob storage. Users need to
be aware of the performance impact of blob conversion.

Lovefield assumes all columns are `NOT NULL` by default, which is a different
behavior from SQL and the user shall be aware of it.

### 1.3 Constraint Definition

Constraints are optional. There are four different constraints supported by
Lovefield: primary key, foreign key, nullable, and unique. Constraints are
defined as a YAML object:

```yaml
constraint:
  primaryKey:  # optional
    <primaryKey_definition>
  unique:  # optional
    <uniqueness1_definition>
    <uniqueness2_definition>
    ...
  nullable: [ <nullable_columns> ]  # optional
  foreignKey:  # optional
    <foreignKey1_definition>
    <foreignKey2_definition>
    ...
```

All properties of the constraint object are optional.

`primaryKey` can contain one or more columns. Primary key implies not null and
unique, and conflicting definitions will cause SPAC to reject this schema.

There are two types of primary key definition:

```yaml
primaryKey: [columns]
```

This type is used to define simple primary keys that use default ascending
order. The second type has two different variations:

```yaml
primaryKey:
  - column: <column_name>
    autoIncrement: true
```
The first variation is used to define an auto-increment primary key. Lovefield
supports only single-column numeric auto-increment primary key. The second
variation allows specification of order:

```yaml
primaryKey:
  - column: <column_name>
    order: <desc | asc>
  - column: <column_name>
    order: <desc | asc>
  ...
```

`unique` can be defined on a single column or cross column, and each will imply
an implicit index. The uniqueness definition is a YAML object

```yaml
<uniqueness_name>:
  column: [ <unique_columns> ]  # required
```

A cross-column `unique` constraint means the value combinations of these columns
must be unique.

`nullable` is an array of all nullable columns.

Foreign key is defined as a YAML object

```yaml
<foreignKey_name>:
  localColumn: <local_column>  # required
  reference: <remote_table>  # required
  remoteColumn: <remote_column>  # required
  cascade: <boolean>  # optional
```

Primary key and foreign key constraint violations will cause transaction
rejection, just like what happens in SQL. The not null constraint applies only
to strings.

When the `cascade` field is true for a foreign key, Lovefield query engine will
perform cascade delete and update. `cascade` field is optional and defaulted to
false.

### 1.4 Index Definition

An index definition is a YAML object, which accepts two different syntaxes. The
first syntax is:

```yaml
<index_name>:
  column: [ <column_names> ]  # required
  order: < desc | asc >  # optional, default to asc
  unique: <boolean>  # optional
```

This is used when all columns are of the same order. If not, you need to use
this syntax instead:

```yaml
<index_name>:
  column:
    - name: <column_name>
      order: < desc | asc >  # optional, default to asc
    - name: <column_name>
      order: < desc | asc >
    ...
  unique: <boolean>  # optional
```

Indices can be single-column or cross-column. Unlike most SQL engines, Lovefield
has a limit that all values in indexed column must not be null. The order and
unique fields are optional. If not specified, all indices are created in
ascending order. All unique constraint also builds implicit index, so you don't
need to create index on them. There can be multiple columns in an index.

#### Custom Index
Custom index means creating an index based on transformations. For example,
reverse text of an e-mail address field. It's not included because we cannot
persist JavaScript functions and eval due to Chrome Apps v2 constraints. Users
are supposed to do the transformations in their own JavaScript and store the
transformed data.

Below is the example of a sample schema in Lovefield and their SQL-equivalent:
<table>
  <tr>
    <td><pre>
%YAML 1.2
---
name: crdb
version: 1
table:
  ImageCache:
    column:
      remote: string
      local: string
    constraint:
      primaryKey: [ remote ]

  Asset:
    column:
      id: string
      asset: string
      timestamp: integer
    constraint:
      primaryKey: [ id ]

  Pin:
    column:
      id: string
      state: integer
      sessionId: string
    constraint:
      foreignKey:
        fkId:
          localColumn: id
          reference: Asset
          remoteColumn: id
          cascade: true

  InfoCard:
    column:
      id: string
      lang: string
      itag: integer
      country: string
      fileName: string
    constraint:
      primaryKey: [ id, lang ]
      unique:
        uniqFN:
          column: [ fileName ]
    index:
      idxPinItag:
        column: [ itag ]
</pre></td><td><pre>


CREATE DATABASE crdb;


CREATE TABLE ImageCache (
  remote AS TEXT PRIMARY KEY,
  local AS TEXT NOT NULL
);



CREATE TABLE Asset (
  id AS TEXT PRIMARY KEY,
  asset AS TEXT,
  timestamp AS INTEGER
);



CREATE TABLE Pin (
  id,
  state AS INTEGER,
  sessionId AS TEXT,
  FOREIGN KEY id
    REFERENCES Asset(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);




CREATE TABLE InfoCard (
  id AS TEXT,
  lang AS TEXT,
  itag AS INTEGER,
  country AS TEXT,
  fileName AS TEXT UNIQUE
  PRIMARY KEY (id, lang)
);




CREATE INDEX idxItag
  ON InfoCard.itag;

</pre></td>
  </tr>
</table>


### 1.5 Dynamic Schema Creation

Dynamic schema creation starts with a helper function: `lf.createSchema()` that
returns a schema builder object which provides several helper methods to define
schema. The code snippet below is an example of how to create the same schema
as described in previous section:

```js
var ds = lf.createSchema('crdb', 1);

ds.createTable('ImageCache').
    addColumn('remote', lf.Type.STRING).
    addColumn('local', lf.Type.STRING).
    addPrimaryKey(['remote']);

ds.createTable('Asset').
    addColumn('id', lf.Type.STRING).
    addColumn('asset', lf.Type.STRING).
    addColumn('timestamp', lf.Type.INTEGER).
    addPrimaryKey(['id']);
var asset = ds.getTable('Asset');

ds.createTable('Pin').
    addColumn('id', lf.Type.STRING).
    addColumn('state', lf.Type.INTEGER).
    addColumn('sessionId', lf.Type.STRING).
    addForeignKey('fkId', 'id', assetTable.getColumn('id'), true);

ds.createTable('InfoCard').
    addColumn('id', lf.Type.STRING).
    addColumn('lang', lf.Type.STRING).
    addColumn('itag', lf.Type.INTEGER).
    addColumn('country', lf.Type.STRING).
    addColumn('fileName', lf.Type.STRING).
    addPrimaryKey(['id', 'lang']);

lf.createDatabaseInstance(
    ds.getSchema(),
    /* opt_onUpgrade */ undefined,
    /* opt_volatile */ true).then(function(db) {
      // Syntactic sugar asset.id.eq is no longer available.
      // Caller must call asset.getColumn() to get the column.
      var query =
          db.select().from(asset).where(asset.getColumn('id').eq('12345'));
      return query.exec();
    }).then(function(results) {
    });
```

The functions and usages are detailed below:

#### 1.5.1 Global Functions

| Function                    | Returns                               |
|:----------------------------|:--------------------------------------|
|`lf.createSchema()`          |`lf.SchemaBuilder` for building schema |

Parameters for `lf.createSchema()`:

| Parameter | Type   |Meaning         |
|:----------|:-------|:---------------|
|`name`     |`string`|Database name   |
|`version`  |`number`|Database version|

-----

| Function                    | Returns                               |
|:----------------------------|:--------------------------------------|
|`lf.createDatabaseInstance()`|Lovefield internal representation for a database.|

Parameters for `lf.createDatabaseInstance()`:

| Parameter | Type             |Meaning         |
|:----------|:-----------------|:---------------|
|`ds`       |`lf.SchemaBuilder`|The schema builder for the database. |
|`onUpgrade`|`!function(!lf.raw.BackStore):!IThenable=`|Optional DB upgrade function.|
|`volatile` |`boolean=`        |Optional volatile parameter.|

#### 1.5.2 Class `lf.SchemaBuilder`

|Member Function |Returns                  |Meaning                       |
|:---------------|:------------------------|:-----------------------------|
|`createTable`   |`lf.schema.TableBuilder` |Creates a table in schema.    |
|`getSchema`     |`lf.schema.Database`     |Returns DB schema.            |
|`getTable`      |`lf.schema.TableBuilder` |Returns table schema.         |

Parameters for `lf.SchemaBuilder.prototype.createTable`:

| Parameter | Type   |Meaning         |
|:----------|:-------|:---------------|
|`name`     |`string`|Table name      |

Parameters for `lf.SchemaBuilder.prototype.getSchema`:

| Parameter | Type   |Meaning         |
|:----------|:-------|:---------------|
|`name`     |`string`|Database name   |

Parameters for `lf.SchemaBuilder.prototype.getTable`:

| Parameter | Type   |Meaning         |
|:----------|:-------|:---------------|
|`name`     |`string`|Table name      |


#### 1.5.3 Class `lf.schema.TableBuilder`

|Member Function |Returns                 |Meaning                             |
|:---------------|:-----------------------|:-----------------------------------|
|`addColumn`     |`lf.schema.TableBuilder`|Adds one column to schema.          |
|`addPrimaryKey` |`lf.schema.TableBuilder`|Adds primary key(s) to schema.      |
|`addForeignKey` |`lf.schema.TableBuilder`|Adds foreign key to schema.         |
|`addUnique`     |`lf.schema.TableBuilder`|Adds unique constraint on column(s).|
|`addNullable`   |`lf.schema.TableBuilder`|Adds nullable constraint.           |
|`addIndex`      |`lf.schema.TableBuilder`|Adds index to table.                |
|`getSchema`     |`lf.schema.Table`       |Returns table schema.               |
|`getColumn`     |`lf.schema.Column`      |Returns column schema.              |

Parameters for `lf.schema.TableBuilder.prototype.addColumn`:

| Parameter | Type    |Meaning         |
|:----------|:--------|:---------------|
|`name`     |`string` |Column name     |
|`type`     |`lf.Type`|Column type     |

There are two overloads for `lf.schema.TableBuilder.prototype.addPrimaryKey`.
The first one specifies primary key with default ascending orders, or auto-
increment primary key:

| Parameter   | Type           |Meaning                          |
|:------------|:---------------|:--------------------------------|
|`columns`    |`!Array<string>`|Existing column(s) in schema.    |
|`opt_autoInc`|`boolean=`      |When true, must have only one numeric column as primary key.|

The second one specifies primary key with non-default orders.

| Parameter   | Type            |Meaning                          |
|:------------|:----------------|:--------------------------------|
|`columns`    |`!Array<{column:string, order:lf.Order}>`|Existing columns and their corresponding order.|

Parameters for `lf.schema.TableBuilder.prototype.addForeignKey`:

| Parameter   | Type              |Meaning                                    |
|:------------|:------------------|:------------------------------------------|
|`name`       |`string`           |Key name.                                  |
|`localCol`   |`string`           |Local column name.                         |
|`remoteCol`  |`!lf.schema.Column`|Existing remote column.                    |
|`opt_cascade`|`boolean=`         |Cascade, default to false.                 |

Parameters for `lf.schema.TableBuilder.prototype.addUnique`:

| Parameter   | Type           |Meaning                          |
|:------------|:---------------|:--------------------------------|
|`name`       |`string`        |Key name.                        |
|`columns`    |`!Array<string>`|Existing column(s) in schema.    |

Parameters for `lf.schema.TableBuilder.prototype.addNullable`:

| Parameter   | Type           |Meaning                          |
|:------------|:---------------|:--------------------------------|
|`columns`    |`!Array<string>`|Existing column(s) in schema.    |

Parameters for `lf.schema.TableBuilder.prototype.addIndex`:

| Parameter   | Type            |Meaning                          |
|:------------|:----------------|:--------------------------------|
|`name`       |`string`         |Key name.                        |
|`columns`    |`!Array<{column:string, order:lf.Order}>`|Existing columns and their corresponding order.|
|`opt_unique` |`boolean=`       |Optional, default to false.      |

Parameters for `lf.schema.TableBuilder.prototype.getSchema`:

| Parameter | Type   |Meaning         |
|:----------|:-------|:---------------|
|`name`     |`string`|Table name      |

Parameters for `lf.schema.TableBuilder.prototype.getColumn`:

| Parameter | Type   |Meaning         |
|:----------|:-------|:---------------|
|`name`     |`string`|Column name     |

