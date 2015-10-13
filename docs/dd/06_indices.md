# Lovefield Design Documents

## 6. Indices

### 6.1 Index-able Data Types

Lovefield internally allows only string and numbers to be indexed. Data types
other than string and numbers must be converted.

Quote from our spec reviewer Scott Hess:

> Also having indices only depend on basic internal types is much more robust.
> Just about the only developers I would ever trust to build an app-defined
> index are exactly those who should have no problem just storing and operating
> on transformed data.

Lovefield shares the same insight Scott has and tries to keep the index data
type as simple as possible.

### 6.2 Data Structure for Indices

Lovefield is designed to allow multiple index types from the very beginning.
The philosophy behind this is to utilize the most efficient index structure
for different scenarios.

Lovefield explored different and algorithms for index structure implementation
and carefully chose the algorithm based on performance benchmarks.

Values of Lovefield indices are row ids. When row ids are collected, the query
engine can determine either to fetch the row ids from data store or through the
cache.

In Lovefield, *unique* index means that one key can only correspond to one row
id. This property is also used for enforcing the unique constraint. When the
insertion causes a key violation, it will throw an exception and thus will
enforce either the primary key or unique constraint.

#### 6.2.1 Performance Benchmark Design

As a general-purpose database, Lovefield needs to consider various scenarios
while evaluating performance. Performance is a very broad term and can be very
distorted by usage pattern, browser implementation, or even CPU architectures.

Currently Lovefield has following sets of performance benchmark:

1. Loading/Initialization (for both empty database and populated)
2. Bulk SCUD (Select/Create/Update/Delete) when no index exists
3. Bulk SCUD for simple schemas (i.e. tables have only primary keys)
4. Bulk SCUD for complex schemas (i.e. referential constraints in place)
5. SELECT performance for all designed scenarios (i.e. index efficiency
   regarding single value, range scan, full scan, sorting, joining, and
   grouping)
6. Special interest scenarios: transaction attach, select binding

Lovefield employs test-driven development for all performance-tuning changes:
a set of tests will be created first to validate whether the performance is
improved as expected or not.

#### 6.2.2 AA Tree

Originally Lovefield implements
[Arne Andersson Tree](http://user.it.uu.se/~arnea/abs/simp.html) due to its
code simplicity and good performance.

Performance benchmarks have indicated that AA trees are not as competitive as
B+ trees (especially in range queries). As a result, AA-Tree is retired
permanently.

#### 6.2.3 B+ Tree Index

Lovefield implements B+ Tree as its default index data structure. The B+ Tree
algorithm is based on the text book "Database Systems, the complete book", 2nd
edition written by Hector Garcia Molina, Jeffery D. Ullman, and Jennifer Widom,
published by Pearson. Of course, Lovefield adds quite some tweaks to that
algorithm for various reasons: differences between C and JavaScript, actual
performance tweaking for real-world usage, ... etc.

B+ Tree is a very complicated data structure and some argues the complexity
of it makes physical optimization very hard. However, past experiences regarding
physical plan optimization do not apply to Lovefield since they are under the
assumption of using page-based disk I/O, which is irrelavant for most data
stores of Lovefield.

Lovefield's B+ tree has following tweaks:

1. It disallows NULL value as key to simplify the implementation.
2. It abstracts comparator: the tree only cares about left and right (detailed
   discussion will be provided in later sections)
3. If the tree is declared as non-unique, the children will be an array instead
   of single value, and this is very different from traditional implementation.
   The reasons for doing so are mainly for simplicity of implementation.
   Lovefield may switch back to traditional implementation to allow duplicated
   keys in internal nodes to simplify cost estimation in the future.
4. The B+ tree has a much bigger fan-out than usual (512 vs typical 64). This is
   because the 4K page size is meaningless in JavaScript. A bigger fan-out
   causes fewer split/merge operations in index construction, but may cause
   additional iterations of key look up. The value 512 is picked based on
   performance benchmarks done in 2014 and may change in the future if the
   benchmarks suggested otherwise.

#### 6.2.4 Row ID Index

This index type is a simple set. It is used for row id look up. Since the row
ids are unique, a set shall suffice. The normalized name of the Row ID index is
always in the form `TableName.#`.

#### 6.2.5 Nullable Index

Index on a nullable column is implemented in a different way. `NULL` involves
three-value logic and could not be directly compared. Lovefield currently uses
two different approaches to handle nullable index:

* For single-column nullable indices, use `NullableIndex`, which is a composite
  structure that keeps a set of row ids whose key is null, and a real B+ Tree
  to keep row ids whose keys are not null.

* For multi-column nullable indices, use a special comparator that handles
  null-related logic.

The reason why we did not use the special comparator in single-column indices is
performance. The special comparator requires one to two extra steps for each
comparison it performs, which will slow down the cases where these comparisons
are effectively no-ops.


### 6.4 Comparator Abstraction

Simple tree indices typically have one order and forge absolute comparison logic
within. For example, a B+ tree on the text book always has the smallest value
on the left, and largest value on the right.

A general technique is to abstract the comparison into comparator so that the
same interfaces can be used even with different data types. Lovefield uses this
concept, but for different reasons.

One reason is to create a different order of index by default. If the user
already specified index to be built in descending order, Lovefield will just use
a descending comparator to build that index. This makes the query plan simpler
in most cases.

Another reason is for supporting cross-column index. Currently, cross-column
indices are implemented by abstracting the comparator from index data
structure. Lovefield thinks that cross-column indices are orchestrated from
composite keys, therefore it uses composite key comparators to construct the
B+ Tree index.

### 6.5 Future Researches

Index structures and algorithms directly impact the database's performance.
Lovefield team has explored following research directions but yet having time/
resources to actually test these ideas out:

* Grid File: if the cross-column indices are created for multi-dimension range
  queries all the time, a Grid File will be more effective in this case.
