import fs from 'node:fs';
import path from 'node:path';

/**
 * Manages isolated sandboxes for benchmark runs.
 * Each tool run gets its own pristine directory to avoid side-effects or cache leaks.
 */
export class SandboxManager {
  constructor(options = {}) {
    this.baseDir = path.resolve(options.baseDir || './benchmark/sandboxes');
    this.cleanUpOnFinish = Boolean(options.cleanUpOnFinish);
  }

  ensureBaseDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  createSandbox(toolName, runId = null) {
    this.ensureBaseDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeToolName = toolName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const id = runId || `run_${timestamp}_${safeToolName}`;
    const sandboxPath = path.join(this.baseDir, id);

    if (!fs.existsSync(sandboxPath)) {
      fs.mkdirSync(sandboxPath, { recursive: true });
    }

    // Create subdirectories for workflows and logs
    const workflowsDir = path.join(sandboxPath, 'workflows');
    const logsDir = path.join(sandboxPath, 'logs');
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.mkdirSync(logsDir, { recursive: true });

    return {
      runId: id,
      toolName,
      sandboxPath,
      workflowsDir,
      logsDir,
      createdAt: new Date().toISOString(),
    };
  }

  initSandbox(toolName, runId = null, options = {}) {
    const sandbox = this.createSandbox(toolName, runId);

    // The rubric is deliberately NOT seeded into the sandbox. A worker that can read how it
    // is graded optimises for the grader: every builder sandbox from run_1 to run_9 carried
    // EVALUATION_RUBRIC.md at its root, so both branches could read "0 orphaned nodes" and
    // "valid nodes / total nodes" and shape a minimal graph to satisfy them. Scoring
    // documents stay in the repository, outside every sandbox.

    // Write partitioned or provided .env
    if (options.envContent) {
      fs.writeFileSync(path.join(sandbox.sandboxPath, '.env'), options.envContent, 'utf8');
    }

    return sandbox;
  }

  writeArtifact(sandbox, filename, content) {
    const filePath = path.join(sandbox.sandboxPath, filename);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8');
    return filePath;
  }

  readArtifact(sandbox, filename) {
    const filePath = path.join(sandbox.sandboxPath, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf8');
  }

  cleanSandbox(sandbox) {
    if (this.cleanUpOnFinish && fs.existsSync(sandbox.sandboxPath)) {
      fs.rmSync(sandbox.sandboxPath, { recursive: true, force: true });
    }
  }
}
