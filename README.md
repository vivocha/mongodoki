# Mongodoki

A little library and command-line tool to on-the-fly run MongoDB as a Docker Container.



[![travis build](https://img.shields.io/travis/vivocha/mongodoki.svg)](https://travis-ci.org/vivocha/mongodoki)
[![Coverage Status](https://coveralls.io/repos/github/vivocha/mongodoki/badge.svg?branch=master)](https://coveralls.io/github/vivocha/mongodoki?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/vivocha/mongodoki/badge.svg)](https://snyk.io/test/github/vivocha/mongodoki)
[![npm version](https://img.shields.io/npm/v/mongodoki.svg)](https://www.npmjs.com/package/mongodoki)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)


## Prerequisites


[Docker](https://www.docker.com) must be installed and running on your machine, Mongodoki does the rest. 
Thus, no need to natively install MongoDB on your machine. 

---
## Quick Start as library

```
npm install mongodoki
```
then:

```js
const Mongodoki = require('mongodoki').Mongodoki;
const md = new Mongodoki();

//create and start a mongo:latest Docker container and return a MongoDB Db instance, default port: 27017, db name: local, container name: mongodoki-container
const db = await md.getDB();

//use Mongo Db instance through official mongodb drivers
const collections = await db.collections();
...
```

---
## Quick Start as command line tool

```
npm install -g mongodoki
```

```sh
$ mongodoki --help
```
;)

Example:

```sh
$ mongodoki start -n awesomedb

$ mongodoki stop awesomedb
```
---
## API


### Instantiating Mongodoki
```js
const md = new Mongodoki([config]); 
```

`config` object *is optional*; when missing, it defaults to:

 `{ tag: 'latest', containerName: 'mongodoki', hostPort: 27017 }`

where:
    
`tag` -  is the preferred tag for the official Docker Image;

`containerName` -  is the name of the container to create;

`port` -  is the MongoDB port at which dockerized mongod will listen;

`volume` - optional, is an object with two properties:

`{hostDir: <abs_path>, containerDir: <abs_path>'}`

 when `volume` is specified it allows to bind a directory with path in `hostDir` in the local host machine to a container volume path specified by the `containerDir` property. All paths are *absolute* and `hostDir` directory must be included in *File Sharing* Docker Preferences.

Specifying a `volume` binding allows to locally persist the database data in the host machine, preserving it between containers start/stop/create/destroy lifecycle.

Example:

```js
let md = new Mongodoki( {containerName: 'myMongo', volume: {hostDir: '/Users/diego/temp', containerDir: '/data/db'}} );
```

---

### Mongodoki Methods
All methods return a Promise.

**Create the Container (eventually import a data dump) and connect to the DB**

```js
getDB(dbName = 'local' [, timeout = 60000] [, dbDumpPath] )
```
Returns a Promise with the [Mongo driver `Db`](https://mongodb.github.io/node-mongodb-native/2.2/api/Db.html) object in case of success;

Parameters:

`dbName` -  name of the dockerized DB to connect to;

`timeout` - *optional*, max time to wait for the container/db startup, in milliseconds (default: 60000);

`dbDumpPath` - *optional*, root directory path of a db dump (previously created by MongoDB `mongodump` tool); in case of a successful import the created database on the container will contain the restored data.

---
**Manage the Container**


```js
stop();
remove();
stopAndRemove();
```
respectively, they stop, remove and stop+remove the Docker container.
Removing a container also removes all the created (and unused) Docker Volumes on the host machine (same as running  `docker volume prune` command).




---


License - "MIT License"
-----------------------

Copyright (c) 2017 Antonio Pintus, Vivocha S.p.A.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.