import { exec } from 'child_process';
import { getLogger } from 'debuggo';
import { Db, MongoClient } from 'mongodb';
import * as path from 'path';
import { TestDoki, TestDokiOptions } from './doki';

export { Db } from 'mongodb';

export class MongoDoki extends TestDoki {
  constructor(protected opts: TestDokiOptions = {}) {
    super(opts, getLogger('mongodoki'));
    if (!this.opts.image) {
      this.opts.image = 'mongo';
    }
    if (!this.opts.ports) {
      this.opts.ports = [{ host: 27017 }];
    }
  }

  /**
   * Start a mongo container, connect to a db and return a Promise for a mongo driver Db instance.
   * @param containerName
   * @param dbName
   * @param timeout
   * @param dbDumpPath
   */
  async getDB(dbName: string = 'local', timeout: number = 60000, dbDumpPath?: string): Promise<Db> {
    const MAX_RETRIES = 60;

    if (!this.opts.reuse) {
      await this.createAndStart();
    } else {
      await this.start();
    }

    let db: Db | undefined = undefined;
    let retries = 0;
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    while (!db && retries <= MAX_RETRIES) {
      try {
        const port = this.opts.ports && this.opts.ports.length ? this.opts.ports[0].host : 27017;
        const client = await MongoClient.connect(`mongodb://127.0.0.1:${port}`, { useUnifiedTopology: true });
        db = client.db(dbName);
      } catch (error) {
        this.logger.error('ERROR connecting... retrying');
        this.logger.debug('retries:' + retries);
        const t = Math.round(timeout / MAX_RETRIES);
        await wait(t === 0 ? 2 : t);
        retries += 1;
      }
    }
    try {
      this.logger.debug('Trying to restore a db...');
      if (!this.opts.reuse && dbDumpPath) await this.importDBData(dbDumpPath, timeout);
    } catch (error) {
      this.logger.error('Error restoring db');
      throw error;
    }
    if (!db) {
      throw new Error(`Unable to connect to ${dbName} DB on the ${this.opts.containerName} container.`);
    } else {
      this.logger.debug('All is OK. Done.');
      return db;
    }
  }

  /**
   * Import DB dump data through mongorestore
   * @param dumpDirPath
   * @param timeout
   */
  private async importDBData(dumpDirPath: string, timeout: number = 60000): Promise<any> {
    const normalizedPath = path.normalize(dumpDirPath);
    return new Promise((resolve, reject) => {
      exec(`docker cp ${normalizedPath} ${this.opts.containerName}:/dbdata`, async (err, stdout, stderr) => {
        if (err) reject(err);
        else {
          console.log(` Running mongorestore on container (${this.opts.containerName}) for data in ${normalizedPath}`);
          const options = {
            Cmd: ['mongorestore', '/dbdata'],
            AttachStdout: true,
            AttachStderr: true,
            Tty: true
          };
          try {
            const MAX_RETRIES = 30;
            let maxWaits = MAX_RETRIES;
            const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
            const { container } = await this.getContainer();
            if (container) {
              const cmd = await container.exec(options);
              const restore = await cmd.start();
              let status = await cmd.inspect();
              while (status.Running && maxWaits > 0) {
                await wait(timeout / MAX_RETRIES);
                maxWaits -= 1;
                status = await cmd.inspect();
              }
              if (maxWaits > 0) {
                resolve(restore);
              } else {
                reject(new Error('Restoring DB is taking too much time. Try increasing timeout'));
              }
            } else {
              throw new Error('no container');
            }
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }
}

// Backwards compatibility
export const Mongodoki = MongoDoki;
export type DokiConfiguration = TestDokiOptions;
