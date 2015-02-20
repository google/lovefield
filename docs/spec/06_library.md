# Lovefield Specification

## 6. Library Facilities

### 6.1 Exceptions

Many of Lovefield's API methods throw exceptions. All the exceptions are modeled
as [`lf.Exception`](
https://github.com/google/lovefield/blob/master/lib/exception.js), which is
self-documented.

When an exception happens in a running transaction, the transaction will be
automatically rolled back and shifted to termination state, just like in all
other RDBMS.

### 6.2 Package Management Support

Lovefield is available via [NPM](https://www.npmjs.com/package/lovefield).
Bower support will be considered in the future if there were high demands.

### 6.3 Node.js Support

Lovefield does not support usage in node.js due to lack of IndexedDB.
Supporting node.js will be considered in the future if there were high demands.
