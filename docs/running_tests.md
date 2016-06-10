# Running Unit Tests of Lovefield

## Type of Tests

There are three different type of tests in Lovefield:

* Unit tests: tests used to validate correctness of the library.
* SPAC tests: tests used to validate correctness of SPAC, most users won't use
  it.
* Performance tests: tests used for monitoring Lovefield performance, mainly
  designed to be run by test bots.

## Manual Testing

To perform manual testing, you need to run the following command line

```bash
gulp debug
```

This will start a server with unit tests by default. Type `gulp` for detailed
usage regarding how to run server for performance tests.

You then need to start a browser and browse to `localhost:8000`. It is
*STRONGLY SUGGESTED* that you use a test profile for your browser.

## Automatic Testing

Automatic testing is detailed in [Developer Setup](dev_setup.md).

