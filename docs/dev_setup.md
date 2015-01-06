# Dev Setup for Lovefield

## Python, Java, Git

You will need to have Python, Java, and git in a working state. Windows users
please consider install [depot_tools](
http://www.chromium.org/developers/how-tos/install-depot-tools) directly.

Lovefield will move away from Python, however, the Closure library it depends
on has not cut the dependencies on Python yet, and thus you need a working
Python.

All these programs must be searchable from your PATH.

## node.js

Lovefield uses node.js for various development tools. There is no run-time
dependency. You need to have a working node.js whose version is greater
than 0.11.

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

4. Update npm

        npm update -g npm

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

## Set Up Dev Environment

1. Install dependencies

   Lovefield uses npm as its dependency manager. Run

```bash
npm update
```

   to install packages required by Lovefield.

2. Build/Test Lovefield

   Lovefield uses gulp as its build manager. This part is currently under active
   construction and will be further detailed once all the wrinkles are ironed
   out.

## Markdowns

All Lovefield documents are in GitHub markdown format. Use one of your favorite
editor/previewer for markdowns.

