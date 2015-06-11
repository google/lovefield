# Lovefield Specification

## 7. SPAC

Lovefield provides two different ways of defining database schema: static and
dynamic. The static way of schema definition is to use a YAML file to describe
the schema, and SPAC (Schema Parser And Code-generator) will read the file and
generate corresponding JavaScript code. The dynamic way is to create database
schema programmatically without using a YAML schema. The dynamic schema creation
API is documented in [Schema](01_schema.md).

The main reason for having a static schema is to provide better compiler
coverage for Closure compiler users. Lovefield library, from day 1, is fully
compiled using Closure compiler with advanced optimization to ensure its type
safety.

Also, using SPAC is the only way to fully optimize the code size via Closure
compiler, with a caveat that Lovefield will be compiled within user's code.
The benefit is that Lovefield will take ~70KB in size instead of ~200KB
minimized, with more rigorous type checking.

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

### 7.1 Table Definition

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
  pragma:  # optional
    persistentIndex: <value>
```

A table must have a unique name in the database. All names in schema definition
must consist only alphanumeric characters or underscore, and the first character
must not be numeric (i.e. `/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)` needs to be
`true`). The names are case-sensitive (contrary to SQL's case-insensitiveness).
For best readability of generated code, it is suggested to use Camel style for
names.

Please note that although names are case-sensitive, the SPAC may still emit
errors if it is not able to generate unique names for them. For example, if you
have two tables, one named “hd” and the other named “Hd”, SPAC will not be able
to auto-generate code for that and will reject the schema.

### 7.2 Column Definition

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

Array buffers may be converted to hex strings when stored into the data store
since some browser implementations disallow direct blob storage. Users need to
be aware of the performance impact of blob conversion.

Lovefield assumes all columns are `NOT NULL` by default, which is a different
behavior from SQL and the user shall be aware of it.

### 7.3 Constraint Definition

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

#### 7.3.1 Primary Key Definition
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
supports only single-column integer auto-increment primary key. An
`lf.Exception.SYNTAX` will be thrown if a non-integer or multi-column primary
key is declared.

The second variation allows specification of order:

```yaml
primaryKey:
  - column: <column_name>
    order: <desc | asc>
  - column: <column_name>
    order: <desc | asc>
  ...
```

#### 7.3.2 Uniqueness Definition

`unique` can be defined on a single column or cross column, and each will imply
an implicit index. The uniqueness definition is a YAML object

```yaml
<uniqueness_name>:
  column: [ <unique_columns> ]  # required
```

A cross-column `unique` constraint means the value combinations of these columns
must be unique.


#### 7.3.3 Nullable Definition

`nullable` is an array of all nullable columns.


#### 7.3.4 Foreign Key Definition

Foreign key is defined as a YAML object

```yaml
<foreignKey_name>:
  local: <local_column>  # required
  ref: <remote_table>.<remote_column>  # required
  action: < restrict | cascade >  # optional
  timing: < immediate | deferrable >  # optional
```

Primary key and foreign key constraint violations will cause transaction
rejection, just like what happens in SQL. Please refer to
[Referential Integrity](08_referential_integrity.md) for detailed information
with respect to foreign key definition.


### 7.4 Index Definition

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
need to create index on them.

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
          local: id
          ref: Asset.id
          action: cascade

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

### 7.5 Pragma

Currently, only `persistentIndex` is offered as a pragma option, and it requires
a boolean value. When set to true, all indices of this table will be stored
on persistent store.

### 7.6 Code Generation

The schema YAML file will need to be parsed and validated by Schema Parser And
Code-Generator (SPAC). SPAC will generate JavaScript code providing:

* A static function used to create database instance.
* A database schema class that can be used to create query conditions.
* A database instance class that can be used to create queries.

The following example is the very basic SCUD operation using SPAC generated
code, assume the namespace passed into SPAC is `my.namespace.db`:

```js
var db;
var infoCard;

function createRows() {
  // Method 1: use lovefield-generated functions
  var row = infoCard.createRow();
  row.setId('something');
  row.setLang('en');
  row.setItag(140);
  row.setCountry('US');
  row.setFileName('140-en-US');

  // Method 2: directly pass in JSON object
  var row2 = infoCard.createRow({
    'id': 'something',
    'lang': 'fr',
    'itag': 145,
    'country': 'FR',
    'fileName': '145-fr-FR'
  });
  return [row, row2];
}

// <namespace>.<instanceName>.connect() to connect to DB instance
my.namespace.db.connect().then(function(dbInstance) {
  db = dbInstance;
  infoCard = db.getSchema().getInfoCard();

  // INSERT INTO InfoCard VALUES (...);
  var rows = createRows();
  return db.insert().into(infoCard).values(rows).exec();
}).then(function() {
  // SELECT id, lang, fileName FROM InfoCard
  //   WHERE id = 'something' AND lang = 'en';
  db.select([infoCard.id, infoCard.lang, infoCard.fileName]).
    from(infoCard).
    where(lf.op.and(
        infoCard.id.eq('something'), infoCard.lang.eq('en'))).
    exec().then(function(rows) {
      console.log(rows[0].id, rows[0].lang, rows[0].fileName);
    });

  // UPDATE InfoCard SET lang = 'fr' WHERE id LIKE 'whatever%'
  return db.update(infoCard).
      set(infoCard.lang, 'fr').
      where(infoCard.id.like(/^whatever/)).
      exec();
}).then(function() {
  // DELETE FROM InfoCard WHERE lang = 'es';
  var q = db.delete().from(infoCard).where(infoCard.lang.eq('es'));
  return q.exec()
});
```

### 7.6.1 Namespace and DB name

The user already specified a DB name in schema, and a "namespace" is also
required in SPAC. These two names are serving different purposes.

A DB name uniquely identifies the DB persisted. It is only useful for opening
database.

A namespace is used to encapsulate Lovefield generated code for a given DB
schema. Each namespace can have only one DB.

If the users wanted to change namespace without changing DB schema, they can
use the same schema YAML file, but give SPAC a different namespace. The
resulting code will be opening the same database file.

### 7.6.2 Automatically Generated Classes

The SPAC will automatically generate following:

| Classes/Functions           | Note                    |
|:--------------------------- |:----------------------- |
|`<namespace>.connect()`      | Database initialization |
|`<namespace>.Database`       | Database class          |
|`<namespace>.row.<table>`    | Row type of each table  |
|`<namespace>.schema.Database`| Database Schema         |
|`<namespace>.schema.<table>` | Schema of each table    |

Each class is well annotated with Closure type definitions.
