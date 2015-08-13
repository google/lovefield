# Dev Setup for Lovefield

## Java, Git, Node.js

You will need to have Java, git, and Node.js in a working state. They must be
searchable from your PATH.

Lovefield uses node.js for various development tools. Due to the ES6 APIs used,
version of installed node.js must be greater than 0.12.

### Special Notes for Windows Users

Windows Command Prompt has a limitation of command-line length, which will cause
Closure compiler failure since the compiler requires a command-line way longer
than that limit. The solution is to install a command line utility, such as
TCC/LE, to overcome that limitation.

## Set Up Dev Environment

1. Install dependencies

   Lovefield uses npm as its dependency manager. Run

```bash
npm update
```

   to install packages required by Lovefield.

2. Build/Test Lovefield

   Lovefield uses Closure JavaScript Compiler to validate/minify/uglify its
   code. The compiler is brought down by npm automatically.

   Lovefield uses Selenium WebDriver to run automated test. You will need to
   [download](http://docs.seleniumhq.org/download) and install the WebDrivers
   manually.

   Lovefield uses gulp as its build manager. Run

```bash
gulp
```
   to see the commands supported.

## Markdowns

All Lovefield documents are in GitHub markdown format. Use one of your favorite
editor/previewer for markdowns.

