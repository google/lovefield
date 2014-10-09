# Dev Setup for Lovefield

## Closure

Closure compiler and closure library must be installed to develop Lovefield. See [Closure Tools](https://developers.google.com/closure/) for more information.

## node.js

Lovefield's SPAC (Schema Parser and Code-generator) uses node.js to parse the user-provided schema and to generate code.

### Ubuntu

The easy way to install node.js is `apt-get install nodejs`. However, we strongly discourage that, i.e. *DON'T DO IT*. The recommended way of doing things:

1. Remove all existing node packages
```bash
sudo apt-get remove nodejs
```

2. Install nvm under your home dir so that nothing requires sudo
```bash
cd
wget -qO- https://raw.github.com/creationix/nvm/master/install.sh | sh
source .profile
```

3. Install nodejs
```bash
nvm install v0.11
```

4. Install npm, make sure npm is installed in nvm node_module directory
```bash
wget -qO- https://npmjs.org/install.sh | sh
```

### Mac

1. Install [Homebrew](http://brew.sh) if you have not done so.

2. Install nvm: `brew install nvm`

3. Follow Ubuntu step 3 and 4.

### Windows

1. Install [nvmw](https://github.com/hakobera/nvmw). You also need to download a working nodejs from http://nodejs.org/dist and place it under nvmw directory. For example, download http://nodejs.org/dist/v0.10.32/x64/*.exe and place them under `%HOMEDRIVE%%HOMEPATH%\.nvmw\v0.10.32`.

2. Download latest npm zip from http://nodejs.org/dist/npm and extract them to  `%HOMEDRIVE%%HOMEPATH%\.nvmw\<your node version>`.

### Common for all platforms

Install dependencies
```bash
npm install -g glob js-yaml nopt http-server
```

For daily uses, use nvm to select from different node.js versions, so that you can easily reproduce bugs that might plague only a specific version of node.js:

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

## Gollum

Gollum is the tool that GitHub used to host the Wiki. It can be installed locally for editing and previewing documents.

### Install Gollum

You need to have ICU installed first
```bash
sudo apt-get install libicu-dev
```

Gollum is installed via Ruby Gems
```bash
sudo gem install gollum
```

### Edit Wiki
Gollum assumes wiki pages are stored in a git repo and on the master branch. Assume the source is synced to `~/src/lf`, then to view the documents, you need to

```bash
cd ~/src/lf
git checkout master
gollum
```

Gollum will start at the folder and use port 4567. You can now fire a browser and navigate to `http://localhost:4567/README`, which will display the documents as if you were browsing on the Web.

Gollum automatically commits changes to your git repo when you save modifications to any doc.
