# Mongodocki

A little utility to on-the-fly run MongoDB as a Docker container.



[![travis build](https://img.shields.io/travis/vivocha/mongodoki.svg)](https://travis-ci.org/vivocha/mongodoki)
[![Coverage Status](https://coveralls.io/repos/github/vivocha/mongodoki/badge.svg?branch=master)](https://coveralls.io/github/vivocha/mongodoki?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/vivocha/mongodoki/badge.svg)](https://snyk.io/test/github/vivocha/mongodoki)
[![npm version](https://img.shields.io/npm/v/mongodoki.svg)](https://www.npmjs.com/package/mongodoki)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)


## Prerequisites


[Docker](https://www.docker.com) must be installed and running on your machine, Mongodocki does the rest. 
Thus, no need to natively install MongoDB on your machine. 

---
## Quick Start

```
npm install mongodoki
```
then:

```js
const MongoDoki = require('mongodoki');
const md = new Mongodoki();

//create and start a mongo:latest Docker container and return a MongoDB Db instance, default port: 27017, db name: local, container name: mongodoki-container
const db = await md.getDB();

//use Mongo Db instance through official mongodb drivers
const collections = await db.collections();
...
```


## API


### Instantiating Mongodoki
```js
const md = new Mongodoki(tag = 'latest', port = 27017); 
```

where:
    
`tag` -  is the preferred tag for the official Docker Image;

`port` -  is the MongoDB port at which dockerized mongod will listen;

### Mongodoki Methods
All methods return a Promise.

```js
getDB(containerName = 'mongodoki-container', dbName = 'local', timeout = 60000)
```
Returns a Promise with the [Mongo driver `Db`](https://mongodb.github.io/node-mongodb-native/2.2/api/Db.html) object in case of success;
Parameters:

`containerName` -  preferred container name; in case of name conflict the existimg container is stopped and removed, then started again from scratch;

`dbName` -  name of the dockerized DB to connect to;

`timeout` - time to wait in order to attemp a connection to the container/db, in milliseconds;

---
```js
stop();
remove();
stopAndRemove();
```
respectively, they stop, remove and stop+remove the Docker container.
Removing a container also removes all the created Docker Volumes.




---


License - "MIT License"
-----------------------

Copyright (c) 2017 Antonio Pintus

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