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

Currently Lovefield does not allow indexing of nullable fields. This is still
under evaluation and subjected to change in the future.



### 6.2 Data Structure for Indices

Lovefield is designed to allow multiple index types from the very beginning.
The philosophy behind this is to utilize the most efficient index structure
for different scenarios.

#### 6.2.1 AA Tree

Lovefield implements
[Arne Andersson Tree](http://user.it.uu.se/~arnea/abs/simp.html). It is used
to validate index testing infrastructure.

The major reason is the implementation of AA tree is extremely small.
Performance benchmarks have indicated that AA trees are not as competitive as
B+ trees. Lovefield keeps AA Tree for verification purposes since it is very
simple and comprehensive.

AA Tree disallows non-unique index.

#### 6.2.2 B+ Tree Index

Lovefield implements B+ Tree as its default index data structure. The B+ Tree
algorithm is based on the text book "Database Systems, the complete book", 2nd
edition written by Hector Garcia Molina, Jeffery D. Ullman, and Jennifer Widom,
published by Pearson.

B+ Tree is a very complicated data structure and some argues the complexity
of it makes physical optimization very hard. However, Lovefield has a
different use case. The major performance bottleneck of Lovefield is I/O,
especially IndexedDB I/O. Lovefield stores rows as IndexedDB objects, and
therefore past experiences regarding physical plan optimization may not apply
to Lovefield since they are under the assumption of using page-based disk I/O.
B+ Tree is proven to have least writes and therefore considered suitable for
Lovefield's persistence need.

#### 6.2.3 Row ID Index

This index type is a simple set. It is used for row id look up. Since the row
ids are unique, a set shall suffice. The normalized name of the Row ID index is
always in the form `TableName.#`.

### 6.3 Unique and Non-Unique Index

In Lovefield, *unique* index means that one key can only correspond to one row
id. This property is also used for enforcing the unique constraint. When the
insertion causes a key violation, it will throw an exception and thus will
enforce either the primary key or unique constraint.

Lovefield's implementation of non-unique B-Tree is to use an array to hold row
ids. This design is quite different from traditional wisdom, which implements
special internal nodes in B-Tree. The reasons are:

* It's simpler to implement and less error-prone.
* It is assumed that the deletion of a single row is rare, and the cost of
  deleting it from an array may not be too expensive since removing a null key
  in the internal node is also removing an element from array.

Lovefield has set up some performance monitoring for that and had not found any
significant impact caused by this design yet.

### 6.4 Cross-Column Index

Cross-column index is implemented by abstracting the comparator from index data
structure. Each index data structure will be associated with a comparator when
it is created. The comparator is set up according to the order specification of
the index (ascending or descending), and the columns of that index.

(still evolving, TBA)
