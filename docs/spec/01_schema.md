# Lovefield Specification

## 1. Schema Definition

Schema is the structure of the relational database. A schema contains a name and
a version number. The origin of the program, the name, and the version number
together uniquely identify a database instance on the persistence store. Please
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
var schemaBuilder = lf.schema.create('crdb', 1);

schemaBuilder.createTable('Asset').
    addColumn('id', lf.Type.STRING).
    addColumn('asset', lf.Type.STRING).
    addColumn('timestamp', lf.Type.INTEGER).
    addPrimaryKey(['id']);

// Schema is defined, now connect to the database instance.
schemaBuilder.connect().then(
    function(db) {
      // Schema is not mutable once the connection to DB has established.
    });
```

### 1.1 Naming Rules

All naming in Lovefield must pass the following JavaScript regex check:

`/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)`

Names that violates this check will result in exceptions.


### 1.2 Database Schema Builder

To create a schema, one needs to create a schema builder, which is provided by
the static function [`lf.schema.create()`](
https://github.com/google/lovefield/blob/31f14db4995bb89fa053c99261a4b7501f87eb8d/lib/schema/builder.js#L232-L242)
Lovefield provides detailed documentation in the source code, and therefore the
specification will only provide links to corresponding source code. This also
enforces single point of truth and prevents the documents from being outdated.

Lovefield APIs are grouped inside the `lf` namespace to avoid polluting the
global namespace. All schema creations start from instantiating a schema
builder.

The `lf.schema.create()` will create an instance of [`lf.schema.Builder`](
https://github.com/google/lovefield/blob/31f14db4995bb89fa053c99261a4b7501f87eb8d/lib/schema/builder.js#L32-L48),
which offers two functions: [`createTable()`](
https://github.com/google/lovefield/blob/31f14db4995bb89fa053c99261a4b7501f87eb8d/lib/schema/builder.js#L134-L147) and
[`connect()`](
https://github.com/google/lovefield/blob/31f14db4995bb89fa053c99261a4b7501f87eb8d/lib/schema/builder.js#L91-L109).
`createTable()` instantiates a table builder inside the schema builder, which
will effectively construct a table when the builder is finalized.
`connect()` finalizes schema building and connects to the database instance on
the data store.

The `lf.schema.Builder` class object is stateful: it has a building state and a
finalized state. The schema can only be modified in building state. Once
finalized, it will not accept any calls.

### 1.3 Table Schema Builder

The `createTable()` call of `lf.schema.Builder` returns an
[`lf.schema.TableBuilder`](
https://github.com/google/lovefield/blob/8e47538d5f32986596a9e97ec97350cc6ed9ec1a/lib/schema/table_builder.js#L38-L77)
object, which is used to build table schema. A table in Lovefield is similar to
a SQL table. The user can specify indices and constraints in the table-level.
All member functions of `lf.schema.TableBuilder` return the table builder object
itself to support chaining pattern.

#### 1.3.1 Columns

A table contains at least one column, which is added to the table by
[`addColumn()`](
https://github.com/google/lovefield/blob/8e47538d5f32986596a9e97ec97350cc6ed9ec1a/lib/schema/table_builder.js#L178-L191).
Columns are identified by column names, and column names must be unique within
the table. Each column must have an associated data type.

The supported data types are listed in [`lf.Type`](
https://github.com/google/lovefield/blob/fafe224c75083698f1702c35c7908c25a8ea5951/lib/enums.js#L60-L93):

| Type                 | Default Value | Nullable by default | Description                          |
|:---------------------|:--------------|:--------------------|:-------------------------------------|
|`lf.Type.ARRAY_BUFFER`|`null`         |Yes                  |JavaScript `ArrayBuffer` object       |
|`lf.Type.BOOLEAN`     |`false`        |No                   |JavaScript `boolean` object           |
|`lf.Type.DATE_TIME`   |`Date(0)`      |No                   |JavaScript Date, will be converted to timestamp integer internally |
|`lf.Type.INTEGER`     |`0`            |No                   |32-bit integer                        |
|`lf.Type.NUMBER`      |`0`            |No                   |JavaScript `number` type              |
|`lf.Type.STRING`      |`''`           |No                   |JavaScript `string` type              |
|`lf.Type.OBJECT`      |`null`         |Yes                  |JavaScript `Object`, stored as-is     |

Any column regardless of type can be marked as nullable by calling
[`TableBuilder#addNullable()`]
(https://github.com/google/lovefield/blob/8e47538d5f32986596a9e97ec97350cc6ed9ec1a/lib/schema/table_builder.js#L285-L297).
The default value for nullable columns is always `null`. The default values
shown in the table above refer to the case where a column has not been marked as
nullable.

* Columns of type `lf.Type.ARRAY_BUFFER` and `lf.Type.OBJECT` are nullable by
default (even if `addNullable()` is not explicitly called).
* Columns of any other type are considered not nullable unless an explicit call
to `addNullable()` is made. Note this is very different from typical SQL engine
behavior.

Lovefield internally accepts only string or number as index key. Columns of type
`lf.Type.ARRAY_BUFFER` and `lf.Type.OBJECT` are not indexable (i.e. they cannot
be part of an index or any of the constraints). `lf.Type.ARRAY_BUFFER` columns
are not searchable (i.e. them cannot be part of `WHERE` clause), where as
`lf.Type.OBJECT` columns can only be used in predicates with `isNull` and
`isNotNull` (otherwise an `lf.Exception` will be thrown). Implicit conversions
will be performed internally if the following types are used as index / primary
key or being placed as a unique constraint:

* `lf.Type.BOOLEAN`: convert to `lf.Type.STRING`
* `lf.Type.DATE_TIME`: convert to `lf.Type.NUMBER`
* `lf.Type.INTEGER`: convert to `lf.Type.NUMBER`

#### 1.3.2 Constraints

Lovefield supports the following constraints:

* Primary key
* Foreign key
* Unique
* Nullable / Not-nullable

Each table can have only one primary key. Primary key is added via the function
[`addPrimaryKey()`](https://github.com/google/lovefield/blob/8e47538d5f32986596a9e97ec97350cc6ed9ec1a/lib/schema/table_builder.js#L194-L225).
Same as in the SQL world, primary key implies unique and not null. Lovefield
supports auto-increment primary key, which must be an integer column with
default ascending order, and its value will be assigned by Lovefield, starting
from 1.

Foreign keys are added via [`addForeignKey()`](
https://github.com/google/lovefield/blob/8e47538d5f32986596a9e97ec97350cc6ed9ec1a/lib/schema/table_builder.js#L228-L264).

Primary key and foreign key constraint violations will cause transaction
rejection, just like what happens in SQL. When `opt_cascade` is true for
a foreign key, Lovefield query engine will perform cascade delete and update
if necessary.

Unique constraints are added via [`addUnique()`](
https://github.com/google/lovefield/blob/8e47538d5f32986596a9e97ec97350cc6ed9ec1a/lib/schema/table_builder.js#L267-L282).
Unique constraints imply implicit indices. A cross-column unique constraint
means the value combinations of these columns must be unique.

As mentioned in previous section, all table columns are defaulted to `NOT NULL`.
The user needs to specifically call out nullable columns by calling
[`addNullable()`](https://github.com/google/lovefield/blob/8e47538d5f32986596a9e97ec97350cc6ed9ec1a/lib/schema/table_builder.js#L285-L297).


#### 1.3.3 Indices

Lovefield implements its own indices without using indices provided by the
backing data store. The default index structure is B+ Tree. Only not-null and
indexable columns can be indexed. See [Columns](#131-columns) for details
regarding which column data type are indexable.

Indices are added via [`addIndex()`](
https://github.com/google/lovefield/blob/8e47538d5f32986596a9e97ec97350cc6ed9ec1a/lib/schema/table_builder.js#L327-L357).
Indices can be single-column or cross-column. Unlike most SQL engines, Lovefield
has a limit that all values in indexed column must not be null. All unique
constraint also builds implicit index, and therefore creating index with
identical scope will yield in exceptions.

Lovefield does not support custom index. Custom index means creating an index
based on transformations. For example, reverse text of an e-mail address field.
It's not included because it is not possible to persist JavaScript functions
then eval due to Chrome Apps v2 constraints. Users are supposed to do the
transformations in their own JavaScript and store the transformed data.

By default, Lovefield constructs table indices in memory during loading, without
persisting the indices in data store. The indices of a given table will be
persisted only if [`persistentIndex()`](
https://github.com/google/lovefield/blob/8e47538d5f32986596a9e97ec97350cc6ed9ec1a/lib/schema/table_builder.js#L383-L386).


### 1.4 Static Schema Construction

Lovefield is originally designed to use static schema creation. The idea is to
represent database schema in a YAML file, use Lovefield SPAC (Schema Parser
And Code-generator) to generate JavaScript source code from the YAML file, then
use Lovefield core library along with generated code. This approach makes more
sense when all involving JavaScript files are compiled and bundled via Closure
compiler. As a result, this approach is considered advanced topic and is
detailed in [its own section](07_spac.md).
