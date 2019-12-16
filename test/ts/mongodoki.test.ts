import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Mongodoki } from '../../dist/index';
const utils = require('../utils.js');

const should = chai.should();
chai.use(chaiAsPromised);

describe('Mongodoki', function() {
  describe('Mongodoki class', function() {
    it('constructor by default should init hostPort and Tag members', function() {
      const md: any = new Mongodoki();
      md.opts.tag.should.equal('latest');
      md.opts.ports[0].host.should.equal(27017);
    });

    it('constructor by default should init hostPort', function() {
      const md: any = new Mongodoki({
        tag: 'aTag'
      });
      md.opts.tag.should.equal('aTag');
      md.opts.ports[0].host.should.equal(27017);
    });

    it('constructor by default should init Tag and set the right port', function() {
      const md: any = new Mongodoki({ hostPort: 22222 });
      md.opts.tag.should.equal('latest');
      md.opts.ports[0].host.should.equal(22222);
    });
    it('constructor by default should init reuse to false', function() {
      const md: any = new Mongodoki({ hostPort: 22222 });
      should.not.exist(md.opts.reuse);
    });
  });

  describe('Starting the MongoDB container', function() {
    let md;
    let db;

    before('Start container', async function() {
      md = new Mongodoki();
      db = await md.getDB();
    });

    it('container should start and a connection to DB should be established', async function() {
      db.should.be.ok;
      // get
      const collections = await db.collections();
      collections.should.be.ok;
      //await db.close();
    });

    after('Stop and Remove container', async function() {
      await md.stopAndRemove();
      return;
    });
  });

  describe('Reusing a MongoDB container', function() {
    let md;
    let db;

    before('Start a container', async function() {
      md = new Mongodoki({ containerName: 'reusableMongo' });
      db = await md.getDB();
    });
    it('container should start and a connection to DB should be established', async function() {
      db.should.be.ok;
      const collections = await db.collections();
      collections.should.be.ok;
      let coll = await db.collection('things');
      let data = await coll.insertOne({ type: 'LAMP' });
      data.should.be.ok;
      //await db.close();
    });
    it("Re-using the container it shoudn't be re-built", async function() {
      const md = new Mongodoki({ containerName: 'reusableMongo', reuse: true });
      const db = await md.getDB();
      db.should.be.ok;
      const collections = await db.collections();
      collections.should.be.ok;
      let coll = await db.collection('things');
      let data = await coll.findOne({});
      data.should.be.ok;
      data.should.have.property('type');
      //await db.close();
    });
    after('Stop and Remove container', async function() {
      await md.stopAndRemove();
      return;
    });
  });

  describe('Reusing a PAUSED MongoDB container', function() {
    let md;
    let db;

    before('Start a container', async function() {
      md = new Mongodoki({ containerName: 'reusableMongo' });
      db = await md.getDB();
    });
    it('container should start and a connection to DB should be established', async function() {
      db.should.be.ok;
      const collections = await db.collections();
      collections.should.be.ok;
      let coll = await db.collection('things');
      let data = await coll.insertOne({ type: 'LAMP' });
      data.should.be.ok;
      //await db.close();
      //pause container
      const { container } = await (md as any).getContainer();
      should.exist(container);
      await container.pause();
      return;
    });
    it("Re-using the container it shoudn't be re-built", async function() {
      const md = new Mongodoki({ containerName: 'reusableMongo', reuse: true });
      const db = await md.getDB();
      db.should.be.ok;
      const collections = await db.collections();
      collections.should.be.ok;
      let coll = await db.collection('things');
      let data = await coll.findOne({});
      data.should.be.ok;
      data.should.have.property('type');
      //await db.close();
    });
    after('Stop and Remove container', async function() {
      await md.stopAndRemove();
      return;
    });
  });

  describe('Reusing a STOPPED MongoDB container', function() {
    let md;
    let db;

    before('Start a container', async function() {
      md = new Mongodoki({ containerName: 'reusableMongo' });
      db = await md.getDB();
    });
    it('container should start and a connection to DB should be established', async function() {
      db.should.be.ok;
      const collections = await db.collections();
      collections.should.be.ok;
      let coll = await db.collection('things');
      let data = await coll.insertOne({ type: 'LAMP' });
      data.should.be.ok;
      //await db.close();
      //stop the container
      const { container } = await (md as any).getContainer();
      should.exist(container);
      await container.stop();
      return;
    });
    it("Re-using the container it shoudn't be re-built", async function() {
      const md = new Mongodoki({ containerName: 'reusableMongo', reuse: true });
      const db = await md.getDB();
      db.should.be.ok;
      const collections = await db.collections();
      collections.should.be.ok;
      let coll = await db.collection('things');
      let data = await coll.findOne({});
      data.should.be.ok;
      data.should.have.property('type');
      //await db.close();
    });
    after('Stop and Remove container', async function() {
      await md.stopAndRemove();
      return;
    });
  });

  describe('Trying to re-use an inexistent MongoDB container', function() {
    let md;
    let db;

    it('the container should be built', async function() {
      md = new Mongodoki({ containerName: 'aQuiteNewMongo', reuse: true });
      db = await md.getDB();
      db.should.be.ok;
      const collections = await db.collections();
      collections.should.be.ok;
      //await db.close();
    });
    after('Stop and Remove container', async function() {
      await md.stopAndRemove();
      return;
    });
  });

  describe('Starting and stopping and removing the MongoDB container', function() {
    let md;
    let db;

    before('Start container', async function() {
      md = new Mongodoki();
      db = await md.getDB();
    });

    it('container should start and a connection to DB should be established', async function() {
      db.should.be.ok;
      // get
      const collections = await db.collections();
      collections.should.be.ok;
      //await db.close();
    });

    after('Stop and Remove container', async function() {
      await md.stop();
      await md.remove();
      return;
    });
  });

  describe.skip('Testing timeouts', function() {
    let md;

    before('Create a container for timeouts testing', async function() {
      md = new Mongodoki({ tag: 'latest', containerName: 'ruggero' });
    });

    it('Starting a container with a too low timeout should throw an Error', async function() {
      return await md.getDB('anotherAmazingDB', 1).should.be.rejected;
    });

    after('Stop and Remove container', async function() {
      await md.stop();
      await md.remove();
      return;
    });
  });

  describe('Trying to create a container with the same name (default) of a running one', function() {
    let md, md2;
    let db, db2;

    before('Create a container', async function() {
      md = new Mongodoki();
      db = await md.getDB();
    });

    it('Should be OK', async function() {
      md2 = new Mongodoki();
      db2 = await md2.getDB();
      db2.should.be.ok;
    });

    after('Stop and Remove the containers', async function() {
      await md2.stop();
      await md2.remove();
      return;
    });
  });

  describe('Trying to create a container with the same name of a running one', function() {
    let md, md2;
    let db, db2;

    before('Create a container', async function() {
      md = new Mongodoki({ containerName: 'anotherAmazingMongo' });
      db = await md.getDB();
    });

    it('Should be OK', async function() {
      md2 = new Mongodoki({ containerName: 'anotherAmazingMongo' });
      db2 = await md2.getDB();
      db2.should.be.ok;
    });

    after('Stop and Remove the containers', async function() {
      await md2.stop();
      await md2.remove();
      return;
    });
  });

  describe('Trying to create a container with the same name of a paused one', function() {
    let md, md2;
    let db, db2;

    before('Create a container', async function() {
      md = new Mongodoki();
      db = await md.getDB();
      const { container } = await (md as any).getContainer();
      should.exist(container);
      await container.pause();
    });

    it('Should be OK', async function() {
      md2 = new Mongodoki();
      db2 = await md2.getDB();
      db2.should.be.ok;
    });

    after('Stop and Remove the containers', async function() {
      await md2.stop();
      await md2.remove();
      return;
    });
  });

  describe('Trying to create a container with the same name of a stopped one', function() {
    let md, md2;
    let db, db2;

    before('Create a container', async function() {
      md = new Mongodoki();
      db = await md.getDB();
      await md.stop();
    });

    it('Should be OK', async function() {
      md2 = new Mongodoki();
      db2 = await md2.getDB();
      db2.should.be.ok;
    });

    after('Stop and Remove the containers', async function() {
      await md2.stop();
      await md2.remove();
      return;
    });
  });

  describe('Pulling a wrong image tag', function() {
    let md;
    let db;

    before('Create a container', async function() {
      md = new Mongodoki({ tag: 'chewbacca' });
    });

    it('Pulling the image should throw an Error', function() {
      return md.getDB('latest', 60000).should.be.rejected;
    });
  });

  // Volumes
  describe('Creating a container with a persistent volume', function() {
    let md;
    const path = './temp/mongodoki';
    it('Should initialize volume properties', async function() {
      md = new Mongodoki({ containerName: 'doki-wVol', volume: { hostDir: path, containerDir: '/data/db' } });
      md.opts.tag.should.equal('latest');
      md.opts.containerName.should.equal('doki-wVol');
      md.opts.ports[0].host.should.equal(27017);
      md.opts.volume.should.be.ok;
      md.opts.volume.hostDir.should.equal(path);
      md.opts.volume.containerDir.should.equal('/data/db');
    });
  });

  describe('Creating a container with a persistent volume', function() {
    let md, md2;
    let db, db2;
    let thing = {
      type: 'lamp',
      isOn: true
    };
    const path = `${process.cwd()}/test/testdb`;
    before('Create a container', async function() {
      // Create a dir to link to volume
      utils.createDirSync(path);
      md = new Mongodoki({ containerName: 'doki-wVol', volume: { hostDir: path, containerDir: '/data/db' } });
      db = await md.getDB('mongodokiTest');
      //save some data to persist
      let coll = await db.collection('things');
      let res = await coll.insertOne(thing);
      return;
    });

    it('a new container should access to same persistent volume and inserted data should be the same', async function() {
      md2 = new Mongodoki({ containerName: 'doki-wVol', volume: { hostDir: path, containerDir: '/data/db' } });
      db2 = await md2.getDB('mongodokiTest');
      db2.should.be.ok;
      //check data
      let coll = await db2.collection('things');
      let data = await coll.findOne({});
      data.should.be.ok;
      data.type.should.equal(thing.type);
      data.isOn.should.equal(thing.isOn);
    });

    after('Stop and Remove the containers', async function() {
      await md2.stop();
      await md2.remove();
      return;
    });
  });

  describe('Creating a container and importing a MongoDB DUMP', function() {
    let md;
    let db;

    before('Start container', async function() {
      md = new Mongodoki({ containerName: 'restoredMongo' });
      db = await md.getDB('testRestoreDB', 240000, './test/testdump');
      return db;
    });

    it('container should start, restore a DB and Things collection return data', async function() {
      db.should.be.ok;
      let coll = await db.collection('things');
      let data = await coll.findOne({});
      data.should.have.property('type');
      data.should.have.property('status');
      //await db.close();
      return data;
    });

    after('Stop and Remove container', async function() {
      await md.stop();
      await md.remove();
      return;
    });
  });

  describe('Creating a container and importing a MongoDB dump from a WRONG directory', function() {
    let md;
    let db;

    before('Start container', async function() {
      md = new Mongodoki({ containerName: 'restoredMongo' });
      return md;
    });

    it('container should start, but an error should occur', async function() {
      return md.getDB('testRestoreDB', 60000, './test/blackholesun').should.be.rejected;
    });

    after('Stop and Remove container', async function() {
      await md.stop();
      await md.remove();
      return;
    });
  });

  describe.skip('Creating a container and importing a MongoDB dump with too low timeout', function() {
    let md;
    let db;

    before('Start container', async function() {
      md = new Mongodoki({ containerName: 'restoredMongo' });
      return md;
    });

    it('container should start, but an error should occur', async function() {
      return md.getDB('testRestoreDB', 1, './test/testdump').should.be.rejected;
    });

    after('Stop and Remove container', async function() {
      await md.stop();
      await md.remove();
      return;
    });
  });

  describe('Creating a container in REUSE MODE and importing a MongoDB DUMP', function() {
    let md;
    let db;
    let nDocs;

    before('Start container', async function() {
      //start a db and impotrt data
      md = new Mongodoki({ containerName: 'restoredMongo' });
      db = await md.getDB('testRestoreDB', 240000, './test/testdump');
      //Add some new data
      let coll = await db.collection('things');
      nDocs = await coll.countDocuments({});
      coll.insertOne({ type: 'NEW_TYPE', status: 'ON' });
      //await db.close();
      await md.stop();
      return db;
    });

    it('container should start, NOT restore the DB and Things collection return updated data', async function() {
      md = new Mongodoki({ containerName: 'restoredMongo', reuse: true });
      db = await md.getDB('testRestoreDB', 240000, './test/testdump');
      let coll = await db.collection('things');
      const newCount = await coll.countDocuments({});
      newCount.should.be.equal(nDocs + 1);
      let data = await coll.findOne({ type: 'NEW_TYPE' });
      data.should.have.property('type');
      data.should.have.property('status');
      //await db.close();
      return data;
    });

    after('Stop and Remove container', async function() {
      await md.stop();
      await md.remove();
      return;
    });
  });
});
