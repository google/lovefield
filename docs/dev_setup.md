# Dev Setup for Lovefield

## Java, Git, Node.js

You will need to have Java, git, and Node.js in a working state. They must be
searchable from your PATH.

Lovefield uses node.js for various development tools, see package.json for
suggested version.

### Special Notes for Windows Users

Windows Command Prompt has a limitation of command-line length, which will cause
Closure compiler failure since the compiler requires a command-line way longer
than that limit. The solution is to install a command line utility, such as
TCC/LE, to overcome that limitation.

## Set Up Dev Environment

1. Install dependencies

 Lovefield uses npm as its dependency manager. Run `npm update` to install
 packages required by Lovefield.

2. Build Lovefield

 Lovefield uses Closure JavaScript Compiler to validate/minify/uglify its
 code. The compiler is brought down by npm automatically.

 Lovefield uses gulp as its build manager. Run `gulp` to see the commands
 supported.

3. Test Lovefield

 Lovefield uses Selenium WebDriver to run automated test. There are two ways
 of running unit tests:

  a. Test locally

   You will need to [download](http://docs.seleniumhq.org/download) and install
   the WebDrivers manually. Then run
   `gulp test --target=tests --browser=<browser>` to test locally. Local testing
   are supposed to be used for debugging and quick turn around.

  b. Test using Sauce Labs

   You will need to register an account on [Sauce Labs](https://saucelabs.com),
   and run [Sauce Connect](https://docs.saucelabs.com/reference/sauce-connect)
   on your computer. Then run the following script (assuming Linux/Mac and bash
   is used, Windows users please adjust the script to fit your environment):

   ```bash
   export SAUCE_USERNAME=<your username>
   export SAUCE_ACCESS_KEY=<your sauce token>
   export SELENIUM_BROWSER=chrome
   gulp test --target=tests
   export SELENIUM_BROWSER=firefox
   gulp test --target=tests
   export SELENIUM_BROWSER=ie
   gulp test --target=tests
   export SELENIUM_BROWSER=safari
   gulp test --target=tests
   ```
   You can find your user name and sauce token
   [here](https://docs.saucelabs.com/tutorials/node-js).

4. Make contributions

 Make sure you are okay with the rules in [CONTRIBUTING](../CONTRIBUTING.md).
 If not, you can stop reading here.

 For your contribution to be accepted, your change must pass the following
 commands (again, assuming Linux/Mac):

 ```bash
 gulp build --target=lib --mode=opt
 gulp build --target=tests
 gulp lint
 gulp test --target=spac
 export SAUCE_USERNAME=<your username>
 export SAUCE_ACCESS_KEY=<your sauce token>
 export SELENIUM_BROWSER=chrome
 gulp test --target=tests
 export SELENIUM_BROWSER=firefox
 gulp test --target=tests
 export SELENIUM_BROWSER=ie
 gulp test --target=tests
 export SELENIUM_BROWSER=safari
 gulp test --target=tests
 ```
 [JavaScript style](https://google.github.io/styleguide/javascriptguide.xml)
 is strictly enforced with no mercy. Unfortunately, the linter will not lint
 everything, so you may have more lints during code review.

 Your pull request will not trigger Travis CI due to security concerns. As a
 result, you'll need to run the script above locally to avoid straight decline.

## Markdowns

All Lovefield documents are in GitHub markdown format. Use one of your favorite
editor/previewer for markdowns.

