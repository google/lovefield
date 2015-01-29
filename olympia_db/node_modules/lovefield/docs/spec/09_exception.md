# Lovefield Specification

## 9. Exceptions

Each of the exceptions defined in Lovefield is an lf.Exception. They can be used like DOMExceptions, however, all the code values are zero.

|Type                | Message (Optional) |
|:------------------ |:------------------ |
|`UnknownError`      |The operation failed for reasons unrelated to the database itself and not covered by any other errors. |
|`BlockingError`     |Context is already in use and cannot be reused. For example, attempt to start observer twice. |
|`ConstraintError`   |Write transaction violates constraints specified in schema.|
|`DataError`         |Data provided to an operation does not meet requirements.|
|`NotFoundError`     |Specified name not found in schema, this is only for database upgrade process.|
|`QuotaExceededError`|The operation failed because there was not enough remaining storage space, or the storage quota was reached and the user declined to give more space to the database.|
|`SyntaxError`       |Invalid syntax, for example, calling `from()` twice.|
|`TimeoutError`      |A lock for the transaction could not be obtained in a reasonable time.|
|`TooManyRowsError`  |The index structure (B+ Tree) is not capable of handling so many rows (current limitation is 2<sup>27</sup> = 134217728 rows)|
|`VersionError`      |An attempt was made to open a database using a lower version than the existing version, or the loaded DB instance has a different version then requested.|
