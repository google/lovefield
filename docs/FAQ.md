# Frequently Asked Question


## General

### Is Lovefield production quality?

Yes. [Google Play Movies & TV](
https://chrome.google.com/webstore/detail/google-play-movies-tv/gdijeikdkaembjbdobgfkoidjkpbmlkd)
has shipped with Lovefield for more than a year as of September 2015.

### Lovefield looks similar to XYZ, are you related?

No. Lovefield is built from scratch.


## Technical

### Can Lovefield be used with Angular/Bootstrap/Cordova/D3 ...?

Yes. Lovefield is designed to work with existing JavaScript libraries/frameworks
from the very beginning. The Lovefield team is not omniscient nor omnipotent to
give the answers for interoperability of specific library/framework you had,
however, just assume yes, give it a try, and let us know if it does not work.

### How's Lovefield's performance?

Check our [performance dashboard](https://google.github.io/lovefield/dashboard/src/dashboard.html).
Details of benchmark is provided [here](https://github.com/google/lovefield/tree/master/perf).
Your mileage can vary depending on the platform and browser you use, the best way
to verify is to run the benchmark yourself on your target platform and browser.

### How does Lovefield execute my query?

Lovefield has relational query engine built-in, similar to SQLite, MySQL, or
other relational databases. The difference is that Lovefield does not accept raw
SQL statements; instead, it has a builder-pattern API to build queries.

Lovefield executes queries inside your browser. For more details, checkout
[this video](https://youtu.be/wRiI4p5Uk4E?t=750) or our
[design doc](https://github.com/google/lovefield/blob/master/docs/dd/04_query_engine.md).

### What are the relationships between Lovefield and IndexedDB/WebSQL/Firebase?

Lovefield uses those data stores to persist data, and is designed to work
with different data stores such as IndexedDB and Firebase.

WebSQL is also used as a pure data store. Lovefield does not use WebSQL for
indices or query execution.

### I can not use IndexedDB as data store on Safari. Why?

As of October, 2015, tests show that Lovefield's IndexedDB backstore could
not be run on Safari 8 or Safari 9 beta. Safari simply throws mysterious DOM
errors that do not happen on IE, Firefox and Chrome. This has been reported
to WebKit/Apple but there's no word about ETA of fix. Please specify your
connect options to WebSQL or Memory as mentioned [here](spec/02_data_store.md).

### Lovefield does not seem to work in private browsing of Safari/Firefox?

That is true. Safari does not support any storage in private browsing, so WebSQL
is not an option here. You may consider using Memory when detected private
browsing in Safari.

For Firefox, see [here](https://bugzilla.mozilla.org/show_bug.cgi?id=781982).

### What are the differences between Lovefield and IndexedDB/Firebase?

Lovefield offers relational query with SQL-like syntax, which IndexedDB and
Firebase don't.

### What are the differences between Lovefield and WebSQL?

WebSQL is considered obsolete and does not work cross-browser. Lovefield works
cross-browser.
