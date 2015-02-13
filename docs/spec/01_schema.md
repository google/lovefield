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
var ds = lf.schema.create('crdb', 1);

ds.createTable('Asset').
    addColumn('id', lf.Type.STRING).
    addColumn('asset', lf.Type.STRING).
    addColumn('timestamp', lf.Type.INTEGER).
    addPrimaryKey(['id']);

// Schema is defined, now get an instance based on this schema.
ds.getInstance(/* opt_onUpgrade */ undefined, /* opt_volatile */ true).then(
    function(db) {
      // Schema is not changable once the connection to DB has established.
    });
```

### 1.1 Naming Rules

All naming in Lovefield must pass the following JavaScript regex check:

`/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)`

Names that violates this check will result in exceptions.


### 1.2 Database Schema Builder

To create a schema, one needs to create a schema builder, which is provided by
the static function [`lf.schema.create()`](
https://github.com/google/lovefield/blob/master/lib/schema/builder.js#L186).
Lovefield provides detailed documentation in the source code, and therefore the
specification will only provide links to corresponding source code. This also
enforces single point of truth and prevent the documents from outdating.

Lovefield APIs are grouped inside the `lf` namespace to avoid polluting the
global namespace. All schema creations start from instantiating a schema
builder.

The `lf.schema.create()` will create an instance of [`lf.schema.Builder`](
https://github.com/google/lovefield/blob/master/lib/schema/builder.js#L32),
which offers two functions: [`createTable()`](
https://github.com/google/lovefield/blob/master/lib/schema/builder.js#L112) and
[`getInstance()`](
https://github.com/google/lovefield/blob/master/lib/schema/builder.js#L91).
`createTable()` instantiates a table builder inside the schema builder, which
will effectively construct a table when the builder is finalized.
`getInstance()` finalizes schema building and create a database instance that
can be used to run queries.

The `lf.schema.Builder` class object is stateful: it has a building state and a
finalized state. The schema can only be modified in building state. Once
finalized, it will not accept any calls.

### 1.3 Table Schema Builder

The `createTable()` call of `lf.schema.Builder` returns an
[`lf.schema.TableBuilder`](
https://github.com/google/lovefield/blob/master/lib/schema/table_builder.js#L33)
object, which is used to build table schema. A table in Lovefield is similar to
a SQL table. The user can specify indices and constraints in the table-level.
All member functions of `lf.schema.TableBuilder` return the table builder object
itself to support chaining pattern.

#### 1.3.1 Columns

A table contains at least one column, which is added to the table by
[`addColumn()`](https://github.com/google/lovefield/blob/master/lib/schema/table_builder.js#L121).
Columns are identified by column names, and column names must be unique within
the table. Each column must have an associated data type.

The supported data types are listed in [`lf.Type`](
https://github.com/google/lovefield/blob/master/lib/type.js#L21):

| Type                 | Default Value | Nullable | Description               |
|:---------------------|:--------------|:---------|:--------------------------|
|`lf.Type.ARRAY_BUFFER`|`null`    |Yes |JavaScript `ArrayBuffer` object       |
|`lf.Type.BOOLEAN`     |`false`   |No  |                                      |
|`lf.Type.DATE_TIME`   |`Date(0)` |Yes |JavaScript Date, will be converted to timestamp integer internally |
|`lf.Type.INTEGER`     |`0`       |No  |32-bit integer                        |
|`lf.Type.NUMBER`      |`0`       |No  |JavaScript `number` type              |
|`lf.Type.STRING`      |`''`      |Yes |JavaScript `string` type              |
|`lf.Type.OBJECT`      |`null`    |Yes |JavaScript `Object`, store as-is      |

Although `lf.Type.STRING` and `lf.Type.DATE_TIME` can be null, the columns are
defaulted to `NOT NULL`. This is very different from typical SQL engine
behavior. The user needs to specifically call out nullable columns by calling
[`addNullable()`](https://github.com/google/lovefield/blob/master/lib/schema/table_builder.js#L201).

Lovefield internally accepts only string or number as index key. Array buffers
and objects are not indexable (i.e. they cannot be put as index or any of the
constraints) nor searchable (i.e. them cannot be part of `WHERE` clause).
Implicit conversions will be performed internally if the following types are
used as index / primary key or being placed as a unique constraint:
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
[`addPrimaryKey()`](https://github.com/google/lovefield/blob/master/lib/schema/table_builder.js#L134).
Same as in the SQL world, primary key implies unique and not null. Lovefield
supports auto-increment primary key, which must be an integer column with
default ascending order, and its value will be assigned by Lovefield, starting
from 1.

Foreign keys are added via [`addForeignKey()`](
https://github.com/google/lovefield/blob/master/lib/schema/table_builder.js#L167).
(Note 1)

Primary key and foreign key constraint violations will cause transaction
rejection, just like what happens in SQL. When `opt_cascade` is true for
a foreign key, Lovefield query engine will perform cascade delete and update
if necessary.

Unique constraints are added via [`addUnique()`](
https://github.com/google/lovefield/blob/master/lib/schema/table_builder.js#L186).
Unique constraints imply implicit indices. A cross-column unique constraint
means the value combinations of these columns must be unique. (Note 2)

As mentioned in previous section, all table columns are defaulted to `NOT NULL`.
The user needs to specifically call out nullable columns by calling
[`addNullable()`](https://github.com/google/lovefield/blob/master/lib/schema/table_builder.js#L201).


Note 1: Currently [foreign key are not implemented nor honored/enforced](
https://github.com/google/lovefield/issues/8).

Note 2: Currently [cross-column index is not implemented](
https://github.com/google/lovefield/issues/15), therefore cross-column unique
index does not work, either.

#### 1.3.3 Indices

Lovefield implements its own indices without using indices provided by the
backing data store. The default index structure is B+ Tree. Only not-null and
indexable columns can be indexed. See [Columns](#131-columns) for details
regarding which column data type are indexable.

Indices are added via [`addIndex()`](
https://github.com/google/lovefield/blob/master/lib/schema/table_builder.js#L215).
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
persisted only if [`persistentIndex()`](https://github.com/google/lovefield/blob/master/lib/schema/table_builder.js#L245)
is called.

### 1.4 Static Schema Construction

Lovefield is originally designed to use static schema creation. The idea is to
represent database schema in a YAML file, use Lovefield SPAC (Schema Parser
And Code-generator) to generate JavaScript source code from the YAML file, then
use Lovefield core library along with generated code. This approach makes more
sense when all involving JavaScript files are compiled and bundled via Closure
compiler. As a result, this approach is considered advanced topic and is
detailed in [its own section](10_spac.md).
