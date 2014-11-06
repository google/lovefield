# Lovefield Design Document
## 0. Introduction
Lovefield is a query engine and therefore it is built very similar to traditional RDBMS in many aspects. In this chapter we will talk about the design philosophy of Lovefield and certain driving factors of the design.

### Why Lovefield?
The best thing of software engineering is that most problems can be solved in different ways. People choose an Object Database or a Relational Database to solve their problems based on different analysis and reasons. Unfortunately the support of relational database as a web client storage solution is in an unsatisfactory state after WebSQL being deprecated, and thus Lovefield is created to offer the choice that developers shall be honored to have.

### Why Use IndexedDB as Data Store?
To build a relational database, the first thing to pick is to decide what data store to use. Unlike most RDBMS, Lovefield uses IndexedDB as its data store. The decision process is quite simple: enumerate cross-browser client-side storage solution and rule out things that does not fit.

  * Local Storage: only 5MB, not really a good idea
  * Cookie Jars: seriously?
  * HTML5 File API: FileSystem and FileWriter API are not cross-platform, and they are not going to be any time soon.
  * IndexedDB: Everybody supports it or will support it

So the choice is obvious: IndexedDB it is.

### Constraints of IndexedDB
Using IndexedDB as the data store creates following constraints:

* IndexedDB itself is an object store. It does not have the concept of low-level I/O which was treated as granted in traditional RDBMS.
* Atomic access of IndexedDB is very trappy because IndexedDB commits the data to disk when it feels it needs to.
* IndexedDB lacks efficient means for bulk loading/writing.
* IndexedDB loves to fire events, which is a performance killer if not handled and tuned carefully.

One should keep these constraints in mind when working with Lovefield. We deal with these problems so our users are released from that pain.

### Constraints of JavaScript/General HTML5
There is simply not a way to measure how much heap is allocated within JavaScript. As a result, precise memory management is non-existent by JavaScript-based programs. What Lovefield can do is to provide different means for its users to lower their memory usage and lower Garbage Collector pressure.

### Use of Closure Library/Compiler
Lovefield is developed using Closure Library, mainly because the original developers are more familiar with it. Since Lovefield is designed to be used cross-browser and cross-framework, it has to ship with all its dependencies. Therefore usage of Closure library is consciously limited to the smallest possible set so that size of the shipped library can be smaller.

All Lovefield code are checked by Closure compiler with very strict options. The compilation structure is not ported to GitHub yet, which we hope to develop in a later milestone.

Closure testing infrastructure uses JSUnit, which is sort of obsolete. We hope to convert the tests to Jasmine or Mocha with Karma, but that would be low in development priority.

### Components of Lovefield
Lovefield consists following components:

* Schema Parser and Code-generator (SPAC, `spac/`)
* Schema (`schema/`)
* Caching support (`cache/`)
* Query engine
    * Query builder (`query/`)
    * Query runner (`proc/`)
* Back store management (`backstore/`)
* Indices (`index/`)

These components will be detailed in following chapters.
