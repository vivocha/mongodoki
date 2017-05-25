import * as Docker from 'dockerode';
import * as Debug from 'debug';

const { MongoClient } = require('mongodb');

const debug = Debug('Mongodoki:main');
const docker = new Docker();


export interface Volume {
    hostDir: string;
    containerDir: string
}
export interface DokiConfiguration {
    tag: string;
    containerName: string;
    hostPort: number;
    volume?: Volume;
}

export class Mongodoki {
    tag: string = 'latest';
    containerName: string = 'mongodoki';
    hostPort: number = 27017;
    volume?: Volume;
    image: any;
    container: any;

    constructor(config: DokiConfiguration = { tag: 'latest', containerName: 'mongodoki', hostPort: 27017 }) {
        this.tag = config.tag || 'latest';
        this.containerName = config.containerName || 'mongodoki';
        this.hostPort = config.hostPort || 27017;
        if (config.volume) this.volume = config.volume;
    };
    /**
     * Start a mongo container, connect to a db and return a Promise for a mongo driver Db instance.
     * @param containerName 
     * @param dbName 
     * @param timeout 
     */
    async getDB(dbName: string = 'local', timeout: number = 60000): Promise<any> {
        const MAX_RETRIES = 30;
        try {
            let c = docker.getContainer(this.containerName);
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
        let config = {
            Image: 'mongo',
            name: this.containerName,
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
        };
        if (this.volume) {
            let binds = [`${this.volume.hostDir}:${this.volume.containerDir}`];
            config.HostConfig['Binds'] = binds;
        }
        this.container = await docker.createContainer(config);
        debug('Container created. Starting it...');
        await this.container.start();

        let db = null;
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
                debug('ERROR connecting... retrying');
                debug('retries:'+retries);
                await wait(Math.round(timeout / MAX_RETRIES));
                retries += 1;
            }
        }
        console.log('DB is:', db);
        if (!db) throw new Error('Unable to connect to DB on the container.');
        else return db;
    }

    /**
     * Stop the container
     */
    async stop(): Promise<Mongodoki> {
        await this.container.stop();
        return this;
    }
    /**
     * Remove the container and prune all the unused Docker Volumes
     * on host machine.
     */
    async remove(): Promise<Mongodoki> {
        await this.container.remove();
        await docker.pruneVolumes();
        return this;
    }

    /**
     * Stop and remove the container, see stop() and remove()
     */
    async stopAndRemove(): Promise<Mongodoki> {
        await this.container.stop();
        await this.container.remove();
        return this;
    }

}



