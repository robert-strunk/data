/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import { ReadStream } from 'fs';
import { flags, FlagsConfig } from '@salesforce/command';
import { Connection, fs, Messages, SfdxError } from '@salesforce/core';
import { Job } from 'jsforce';
import { Batcher, BulkResult } from '../../../../batcher';
import { DataCommand } from '../../../../dataCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-data', 'bulk.upsert');

export default class Upsert extends DataCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    externalid: flags.string({
      char: 'i',
      description: messages.getMessage('flags.externalid'),
      required: true,
    }),
    csvfile: flags.string({
      char: 'f',
      description: messages.getMessage('flags.csvfile'),
      required: true,
    }),
    sobjecttype: flags.string({
      char: 's',
      description: messages.getMessage('flags.sobjecttype'),
      required: true,
    }),
    wait: flags.number({
      char: 'w',
      description: messages.getMessage('flags.wait'),
      min: 0,
    }),
  };

  public async run(): Promise<BulkResult[]> {
    let result: BulkResult[];

    try {
      await this.throwIfFileDoesntExist(this.flags.csvfile);
      const conn: Connection = this.org.getConnection();
      this.ux.startSpinner('Bulk Upsert');
      const csvStream: ReadStream = fs.createReadStream(this.flags.csvfile);

      const job: Job = conn.bulk.createJob(this.flags.sobjecttype, 'upsert', {
        extIdField: this.flags.externalid,
        concurrencyMode: 'Parallel',
      });

      const batcher: Batcher = new Batcher(conn, this.ux);
      result = await batcher.createAndExecuteBatches(job, csvStream, this.flags.sobjecttype, this.flags.wait);

      this.ux.stopSpinner();
    } catch (e) {
      this.ux.stopSpinner('error');
      throw SfdxError.wrap(e);
    }

    return result;
  }
}