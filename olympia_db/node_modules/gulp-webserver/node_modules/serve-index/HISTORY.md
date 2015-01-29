1.6.0 / 2015-01-01
==================

  * Add link to root directory
  * deps: accepts@~1.2.2
    - deps: mime-types@~2.0.7
    - deps: negotiator@0.5.0
  * deps: batch@0.5.2
  * deps: debug@~2.1.1
  * deps: mime-types@~2.0.7
    - Add new mime types
    - Fix missing extensions
    - Fix various invalid MIME type entries
    - Remove example template MIME types
    - deps: mime-db@~1.5.0

1.5.3 / 2014-12-10
==================

  * deps: accepts@~1.1.4
    - deps: mime-types@~2.0.4
  * deps: http-errors@~1.2.8
    - Fix stack trace from exported function
  * deps: mime-types@~2.0.4
    - Add new mime types
    - deps: mime-db@~1.3.0

1.5.2 / 2014-12-03
==================

  * Fix icon name background alignment on mobile view

1.5.1 / 2014-11-22
==================

  * deps: accepts@~1.1.3
    - deps: mime-types@~2.0.3
  * deps: mime-types@~2.0.3
    - Add new mime types
    - deps: mime-db@~1.2.0

1.5.0 / 2014-10-16
==================

  * Create errors with `http-errors`
  * deps: debug@~2.1.0
    - Implement `DEBUG_FD` env variable support
  * deps: mime-types@~2.0.2
    - deps: mime-db@~1.1.0

1.4.1 / 2014-10-15
==================

  * deps: accepts@~1.1.2
    - Fix error when media type has invalid parameter
    - deps: negotiator@0.4.9

1.4.0 / 2014-10-03
==================

  * Add `dir` argument to `filter` function
  * Support using tokens multiple times

1.3.1 / 2014-10-01
==================

  * Fix incorrect 403 on Windows and Node.js 0.11
  * deps: accepts@~1.1.1
    - deps: mime-types@~2.0.2
    - deps: negotiator@0.4.8

1.3.0 / 2014-09-20
==================

  * Add icon for mkv files
  * Lookup icon by mime type for greater icon support

1.2.1 / 2014-09-05
==================

  * deps: accepts@~1.1.0
  * deps: debug@~2.0.0

1.2.0 / 2014-08-25
==================

  * Add `debug` messages
  * Resolve relative paths at middleware setup

1.1.6 / 2014-08-10
==================

  * Fix URL parsing
  * deps: parseurl@~1.3.0

1.1.5 / 2014-07-27
==================

  * Fix Content-Length calculation for multi-byte file names
  * deps: accepts@~1.0.7
    - deps: negotiator@0.4.7

1.1.4 / 2014-06-20
==================

  * deps: accepts@~1.0.5

1.1.3 / 2014-06-20
==================

  * deps: accepts@~1.0.4
    - use `mime-types`

1.1.2 / 2014-06-19
==================

  * deps: batch@0.5.1

1.1.1 / 2014-06-11
==================

  * deps: accepts@1.0.3

1.1.0 / 2014-05-29
==================

  * Fix content negotiation when no `Accept` header
  * Properly support all HTTP methods
  * Support vanilla node.js http servers
  * Treat `ENAMETOOLONG` as code 414
  * Use accepts for negotiation

1.0.3 / 2014-05-20
==================

  * Fix error from non-statable files in HTML view

1.0.2 / 2014-04-28
==================

  * Add `stylesheet` option
  * deps: negotiator@0.4.3

1.0.1 / 2014-03-05
==================

  * deps: negotiator@0.4.2

1.0.0 / 2014-03-05
==================

  * Genesis from connect
