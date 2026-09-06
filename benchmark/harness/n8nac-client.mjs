import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execAsync = promisify(exec);

/**
 * Adapter for running n8n-as-code CLI commands within an isolated sandbox.
 */
export class N8nAcClient {
  constructor(options = {}) {
    this.cwd = options.cwd || process.cwd();
    this.cliCommand = options.cliCommand || 'n8nac';
    this.timeoutMs = options.timeoutMs || 60000;
  }

  async runCommand(subcommand, args = [], input = null) {
    const cmdStr = `${this.cliCommand} ${subcommand} ${args.join(' ')}`.trim();
    const startTime = Date.now();

    try {
      const child = exec(cmdStr, {
        cwd: this.cwd,
        timeout: this.timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (d) => { stdout += d.toString(); });
      child.stderr?.on('data', (d) => { stderr += d.toString(); });

      if (input !== null) {
        child.stdin?.write(input);
        child.stdin?.end();
      }

      const exitCode = await new Promise((resolve) => {
        child.on('close', resolve);
        child.on('error', () => resolve(1));
      });

      const elapsedMs = Date.now() - startTime;

      let parsedJson = null;
      try {
        parsedJson = JSON.parse(stdout.trim());
      } catch {
        // Not JSON output
      }

      return {
        command: cmdStr,
        exitCode,
        success: exitCode === 0,
        stdout,
        stderr,
        parsedJson,
        elapsedMs,
      };
    } catch (error) {
      return {
        command: cmdStr,
        exitCode: 1,
        success: false,
        stdout: '',
        stderr: error.message,
        elapsedMs: Date.now() - startTime,
      };
    }
  }

  async envStatus() {
    return this.runCommand('env status', ['--json']);
  }

  async envAdd(name, baseUrl, workflowsPath) {
    return this.runCommand('env add', [name, '--base-url', baseUrl, '--workflows-path', workflowsPath]);
  }

  async envAuthSet(name, apiKey) {
    return this.runCommand('env auth set', [name, '--api-key-stdin'], apiKey);
  }

  async envUse(name) {
    return this.runCommand('env use', [name]);
  }

  async updateAi() {
    return this.runCommand('update-ai', []);
  }

  async validate(workflowPath) {
    return this.runCommand('validate', [workflowPath]);
  }

  async push() {
    return this.runCommand('push', []);
  }
}
