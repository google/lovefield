# node-google-closure-library-latest

A Node.js module wrapper for downloading/installing the latest version of the Google Closure library. Downloads the latest versions upon install, rather than during prepublish.
As such, a consumer can always just run `npm update`/`npm install` to get the latest updates despite the module's version being unchanged. 

## Install

```shell
npm install google-closure-library-latest
```

## Usage

```js
var gcl = require('google-closure-library-latest');

// Install the Google Closure tools into a specific target dir
var installDir = __dirname + '/closure-library';
gcl(installDir);
```