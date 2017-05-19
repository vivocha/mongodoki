import * as Docker from 'dockerode';
import * as Debug from 'debug';

const { MongoClient } = require('mongodb');

const debug = Debug('Mongodoki:main');
const docker = new Docker();
const MAX_RETRIES = 30;

export class Mongodoki {
    image;
    container;
    constructor(protected tag: string = 'latest', protected hostPort: number = 27017) {
    };
    /**
     * Start a mongo container, connect to a db and return a Promise for a mongo driver Db instance.
     * @param containerName 
     * @param dbName 
     * @param timeout 
     */
    async getDB(containerName: string = 'mongodoki-container', dbName: string = 'local', timeout: number = 60000): Promise<any> {
        try {
            let c = docker.getContainer(containerName);
            let info = await c.inspect();
            if (info && info.State.Running) {
                if (info.State.Paused) await c.unpause();
                await c.stop();
            }
            await c.remove();
        } catch (error) {
            debug(error);
        }


        this.image = await new Promise((resolve, reject) => {

            docker.pull(`mongo:${this.tag}`, {}, (err, stream) => {
                if (err) reject(err);
                else {
                    docker.modem.followProgress(stream, onFinished, onProgress);
                    function onProgress(event) {
                        debug(event);
                    }
                    function onFinished(err, output) {
                        if (err) reject(err);
                        else resolve(output);
                    }
                }
            });
        });
        debug('image pulled.');
        debug('Creating mongo container');
        this.container = await docker.createContainer({
            Image: 'mongo',
            name: containerName,
            AttachStdin: false,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            ExposedPorts: { '27017/tcp': {} },
            HostConfig: {
                PortBindings: { '27017/tcp': [{ HostIp: '127.0.0.1', HostPort: `${this.hostPort}` }] }
            },
            OpenStdin: false,
            StdinOnce: false
        });
        debug('Container created. Starting it...');
        await this.container.start();

        let db;
        let retries = 0;
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        while (!db && retries <= MAX_RETRIES) {
            try {
                db = await MongoClient.connect(`mongodb://127.0.0.1:${this.hostPort}/${dbName}`, {
                    autoReconnect: true,
                    reconnectTries: 1000,
                    reconnectInterval: 1000
                });
            } catch (error) {
                debug('ERROR connecting... retrying')
                await wait(timeout / MAX_RETRIES);
                retries += 1;
            }
        }

        if (!db) throw new Error('Unable to connect to DB on the container.')
        return db;
    }

    /**
     * Stop the container
     */
    async stop(): Promise<Mongodoki> {
        await this.container.stop();
        return this;
    }
    /**
     * remove the container and prune all the Docker Volumes
     */
    async remove(): Promise<Mongodoki> {
        await this.container.remove();
        await docker.pruneVolumes();
        return this;
    }

    /**
     * Stop and remove the comtainer, see stop() and remove()
     */
    async stopAndRemove(): Promise<Mongodoki> {
        await this.container.stop();
        await this.container.remove();
        return this;
    }

}



