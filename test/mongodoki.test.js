const { Mongodoki } = require('../dist/index');
const chai = require('chai');
const should = chai.should();
const chaiAsPromised = require('chai-as-promised');
const MongoClient = require('mongodb').MongoClient;

chai.use(chaiAsPromised);

describe('Mongodoki', function () {
    describe('Mongodoki class', function () {

        it('constructor by default should init hostPort and Tag members', function () {
            const md = new Mongodoki();
            md.tag.should.equal('latest');
            md.hostPort.should.equal(27017);
        });

        it('constructor by default should init hostPort', function () {
            const md = new Mongodoki('atag');
            md.tag.should.equal('atag');
            md.hostPort.should.equal(27017);
        });

        it('constructor by default should init atag and set the right port', function () {
            const md = new Mongodoki(undefined, 22222);
            md.tag.should.equal('latest');
            md.hostPort.should.equal(22222);
        });
    });

    describe('Starting the MongoDB container', function () {
        let md;
        let db;

        before('Start container', async function() {
            md = new Mongodoki();
            db = await md.getDB('mongodoki','local');            
           
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
             return md.getDB('mongodoki', 'latest', 500).should.be.rejected;
        });      

        after('Stop and Remove container', async function() {
            await md.stop();    
            await md.remove();
            return;        
        });        
    });

    describe('Trying to create a container with the same name of a running one', function () {
        let md, md2;
        let db, db2;

        before('Create a container', async function() {
            md = new Mongodoki();     
            db = await md.getDB('mongodoki', 'latest');
        });

        it('Should be OK', async function() {  
            md2 = new Mongodoki();     
            db2 = await md2.getDB('mongodoki', 'latest');
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
            db = await md.getDB('mongodoki', 'latest');
            await md.container.pause();
        });

        it('Should be OK', async function() {  
            md2 = new Mongodoki();     
            db2 = await md2.getDB('mongodoki', 'latest');
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
            db = await md.getDB('mongodoki', 'latest');
            await md.stop();
        });

        it('Should be OK', async function() {  
            md2 = new Mongodoki();     
            db2 = await md2.getDB('mongodoki', 'latest');
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
            md = new Mongodoki('chewbacca');     
           
        });

        it('Pulling the image should throw an Error', function() {             
             return md.getDB('mongodoki', 'test', 60000).should.be.rejected;
        });        
    });
});