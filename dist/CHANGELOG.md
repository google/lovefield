Version: 2.0.64<br>
Publish date: 20151005<br>
Changes:
 - Implemented cascaded deletions/updates.
 - Implemented cross-column nullable indices.
 - Performance and memory improvements for READ_ONLY queries.
 - Modified distributed binaries such that they can be imported as modules.
 - Disable usage of native Map/Set for Safari or iOS Chrome.
 - Fixed a bug in BTree#getRange() for the case of LIMIT and SKIP by index.
 - Fixed a bug in BTree#getRange() for cross-column indices.
 - Fixed a bug preventing persisted indices to be serialized correctly if
   "bundled" mode is used.
 - Expliticly disallowing multiple calls to connect(), to avoid misusage.
 - Falling back to WEB_SQL or MEMORY data stores if no explicit data store type
   is requested in `connectOptions` and INDEXED_DB is not available.
 - Using the faster and experimental IDBObjectStore#getAll when available.
 - Stop accidentally distributing the codelabs/ folder through bower.

Version: 2.0.63<br>
Publish date: 20150917<br>
Changes:
 - Improved explain() output in the case of join predicates.
 - Implemented DB import/export functionality.
 - Fixed persisted indices implementation for WebSQL backing store.
 - Fixed debug/release binaries to work within a WebWorker.
 - Respecting column uniqueness for automatically created foreign key indices.
 - Forced Safari to use Set polyfill instead of native Set to work around buggy
   implementation.
 - Removed unnecessary function binding for better performance.
 - Create goog.Promise#catch alias for goog.Promise#thenCatch, such that
   returned promises match the interface of native Promise.
 - Enhanced nested loop join to be L1 cache aware.

Version: 2.0.62<br>
Publish date: 20150807<br>
Changes:
 - Implemented index nested loop join.
 - Optimize default cache.
 - Remove dependencies of Closure structures Multimap and TreeNode.
 - Provides source map for minified JS.
 - Provides ES6 only minified JS that strips out Map and Set polyfills.

Version: 2.0.61<br>
Publish date: 20150730<br>
Changes:
 - Converted all code paths to use native ES6 Map/Set when available.
 - Fixed a bug causing Firebase backend stopped working.
 - Fixed toSql() to correctly output queries with left outer join.
 - Fixed scoping bug in performance dashboard.
 - Fixed NULL handling problems in evaluators and predicates.
 - Improve B-Tree performance by using a more effective binary insert/remove
   algorithm.


Version: 2.0.60<br>
Publish date: 20150727<br>
Changes:
 - Modified not-nullable constraint to also mean not-undefinabale.
 - IndexRangeScanStep: Uses cheaper Index#get instead of Index#getRange whenever
   possible.
 - Ignore foreign key constraint violation if child column is set to null.
 - Make sure that cross-column TableBuilder#addUnique can't be used with
   nullable columns.
 - Various BTree optimizations (including get all records case).
 - Fixed case where trying to add an index with order lf.Order.DESC was being
   ignored (index was added with lf.Order.ASC).
 - Unified schema validation for SPAC and lf.query.Builder, and added missing
   checks.
 - Fixed TableBuilder toDbPayload() to handle ARRAY_BUFFER and nullable
   DATE_TIME correctly.
 - Fixed a bug in InMemoryUpdater#updateTableIndicesForRow which caused some
   indices to be inconsistent after a rollback.
 - Migrated various classes to use lf.structs.Map/Set, which is native Map/Set
   when available, or a pollyfil when not available.
 - Fixed behavior of aggregators MIN/MAX/AVG/SUM/COUNT/STDDEV for the case where
   nulls exist.


Version: 2.0.59<br>
Publish date: 20150701<br>
Changes:
 - Implemented RESTRICT foreign key constraints for all queries.
 - Fixed bug that caused a thrown lf.Exception to be unreadable when using
   lovefield.min.js.
 - Fixed bug that caused a nullable and unique index to allow multiple null
   keys.
 - Fixed default values of ARRAY\_BUFFER and OBJECT columns to be null, per
   spec.

Version: 2.0.58<br>
Publish date: 20150617<br>
Changes:
 - Change lf.Exception to be error-code based.
 - Foreign key declaration syntax change, and add more checks for the validity.
 - Consolidate top-level enums into one single file.
 - Gulp improvements: unify all gulp command lines, update gulp to 3.9.0, and
   fix various bugs.
 - Fix a bug that SPAC wrongly placed arraybuffer/object columns as not
   nullable.

Version: 2.0.57<br>
Publish date: 20150608<br>
Changes:
 - Fixed lovefield.min.js. It was missing lf.raw.BackStore public API.

Version: 2.0.56<br>
Publish date: 20150602<br>
Changes:
 - Fixed lovefield.min.js. It was missing various public API endpoints.
 - Added lovefield.d.ts TypeScript definitions in dist/ folder.

Version: 2.0.55<br>
Publish date: 20150526<br>
Changes:
 - Fixed typos
 - Fixed namespace leak in distributed package

Version: 2.0.54<br>
Publish date: 20150521<br>
Changes:
 - lovefield.min.js size reduced from 295Kb to 114Kb.
 - Fixed WebSQL backstore to work properly on Safari.
 - Fixed `gulp build` bug to properly order dependencies (topological sorting).

