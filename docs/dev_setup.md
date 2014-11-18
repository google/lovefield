# Dev Setup for Lovefield

## Python, Java, Git

You will need to have Python, Java, and git in a working state. Windows users
please consider install [depot_tools](
http://www.chromium.org/developers/how-tos/install-depot-tools) directly.

Lovefield will move away from Python, however, the Closure library it depends
on has not cut the dependencies on Python yet, and thus you need a working
Python.

All these programs must be searchable from your PATH.

## Closure

Closure compiler and closure library must be installed to develop Lovefield.
See [Closure Tools](https://developers.google.com/closure/) for more
information.

## node.js

Lovefield's SPAC (Schema Parser and Code-generator) uses node.js to parse the
user-provided schema and to generate code.

### Ubuntu

The easy way to install node.js is `apt-get install nodejs`. However, it is
strongly discouraged, i.e. *DON'T DO IT*. The recommended way of doing things:

1. Remove all existing node packages

        sudo apt-get remove nodejs

2. Install nvm under your home dir so that nothing requires sudo

        cd
        wget -qO- https://raw.github.com/creationix/nvm/master/install.sh | sh
        source .profile

3. Install nodejs

        nvm install v0.11

4. Install npm, make sure npm is installed in nvm node_module directory

        wget -qO- https://npmjs.org/install.sh | sh

### Mac

1. Install [Homebrew](http://brew.sh) if you have not done so.

2. Install nvm: `brew install nvm`

3. Follow Ubuntu step 3 and 4.

### Windows

1. Install [nvmw](https://github.com/hakobera/nvmw).

2. Install nodejs via nvmw. nvmw requires full version for its command-line,
   i.e. 0.10.32 instead of just giving 0.10.

3. Check if your npm can find packages. If not, you will need to set the
   NODE_PATH environment variable yourself, or by modifying nvmw.bat.

### Common for all platforms

Install dependencies
```bash
npm install -g glob js-yaml nopt http-server temporary rimraf mkdirp
```

For daily uses, use nvm to select from different node.js versions, so that you
can easily reproduce bugs that might plague only a specific version of node.js:

#### Linux / Mac
```bash
nvm use 0.11  # use node.js 0.11.*, pick the latest one
node
```

#### Windows
```
nvmw use 0.11.14  :: nvmw needs exact version
node
```

## Markdowns

All Lovefield documents are in GitHub markdown format. Use one of your favorite
editor/previewer for markdowns.

