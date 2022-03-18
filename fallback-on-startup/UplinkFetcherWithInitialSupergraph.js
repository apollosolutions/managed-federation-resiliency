import { UplinkFetcher } from "@apollo/gateway";

export class UplinkFetcherWithInitialSupergraph extends UplinkFetcher {
  /**
   * @param {import('@apollo/gateway').UplinkFetcherOptions & { initialSupergraphSdl: () => Promise<string> }} options
   */
  constructor(options) {
    super(options);
    this.initialSupergraphSdl = options.initialSupergraphSdl;
  }

  // Almost a direct copy-paste of the original method.

  async initialize({ update, healthCheck }) {
    this.update = update;

    if (this.config.subgraphHealthCheck) {
      this.healthCheck = healthCheck;
    }

    // Here is the new behavior: instead of defaulting to null, we're now
    // defaulting to a cached supergraph from a ConfigMap or cloud storage.
    //
    // If this fails, the error will bubble up and cause the whole gateway to
    // fail to start.
    let initialSupergraphSdl = await this.initialSupergraphSdl();
    try {
      const result = await this.updateSupergraphSdl();
      initialSupergraphSdl = result?.supergraphSdl || null;
      if (result?.minDelaySeconds) {
        this.minDelayMs = 1000 * result?.minDelaySeconds;
        this.earliestFetchTime = new Date(Date.now() + this.minDelayMs);
      }
    } catch (e) {
      this.logUpdateFailure(e);
      // Don't re-throw here — we have a fallback supergraph ready to go, so
      // we can let the gateway start up and start polling uplink later.
      // throw e;
    }

    this.beginPolling();

    return {
      supergraphSdl: initialSupergraphSdl,
      cleanup: async () => {
        if (this.state.phase === "polling") {
          await this.state.pollingPromise;
        }
        this.state = { phase: "stopped" };
        if (this.timerRef) {
          clearTimeout(this.timerRef);
          this.timerRef = null;
        }
      },
    };
  }
}
