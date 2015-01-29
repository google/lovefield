2.1.0 / 2014-10-21
==================
  * Add `CHANGELOG.md`
  * Add `is.hex` and `is.base64` [#12](https://github.com/enricomarino/is/issues/12)
  * Update `tape`, `jscs`
  * Lock `covert` to v1.0.0 [substack/covert#9](https://github.com/substack/covert/issues/9)

2.0.2 / 2014-10-05
==================
  * `undefined` can be redefined in ES3 browsers.
  * Update `jscs.json` and make style consistent
  * Update `foreach`, `jscs`, `tape`
  * Naming URLs in README

2.0.1 / 2014-09-02
==================
  * Add the license to package.json
  * Add license and downloads badges
  * Update `jscs`

2.0.0 / 2014-08-25
==================
  * Add `make release`
  * Update copyright notice.
  * Fix is.empty(new String())

1.1.0 / 2014-08-22
==================
  * Removing redundant license
  * Add a non-deprecated method for is.null
  * Use a more reliable valueOf coercion for is.false/is.true
  * Clean up `README.md`
  * Running `npm run lint` as part of tests.
  * Fixing lint errors.
  * Adding `npm run lint`
  * Updating `covert`

1.0.0 / 2014-08-07
==================
  * Update `tape`, `covert`
  * Increase code coverage
  * Update `LICENSE.md`, `README.md`

0.3.0 / 2014-03-02
==================
  * Update `tape`, `covert`
  * Adding `npm run coverage`
  * is.arguments -> is.args, because reserved words.
  * "undefined" is a reserved word in ES3 browsers.
  * Optimizing is.equal to return early if value and other are strictly equal.
  * Fixing is.equal for objects.
  * Test improvements

0.2.7 / 2013-12-26
==================
  * Update `tape`, `foreach`
  * is.decimal(Infinity) shouldn't be true [#11](https://github.com/enricomarino/is/issues/11)

0.2.6 / 2013-05-06
==================
  * Fix lots of tests [#9](https://github.com/enricomarino/is/issues/9)
  * Update tape [#8](https://github.com/enricomarino/is/issues/8)

0.2.5 / 2013-04-24
==================
  * Use `tap` instead of `tape` [#7](https://github.com/enricomarino/is/issues/7)

