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

    // Copy rubric if available
    const rubricSource = options.rubricPath || path.resolve('./skills/benchmark-n8n-workflow-creation/references/EVALUATION_RUBRIC.md');
    if (fs.existsSync(rubricSource)) {
      const rubricDestDir = path.join(sandbox.sandboxPath, 'references');
      fs.mkdirSync(rubricDestDir, { recursive: true });
      fs.copyFileSync(rubricSource, path.join(rubricDestDir, 'EVALUATION_RUBRIC.md'));
    }

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
