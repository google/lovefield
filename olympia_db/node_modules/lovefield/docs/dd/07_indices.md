# Lovefield Design Documents
## Indices

Lovefield is designed to allow multiple index types from the very beginning.
The philosophy behind this is to utilize the most efficient index structure
for different scenarios.

By design there are two types of indices: volatile (i.e. in-memory only) and
persisted indices.


### Index-able Data Types
Lovefield internally allows only string and numbers to be indexed. Data types
other than string and numbers must be converted.

Quote from our spec reviewer Scott Hess:

> Also having indices only depend on basic internal types is much more robust.
> Just about the only developers I would ever trust to build an app-defined
> index are exactly those who should have no problem just storing and operating
> on transformed data.

Lovefield shares the same insight Scott has and tries to keep the index data
type as simple as possible.


### AA Index
Lovefield implements
[Arne Andersson Tree](http://user.it.uu.se/~arnea/abs/simp.html) as its default
volatile index. AA Tree is a simple balanced tree with good performance.

> #### Why AA?
> The major reason is the implementation of AA tree is extremely small. For
> JavaScript code, this is an important feature. It means that the index code
> can be parsed faster, loaded faster, and even run faster.


### B+ Tree Index
Lovefield implements B+ Tree as its default persisted index. The B+ Tree
algorithm is based on the text book "Database Systems, the complete book", 2nd
edition written by Hector Garcia Molina, Jeffery D. Ullman, and Jennifer Widom,
published by Pearson.

> #### Why B+ Tree?
> B+ Tree is a very complicated data structure and some argues the complexity
> of it makes physical optimization very hard. However, Lovefield has a
> different use case. The major performance bottleneck of Lovefield is I/O,
> especially IndexedDB I/O. Lovefield stores rows as IndexedDB objects, and
> therefore past experiences regarding physical plan optimization may not apply
> to Lovefield since they are under the assumption of using page-based disk I/O.
> B+ Tree is proven to have least writes and therefore considered suitable for
> Lovefield's persistence need.


### Map Index
This index type is a simple hash table. It needs more work to adapt to different
scenarios such as sparse contents.


### Row ID Index
This index type is a simple set. It is used for row id look up. Since the row
ids are unique, a set shall suffice. The normalized name of the Row ID index is
always in the form `TableName.#`.


## Future Works
The persist index is still under construction and needs to be finished.
Cross-column index is not implemented and needs to be done.

Lovefield also considers adding Grid File and Reverse Index in the future for
cross-column index and full text search.

