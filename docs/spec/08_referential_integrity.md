# Lovefield Specification

## 8. Referential integrity

### 8.1 Constraint semantics

Foreign key constraints can only be defined during schema creation.
The following statements must be true for all foreign key constraints:

 1. A foreign key constraint is placed between *exactly* two existing columns,
    the parent column (a.k.a. referenced) and the child column (a.k.a.
    referencing).
 2. The parent and child columns may belong to the same or to different tables.
 4. The parent and child columns must have the same indexable `lf.Type`.
 5. The parent column must be unique: either a primary key, or marked as unique.
 6. A child column of a constraint can not be declared as the parent column of
    another foreign key constraint (i.e. no foreign key constraint chains).
 7. Cyclic references are disallowed.

If any of the statements above is violated an `lf.Exception.SYNTAX_ERROR` will
be thrown.

### 8.2 Constraint action modes
A foreign key constraint has two action modes, `RESTRICT` and `CASCADE`,
represented by the `lf.ConstraintAction` enum. If no action mode is specified
in the schema definition, the default value is `RESTRICT`.

#### 8.2.1 RESTRICT

In this mode _any constraint violation results in cancelling the operation that
violated the constraint_. **"Parent"** table is the referenced table, and
**"child"** table is the referencing table.

`INSERT`

  * Can't insert a row into the child table if there is no related row
    in the parent table.

`UPDATE`/`INSERT_OR_REPLACE`

  * Can't update the parent table's referenced column if the row being modified
    has related rows in the child table.
  * Can't update the child table's referencing column if it doesn't have a
    related row in the parent table.

`DELETE`

  * Can't delete a row from the parent table if it has related rows in the
    child table.

#### 8.2.2 CASCADE

In this mode a constraint violation results in modifying related tables as
necessary to maintain data integrity.

`INSERT`/`INSERT_OR_REPLACE`

  * Same as in the `RESTRICT` mode. Note that for `insertOrReplace()` queries,
    there is no cascading. If cascading is desrired an `update()` query should
    be used instead.

`DELETE`

  * When a row in the parent is deleted, all related rows in the
    child table, should be automatically deleted.

`UPDATE`

  * When a column in the parent table is updated, all referencing
    columns should be automatically updated with the same value.

Lovefield does not provide granularity for specifying a constraint mode
separately for `DELETE`/`UPDATE`, instead when in `CASCADE` mode, both `UPDATE`
and `DELETE` operations will be cascading.

### 8.3 Constraint enforcement timing

When in `RESTRICT` constraint mode, constraints can be marked as `DEFERRABLE` or
`IMMEDIATE`, which affects the timing at which they are enforced. When in
`CASCADE` mode, the concept of `DEFERABLE` enforcement does not apply, and
therefore `IMMEDIATE` will be used.

Timing enforcement should be exposed via the schema creation API as an optional
enum parameter. The enum is named `lf.ConstraintTiming` The default value, if
such parameter is not provided, is `IMMEDIATE`.

#### 8.3.1 DEFERRABLE

A deferrable constraint is enforced _right before a transaction is committed_.
The constraint can be violated by individual statements during the lifetime of
the enclosing transaction, without any errors being thrown.

#### 8.3.2 IMMEDIATE
An immediate constraint is enforced _during execution of each individual
statement_.
