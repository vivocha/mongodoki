import { getLogger, Logger } from 'debuggo';
import * as Docker from 'dockerode';

const docker = new Docker();

export interface Volume {
  hostDir: string;
  containerDir: string;
}
export interface TestDokiOptions {
  image?: string;
  tag?: string;
  containerName?: string;
  hostPort?: number;
  ports?: {
    host: number;
    container?: number;
  }[];
  reuse?: boolean;
  volume?: Volume;
}

export class TestDoki {
  static DEFAULT_TAG = 'latest';
  static DEFAULT_CONTAINER = 'testdoki';

  protected image: any;
  protected container: any;

  constructor(protected opts: TestDokiOptions = {}, protected logger: Logger = getLogger('testdoki')) {
    if (!this.opts.tag) this.opts.tag = TestDoki.DEFAULT_TAG;
    if (!this.opts.containerName) this.opts.containerName = TestDoki.DEFAULT_CONTAINER;
    if (this.opts.hostPort) {
      this.opts.ports = [{ host: opts.hostPort as number }];
      delete this.opts.hostPort;
    }
  }

  /**
   * Stop the container
   */
  async stop(): Promise<this> {
    if (!this.container) {
      throw new Error('no container');
    }
    await this.container.stop();
    return this;
  }
  /**
   * Remove the container and prune all the unused Docker Volumes
   * on host machine.
   */
  async remove(): Promise<this> {
    if (!this.container) {
      throw new Error('no container');
    }
    await this.container.remove();
    await docker.pruneVolumes();
    return this;
  }

  /**
   * Stop and remove the container, see stop() and remove()
   */
  async stopAndRemove(): Promise<this> {
    if (!this.container) {
      throw new Error('no container');
    }
    await this.container.stop();
    await this.container.remove();
    return this;
  }

  async start(): Promise<this> {
    this.logger.debug(`Starting the container, REUSE is ${!!this.opts.reuse}`);
    try {
      let c = docker.getContainer(this.opts.containerName as string);
      let info = await c.inspect();
      if (info && info.State.Running) {
        if (info.State.Paused) await c.unpause();
      } else if (info && !info.State.Running) {
        //container exists but it is not running, try to start it
        this.container = c;
        await this.container.start();
      }
      return this;
    } catch (error) {
      this.logger.error(error);
      //maybe container doesn't exist
      this.logger.info(`REUSE is ${!!this.opts.reuse} but container maybe doesn't exist. Creating it.`);
      return await this.createAndStart();
    }
  }

  protected async createAndStart(): Promise<this> {
    if (!this.opts.image) {
      this.logger.error("can't start, no image specified");
      throw new Error('no image');
    }
    this.logger.debug(`Re-creating and starting the container, REUSE is ${!!this.opts.reuse}`);
    try {
      let c = docker.getContainer(this.opts.containerName as string);
      let info = await c.inspect();
      if (info && info.State.Running) {
        if (info.State.Paused) await c.unpause();
        await c.stop();
      }
      await c.remove();
    } catch (error) {
      this.logger.error(error);
    }
    this.image = await this.pullImage();
    this.logger.debug('image pulled.');
    this.logger.debug('Creating mongo container');
    let config = {
      Image: `${this.opts.image}:${this.opts.tag}`,
      name: this.opts.containerName,
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      ExposedPorts: (this.opts.ports || []).reduce((o, i) => {
        o[`${i.container || i.host}/tcp`] = {};
        return o;
      }, {}),
      HostConfig: {
        PortBindings: (this.opts.ports || []).reduce((o, i) => {
          o[`${i.container || i.host}/tcp`] = [{ HostIp: '127.0.0.1', HostPort: `${i.host}` }];
          return o;
        }, {})
      },
      OpenStdin: false,
      StdinOnce: false
    };
    if (this.opts.volume) {
      let binds = [`${this.opts.volume.hostDir}:${this.opts.volume.containerDir}`];
      config.HostConfig['Binds'] = binds;
    }
    this.container = await docker.createContainer(config);
    this.logger.debug('Container created. Starting it...');
    await this.container.start();
    return this;
  }
  protected async pullImage() {
    return new Promise((resolve, reject) => {
      docker.pull(`${this.opts.image}:${this.opts.tag}`, {}, (err, stream) => {
        if (err) reject(err);
        else {
          docker.modem.followProgress(
            stream,
            /*onFinished*/ (err, output) => {
              if (err) {
                reject(err);
              } else {
                resolve(output);
              }
            },
            /*onProgress*/ event => {
              this.logger.debug(event);
            }
          );
        }
      });
    });
  }
}
