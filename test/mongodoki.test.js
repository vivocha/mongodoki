const { Mongodoki } = require('../dist/index');
const chai = require('chai');
const should = chai.should();
const chaiAsPromised = require('chai-as-promised');
const MongoClient = require('mongodb').MongoClient;
const utils = require('./utils.js');

chai.use(chaiAsPromised);

describe('Mongodoki', function () {
    describe('Mongodoki class', function () {

        it('constructor by default should init hostPort and Tag members', function () {
            const md = new Mongodoki();
            md.tag.should.equal('latest');
            md.hostPort.should.equal(27017);
        });

        it('constructor by default should init hostPort', function () {
            const md = new Mongodoki( {
                tag:'aTag'
            } );
            md.tag.should.equal('aTag');
            md.hostPort.should.equal(27017);
        });

        it('constructor by default should init Tag and set the right port', function () {
            const md = new Mongodoki({hostPort: 22222});
            md.tag.should.equal('latest');
            md.hostPort.should.equal(22222);
        });
    });

    describe('Starting the MongoDB container', function () {
        let md;
        let db;

        before('Start container', async function() {
            md = new Mongodoki();
            db = await md.getDB();            
           
        });

        it('container should start and a connection to DB should be established', async function () {
            
            db.should.be.ok;
            // get
            const collections = await db.collections();
            collections.should.be.ok;
            await db.close(); 
                     
        });

        after('Stop and Remove container', async function() {
            await md.stopAndRemove();
            return;            
        });        
    });

    describe('Starting and stopping and removing the MongoDB container', function () {
        let md;
        let db;

        before('Start container', async function() {
            md = new Mongodoki();
            db = await md.getDB();            
           
        });

        it('container should start and a connection to DB should be established', async function () {
            
            db.should.be.ok;
            // get
            const collections = await db.collections();
            collections.should.be.ok;
            await db.close(); 
                     
        });

        after('Stop and Remove container', async function() {
            await md.stop();    
            await md.remove(); 
            return;       
        });        
    });

    describe('Testing timeouts', function () {
        let md;
        let db;

        before('Create a container', async function() {
            md = new Mongodoki();     
           
        });

        it('Starting a container with too low timeout should throw an Error', function() {             
             return md.getDB('local', 500).should.be.rejected;
        });      

        after('Stop and Remove container', async function() {
            await md.stop();    
            await md.remove();
            return;        
        });        
    });

    describe('Trying to create a container with the same name (default) of a running one', function () {
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

    describe('Trying to create a container with the same name of a running one', function () {
        let md, md2;
        let db, db2;

        before('Create a container', async function() {
            md = new Mongodoki({containerName: 'anotherAmazingMongo'});     
            db = await md.getDB();
        });

        it('Should be OK', async function() {  
            md2 = new Mongodoki({containerName: 'anotherAmazingMongo'});     
            db2 = await md2.getDB();
            db2.should.be.ok;
        });      

        after('Stop and Remove the containers', async function() {
            await md2.stop();    
            await md2.remove();
            return;      
        });        
    });

    describe('Trying to create a container with the same name of a paused one', function () {
        let md, md2;
        let db, db2;

        before('Create a container', async function() {
            md = new Mongodoki();     
            db = await md.getDB();
            await md.container.pause();
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

    describe('Trying to create a container with the same name of a stopped one', function () {
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

    describe('Pulling a wrong image tag', function () {
        let md;
        let db;

        before('Create a container', async function() {
            md = new Mongodoki({tag: 'chewbacca'});            
        });

        it('Pulling the image should throw an Error', function() {             
             return md.getDB('latest', 60000).should.be.rejected;
        });        
    });

    
    // Volumes
    describe('Creating a container with a persistent volume', function () {
        let md;
        const path = './temp/mongodoki';
        it('Should initialize volume properties', async function() {  
            md = new Mongodoki( {containerName: 'doki-wVol', volume: {hostDir: path, containerDir: '/data/db'}} );     
            md.tag.should.equal('latest');
            md.containerName.should.equal('doki-wVol');
            md.hostPort.should.equal(27017);
            md.volume.should.be.ok;
            md.volume.hostDir.should.equal(path);
            md.volume.containerDir.should.equal('/data/db');
        });      

               
    });

    describe('Creating a container with a persistent volume', function () {
        let md, md2;
        let db, db2;
        let thing = {
            type: 'lamp',
            isOn: true,
        };
        const path = `${process.cwd()}/test/testdb`;
        before('Create a container', async function() {
            // Create a dir to link to volume            
            utils.createDirSync(path);
            md = new Mongodoki( {containerName: 'doki-wVol', volume: {hostDir: path, containerDir: '/data/db'}} );     
            db = await md.getDB('mongodokiTest');
            //save some data to persist
            let coll = await db.collection('things');
            let res = await coll.insertOne(thing);
            return;           
        });

        it('a new container should access to same persistent volume and inserted data should be the same', async function() {  
            md2 = new Mongodoki( {containerName: 'doki-wVol', volume: {hostDir: path, containerDir: '/data/db'}} );    
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

});