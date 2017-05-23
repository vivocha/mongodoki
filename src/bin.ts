#!/usr/bin/env node
import * as program from 'commander';
import * as doki from './index';

program
  .version(require('../package.json').version)
  .description('Run and manage MongoDB as a Docker Container.');

program
  .command('start')
  .description('Run MongoDb as Docker container')
  .option('-t, --tag <tag>', 'Tag of the MongoDB Docker Image to instantiate (default: latest)', 'latest')
  .option('-n, --name <name>', 'Give a name to the container (default: mongodoki)', 'mongodoki')
  .option('-p, --port <port>', 'Assign host (localhost) port at which MongoDB instance will be available (default: 27017)', 27017)
  .option('-d, --dbname <db>', 'Database name to create (default: testDB', 'testDB')
  .option('-D, --dbdata <path>', 'Absolute path on the local host machine to use as persistent DB data, directory must be included in Docker File Sharing preferences')
  .action((program) => {
    console.log('\n\nRunning mongodoki. Could take some time, please wait... ');
    console.log(`Creating a container from Docker image mongo:${program.tag ? program.tag : 'latest'}, configuration is:\n`);

    const config = {
      tag: program.tag,
      containerName: program.name,
      hostPort: program.port      
    };
    console.log('  - container name:', program.name);
    console.log('  - container/db local port:', program.port);
    console.log('  - database name:', program.dbname);
    if (program.dbdata) {
      console.log('  - database path:', program.dbdata);
      config['volume'] = {
        hostDir: program.dbdata, 
        containerDir: '/data/db'
      }
    }; 
    const mongodoki = new doki.Mongodoki(config);
    mongodoki.getDB(program.dbname).then( () => {
      console.log('Container started.');
      process.exit(0);
    });
  });


program
  .command('stop <container>')
  .description('Stop and remove an existing container')
  .usage('<container>')
  .action((container) => {
    console.log('Stopping container: ', container);
    const mongodoki = new doki.Mongodoki({ tag: 'latest', containerName: container, hostPort: 27017 });
    mongodoki.getDB()
    .then(() => mongodoki.stopAndRemove())
    .then(() => process.exit(0))
    .catch((err) => {
      console.log('ERROR stopping container. Use docker stop command');
      process.exit(1)
    });
  });

program.parse(process.argv);

if (!(process.argv.length >= 3 && ['start', 'stop'].includes(process.argv[2]))) {
  console.log('No command specified. Run: mongodoki --help');
}





console.log('\n');



