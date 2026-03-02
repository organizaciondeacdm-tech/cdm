import { RemoteFormEngineAdapter } from '../../infrastructure/adapters/remoteFormEngineAdapter';
import { SessionFormEngineAdapter } from '../../infrastructure/adapters/sessionFormEngineAdapter';

export class DataSourceStrategy {
  constructor() {
    this.remote = new RemoteFormEngineAdapter();
    this.local = new SessionFormEngineAdapter();
  }

  async resolve() {
    try {
      await this.remote.listTemplates();
      return this.remote;
    } catch {
      return this.local;
    }
  }
}
