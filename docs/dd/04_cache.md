#Lovefield Design Document
## Cache

Lovefield has an in-memory row cache, which is conceptually a big map of row
ids to rows (and that is why Lovefield has unique row ids across the board).
Currently the cache is a "dumb" cache: it contains exact duplica of what are
persisted in the IndexedDB. The reason for doing that is to workaround
IndexedDB inefficiency of handing bulk I/O, as described in
[backstore section](03_backstore.md#bundled-mode-experiment). By caching all
rows in memory, Lovefield avoids any additional round-trip required to load
data from IndexedDB, with the price of memory usage.

## Prefetcher

Prefetcher loads rows from IndexedDB into Cache, and the loading is performed
at the time when `lf.base.init()` is called. It also reconstructs all volatile
indices (i.e. in-memory-only indices) immediately when all required rows are
loaded for those indices.

## Future Work: Smart Cache
Existing cache requires prefetcher to perform bulk loading during database
initialization, which is not optimal especially for large data sets. Lovefield
plans to implement an MRU-based lazy-load cache that loads data on first use or
per optimizer demands. It is projected to reduce the database loading time
significantly.

