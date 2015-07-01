Version: 2.0.59
Publish date: 20150701
Changes:
 - Implemented RESTRICT foreign key constraints for all queries.
 - Fixed bug that caused a thrown lf.Exception to be unreadable when using
   lovefield.min.js.
 - Fixed bug that caused a nullable and unique index to allow multiple null
   keys.
 - Fixed default values of ARRAY\_BUFFER and OBJECT columns to be null, per
   spec.

Version: 2.0.58
Publish date: 20150617
Changes:
 - Change lf.Exception to be error-code based.
 - Foreign key declaration syntax change, and add more checks for the validity.
 - Consolidate top-level enums into one single file.
 - Gulp improvements: unify all gulp command lines, update gulp to 3.9.0, and
   fix various bugs.
 - Fix a bug that SPAC wrongly placed arraybuffer/object columns as not
   nullable.

Version: 2.0.57
Publish date: 20150608
Changes:
 - Fixed lovefield.min.js. It was missing lf.raw.BackStore public API.

Version: 2.0.56
Publish date: 20150602
Changes:
 - Fixed lovefield.min.js. It was missing various public API endpoints.
 - Added lovefield.d.ts TypeScript definitions in dist/ folder.

Version: 2.0.55
Publish date: 20150526
Changes:
 - Fixed typos
 - Fixed namespace leak in distributed package

Version: 2.0.54
Publish date: 20150521
Changes:
 - lovefield.min.js size reduced from 295Kb to 114Kb.
 - Fixed WebSQL backstore to work properly on Safari.
 - Fixed `gulp build` bug to properly order dependencies (topological sorting).

