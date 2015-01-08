# Lovefield Specification

## 1. Schema Definition

A schema is in the form of a YAML file that will be read by a code generator and
generates corresponding classes and code, similar to what has done in protobuf.
The syntax of a schema file is described below:

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
* `string` (default to empty string, but nullable)

Lovefield does not support composite data type. Integer is called out from
number because of its wide usage. Boolean, integer, and number fields are not
nullable. Lovefield does not allow undefined in any of the field value.

Lovefield accepts only string or number as index key. Implicit conversions will
be performed internally if these types are used as index / primary key or being
placed a unique constraint:
* `arraybuffer`: convert to SHA-512 hash string, *PERFORMANCE IMPACT!*
* `boolean`: convert to string
* `datetime`: convert to number
* `integer`: convert to number

Lovefield assumes all columns are `NOT NULL` by default, which is a different
behavior from SQL and the user shall be aware of it.

### 1.3 Constraint Definition

Constraints are optional. There are four different constraints supported by
Lovefield: primary key, foreign key, nullable, and unique. Constraints are
defined as a YAML object:

```yaml
constraint:
  primaryKey: [ <primaryKey_columns> ]  # optional
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

An index definition is a YAML object using following syntax:

```yaml
<index_name>:
  column: [ <column_names> ]  # required
  order: < desc | asc >  # optional, default to asc
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

