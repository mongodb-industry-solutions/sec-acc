type Env = Record<string, string | undefined>;

/** Names each invalid variable. Never echoes values. */
export class ConfigError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid configuration:\n- ${problems.join('\n- ')}`);
  }
}

export class ServerConfig {
  static readonly DEFAULT_PORT = 3001;

  private constructor(
    readonly host: string,
    readonly port: number,
  ) {}

  static fromEnv(env: Env): ServerConfig {
    const problems: string[] = [];

    let port = ServerConfig.DEFAULT_PORT;
    if (env.PORT?.trim()) {
      port = Number(env.PORT);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        problems.push('PORT must be an integer between 1 and 65535');
      }
    }

    // Loopback by default: exposing the API is a deliberate deployment decision.
    const host = env.HOST?.trim() || '127.0.0.1';
    if (problems.length > 0) throw new ConfigError(problems);
    return new ServerConfig(host, port);
  }
}
