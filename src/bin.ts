#!/usr/bin/env node
import { program } from 'commander';
import * as doki from './index';
const ora = require('ora');

program.version(require('../package.json').version).description('Run and manage MongoDB as a Docker Container.');

program
  .command('start')
  .description('Run MongoDb as Docker container')
  .option('-t, --tag <tag>', 'Tag of the MongoDB Docker Image to instantiate (default: latest)', 'latest')
  .option('-n, --name <name>', 'Set a name to the container (default: mongodoki)', 'mongodoki')
  .option('-p, --port <port>', 'Assign host (localhost) port at which MongoDB instance will be available (default: 27017)', '27017')
  .option('-r, --reuse', 'reuse a container, if exists')
  .option('-d, --dbname <db>', 'Database name to create (default: testDB)', 'testDB')
  .option(
    '-D, --dbdata <path>',
    'Persist DB on the local host. Specify the absolute path on the local host machine to use as persistent DB, directory must be included in Docker File Sharing preferences'
  )
  .option('-i, --import <path>', 'Import DB data from specified (absolute) path directory. Data files must be produced by mongodump tool')
  .option('-T, --timeout <ms>', 'Set the amount of time to wait for the container (in milliseconds)', '60000')
  .action((program) => {
    const opts = program.opts();
    console.log('\nRunning mongodoki. Could take some time, please wait... ');
    console.log(`Creating a container from Docker image mongo:${opts.tag ? opts.tag : 'latest'}, configuration is:\n`);
    const config = {
      tag: opts.tag,
      containerName: opts.name,
      hostPort: +opts.port,
      reuse: opts.reuse || false,
    };
    console.log('  - container name:', opts.name);
    console.log('  - container/db local port:', opts.port);
    console.log('  - reuse:', opts.reuse || false);
    console.log('  - database name:', opts.dbname);
    if (opts.dbdata) {
      console.log('  - database data local path:', opts.dbdata);
      config['volume'] = {
        hostDir: opts.dbdata,
        containerDir: '/data/db',
      };
    }
    if (opts.import) {
      console.log('  - restore data from:', opts.import);
    }
    console.log('  - timeout:', opts.timeout);
    console.log('');
    const spinner = ora({
      spinner: 'bouncingBar',
      text: 'Creating Container...',
    }).start();

    const mongodoki = new doki.MongoDoki(config);
    mongodoki
      .getDB(opts.dbname, +opts.timeout, opts.import)
      .then(() => {
        spinner.succeed('Container started');
        console.log('');
        process.exit(0);
      })
      .catch((err) => {
        spinner.fail('Unable to start the container');
        console.log(err);
        process.exit(1);
      });
  });

program
  .command('stop <container>')
  .description('Stop and remove an existing container')
  .usage('<container>')
  .action((container) => {
    console.log('');
    const spinner = ora({
      spinner: 'bouncingBar',
      text: `Stopping ${container} Container...`,
    }).start();

    const mongodoki = new doki.MongoDoki({ tag: 'latest', containerName: container, hostPort: 27017, reuse: false });
    mongodoki
      .getDB()
      .then(() => mongodoki.stopAndRemove())
      .then(() => {
        spinner.succeed('Container stopped');
        console.log('');
        process.exit(0);
      })
      .catch((err) => {
        spinner.fail('ERROR stopping container. Try using:  docker stop <container.name> command.');
        process.exit(1);
      });
  });

program.parse(process.argv);

if (!(process.argv.length >= 3 && ['start', 'stop'].includes(process.argv[2]))) {
  console.log('\nNo command specified. Run: mongodoki --help');
}
console.log('\n');
