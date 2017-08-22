import * as Docker from 'dockerode';
import * as Debug from 'debug';
import * as childp from 'child_process';
import * as path from 'path';
import * as util from 'util';

const exec = childp.exec;
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
     * @param dbDumpPath
     */
    async getDB(dbName: string = 'local', timeout: number = 60000, dbDumpPath?: string): Promise<any> {
        const MAX_RETRIES = 60;
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
            Tty: true,
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
                debug('retries:' + retries);
                await wait(Math.round(timeout / MAX_RETRIES));
                retries += 1;
            }
        }
        try {
            debug('trying to restore a db...')
            if (dbDumpPath) await this.importDBData(dbDumpPath, timeout);
        } catch (error) {
            debug('Error restoring db:')
            throw error;
        }
        if (!db) throw new Error('Unable to connect to DB on the container.');
        else {
            debug('All is ok');
            return db;
        }
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

    /**
     * Import DB dump data through mongorestore
     * @param dumpDirPath 
     * @param timeout 
     */
    private async importDBData(dumpDirPath: string, timeout: number = 60000): Promise<any> {
        const normalizedPath = path.normalize(dumpDirPath);
        return new Promise((resolve, reject) => {
            exec(`docker cp ${normalizedPath} ${this.containerName}:/dbdata`, async (err, stdout, stderr) => {
                if (err) reject(err);
                else {
                    console.log(` Running mongorestore on container (${this.containerName}) for data in ${normalizedPath}`);
                    const options = {
                        Cmd: ['mongorestore', '/dbdata'],
                        AttachStdout: true,
                        AttachStderr: true,
                        Tty: true,
                    };
                    try {
                        const MAX_RETRIES = 30;
                        let maxWaits = MAX_RETRIES;
                        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                        const cmd = await this.container.exec(options);
                        const restore = await cmd.start();
                        let status = await cmd.inspect();
                        while (status.Running && maxWaits > 0) {
                            await wait(timeout / MAX_RETRIES);
                            maxWaits -= 1;
                            status = await cmd.inspect();
                        }
                        if (maxWaits > 0) {
                            resolve(restore);
                        }
                        else {
                            reject(new Error('Restoring DB taking too much time. Try increasing timeout'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                }
            });
        });
    }
}





