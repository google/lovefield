# v8flags  [![Build Status](https://secure.travis-ci.org/tkellen/node-v8flags.png)](http://travis-ci.org/tkellen/node-v8flags) [![Build status](https://ci.appveyor.com/api/projects/status/5jpe6yawxdllrok4?svg=true)](https://ci.appveyor.com/project/tkellen/node-v8flags)
> Get available v8 flags.

[![NPM](https://nodei.co/npm/v8flags.png)](https://nodei.co/npm/v8flags/)

## Example
```js
const v8flags = require('v8flags');

v8flags.fetch(); // [ '--use_strict',
                 //   '--es5_readonly',
                 //   '--es52_globals',
                 //   '--harmony_typeof',
                 //   '--harmony_scoping',
                 //   '--harmony_modules',
                 //   '--harmony_proxies',
                 //   '--harmony_collections',
                 //   '--harmony',
                 // ...
```

## Release History

* 2014-12-22 - v1.0.8 - exclude `--help` flag
* 2014-12-20 - v1.0.7 - pre-cache flags for every version of node from 0.8 to 0.11
* 2014-12-09 - v1.0.6 - revert to 1.0.0 behavior
* 2014-11-26 - v1.0.5 - get node executable from `process.execPath`
* 2014-11-18 - v1.0.4 - wrap node executable path in quotes
* 2014-11-17 - v1.0.3 - get node executable during npm install via `process.env.NODE`
* 2014-11-17 - v1.0.2 - get node executable from `process.env._`
* 2014-09-03 - v1.0.0 - first major version release
* 2014-09-02 - v0.3.0 - keep -- in flag names
* 2014-09-02 - v0.2.0 - cache flags
* 2014-05-09 - v0.1.0 - initial release
