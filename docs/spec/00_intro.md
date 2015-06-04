# Lovefield Specification

# 0. Introduction
## Goal
Lovefield is designed to provide a relational query engine for web apps.

## Basic Assumptions
* Lovefield is designed to handle databases whose data set is smaller than X
  (current bound is 2GB) but large enough to need a structural query engine.
* Lovefield provides a limited subset of [SQL-03](
  http://savage.net.au/SQL/sql-2003-2.bnf.html) functionalities.
* Lovefield uses existing storage technologies (e.g. IndexedDB) to persist data
  if requested. Developers are responsible to ensure that any data accessed
  from Lovefield query engine shall be treated as 'unsafe' and sanitized in some
  way before being sent back to the server.

## Requirements
1. SQL-like relational database query engine that covers most use cases
   supported by WebSQL.
2. Closure-compiler compliant: generated code and the library shall be
   compilable by Closure compiler.
3. Chrome Apps v2 compliant: can be used within Chrome Apps, requires only
   storage access privilege.
4. Drop-in library.
5. Can be used as a component.
6. Can be used by various JavaScript frameworks: Closure, jQuery, Polymer,
   AngularJS, ... etc.
7. Copy deployment: users should be able to just copy the distributed minified
   JS file to their project and start using it without knowing the internals.
8. There shall not be any side-effect of using this library.
9. Cross-browser support: Lovefield shall be compatible with Chrome, Firefox,
   Internet Explorer, and Safari.
10. Low-end device support: the library itself shall be able to run on
    low-CPU-power, low memory devices (e.g. HP Chromebook 11).

## Designed Workflow

### Basic Flow

Grab and use. See [Quick Start](../../demos/todo/README.md).

### Advanced Flow

This flow is specifically designed for the needs of Closure compiler advanced
optimization.

1. Create table schema in a YAML file.
2. Generate JavaScript source files using Schema Parser And Code-Generator
   (SPAC), which parses the YAML schema and performs code generation.
3. Use generated classes/functions in code.
4. Compile and combine everything together using Closure compiler.

## API Style

1. All Lovefield API and source code must follow [Google JavaScript Style Guide
   ](https://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml)
   and pass Closure compiler compilation. This implies that all APIs and
   source code are annotated with [Closure-style annotations](
   https://developers.google.com/closure/compiler/docs/js-for-compiler).

   One major caveat here is that Closure annotates `Promise` as `IThenable`.
   Lovefield uses `goog.Promise` to implement cross-browser Promise support,
   and therefore inherit the `IThenable` annotation since `goog.Promise` can be
   polyfills for browsers that do not support Promise (e.g.
   Internet Explorer 10).

2. All asynchronous APIs are Promise-based. For more information, search on
   Google or see [this document provided by Mozilla](
   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

3. All DDL (data definition language) APIs are synchronous.
   All DML (data manipulation lauguage) APIs are asynchronous.
