# Lovefield Design Document

## 1. Schema Design

### 1.1 Row

For any RDBMS, the basic unit of storage and query is a row. In Lovefield, a
row has a unique row id that is assigned by the system at the time of row
creation, and the row id will be associated with that row until it is deleted
from the database. Row id, as a JavaScript number, has a data range between 0
and 2^53 - 1, which shall be way more than enough for a small database. Unique
row id is key for the query engine to function correctly.

A row consists of columns, and the columns are defined in the schema.

### 1.2 Dynamic Schema

A schema is the way users define the layout of their database. Lovefield
offers two different ways of defining a schema: dynamic and static. The default
is dynamic schema creation, which is carried out using provided API. The
static schema creation is considered advanced usage and is done via SPAC (
Schema Parser and Code generator).

The dynamic schema creation uses the builder pattern. There are two levels of
builder:

* Database level (`lf.schema.Builder`): models the database level schema,
  consists of table level builders.
* Table level (`lf.schema.TableBuilder`): models table level schema, which
  has the majority of schema building logic.

#### 1.2.1 `lf.schema.Builder`

This builder creates a concrete object `lf.schema.DatabaseSchema_` which
implements `lf.schema.Database`. The differences between this object and the
object from SPAC-generated class are minimum.

#### 1.2.2 `lf.schema.TableBuilder`

The `TableBuilder` is more complicated. When the builder is finalized (i.e.
`getSchema()` is invoked from containing database builder), it attempts to
generate row class object (`generateRowClass_`) and table class object
(`generateTableClass_`). The row class object derives from `lf.Row`, and the
table class object derives from `lf.schema.Table`. Both classes provide
important default implementations of critical functions that need to be
customized according to schema definition (e.g. serialization and get index
keys).

Once the table class object is generated, the `TableBuilder` instantiates
an object of that class and returns it to the database builder.

There are significant differences between SPAC-generated class and the table
class from `TableBuilder`. The main differences are:

* Implementation from `TableBuilder` is more complicated because it needs to
consider all different type combinations and conversions.
* SPAC-generated class has better type annotations, thus better compiler
coverage.

In order to improve performance, the implementation uses a hash table to
store functions for different data types, so that function selection according
to data type can be done in constant time.

### 1.3 Static Schema

Static schema definition is done through a YAML file, and the syntax is
defined in the specification. Originally Lovefield used JSON as its schema
definition format. JSON is not as readable as the YAML format since it lacks
built-in support for comments, and it also has a lot of unnecessary marks. By
converting JSON to YAML, the test schema (`spac/testdata/codegen.yaml`) has
55% less lines and is way more readable.

SPAC stands for Schema Parser and Code Generator. As the name suggests, there
are two sub-components in SPAC: the Parser, and the Code Generator.

#### 1.3.1 Reasons to Go Static

SPAC will generate different Row classes that provide essential access to the
row in a friendly and type-safe way. Type safety is provided by Closure
Compiler if and only if used correctly. Using SPAC with Closure compiler
also guarantees smallest possible binary distribution when advanced
optimization is in use.

Currently Lovefield's workflow on GitHub does not support this advanced usage.
The workflow is planned to be added in a later time frame.

#### 1.3.2 Schema Parser (`spac/parser.js`)
The YAML parsing is handled via nodejs js-yaml module. The module will simply
pass back a JavaScript object. For example:

```yaml
%YAML 1.2
---
name: crdb
version: 1
table:
  ImageCache:
    column:
      remote: string
      local: string
      remote: integer  # Duplicate that would be ignored
    constraint:
      primaryKey: [ remote ]
```

There is a duplicate field in column definition. For SPAC's current usage of
js-yaml, the `remote` attribute passed to parser will be `integer` without
errors (i.e. the last one wins). What the parser does is to perform some basic
sanity checks for the returned schema object:

* Checks whether required fields within a schema item definition exists
* Checks whether the type of a property is expected
* Checks name collisions (i.e. field name collides with reserved words)

The parser is best described as *best-effort*.

#### 1.3.3 Code Generator (`spac/codegen.js`)

Code generator reads a template file (say, `template/database.jstemplate`) and
converts it into &lt;escaped namespace&gt;_&lt;template name&gt;.js
(say, lovefield_db_database.js). The template expansion is simple macro
expansion. All macros start with the `#` sign, which is an invalid character
for JavaScript so that errors can be spotted easily if the macros inside
template were not fully expanded.

##### 1.3.3.1 Simple Macros

The following table lists the simple macros supported by current code generator:

| Macro         | Expands to                               |
|---------------|------------------------------------------|
| `bundledmode` | The `pragma bundledMode` value in schema |
| `dbname`      | Database name specified in schema        |
| `dbtablelist` | List of table names in schema            |
| `dbversion`   | Database version specified in schema     |
| `namespace`   | Namespace given to SPAC                  |


##### 1.3.3.2 Scope Directives

Scope directives start with `/// #` to instruct the code generator that this is
the beginning/end of a scope block and the code generator shall honor it.

| Macro             | Expands to                                               |
|-------------------|----------------------------------------------------------|
| `repeattable`     | Begin of repeat table block, affects all `#table` macros.|
| `repeattableend`  | End of repeat table block.                               |
| `repeatcolumn`    | Begin of repeat column block, must be nested inside repeattable. |
| `repeatcolumnend` | End of repeat column block.                              |
| `sort`            | Begin of a sort block, contents inside sort block will be sorted in lexical order.|
| `sortend`         | End of a sort block.                                     |


##### 1.3.3.3 Repeating Macros

Repeating macros must live in their repeating scope, otherwise they will not
expand correctly.

| Macro              | Scope          | Expands to                        |
|--------------------|----------------|-----------------------------------|
| `table`            | `repeattable`  | The tables in schema.             |
| `tablename`        | `repeattable`  | The table names.                  |
| `column`           | `repeatcolumn` | The columns in table.             |
| `columnjstype`     | `repeatcolumn` | Actual JavaScript type of column. |
| `columntype`       | `repeatcolumn` | The type of column.               |
| `columnuniqueness` | `repeatcolumn` | The uniqueness of column.         |


##### 1.3.3.4 Suffixing Macros

Suffixing macros formats the expanded content of macro that is suffixed.

| Macro    | Expands to                    |
|----------|-------------------------------|
| `camel`  | Camel style, e.g. singleCamel |
| `pascal` | Pascal style, e.g. DualCamel  |


##### 1.3.3.5 Complex Macros

These macros directly generate JavaScript code and therefore it is necessary to
change contents inside `spac/codegen.js` if the contents generated by these
macros need to change. All complex macros are repeating macros, they must live
within `repeattable` scope.

| Macro              | Expands to                                 |
|--------------------|--------------------------------------------|
|`deserializerow`    |`<Table>.prototype.deserializeRow`          |
|`getdefaultpayload` |`row.<Table>.prototype.defaultPayload`      |
|`keyofindex`        |`row.<Table>.prototype.keyOfIndex`          |
|`rowpropgetset`     |Getters and setters of columns for each row.|
|`tablecontraint`    |`<Table>.prototype.getConstraint`           |
|`tablecolumntypes`  |`<Table>.prototype.<TableType>`             |
|`tablecolumndbtypes`|`<Table>.prototype.<TableDbType>`           |
|`tableindices`      |`<Table>.prototype.getIndices`              |
|`todbpayload`       |`row.<Table>.prototype.toDbPayload`         |
