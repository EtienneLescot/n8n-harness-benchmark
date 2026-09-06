import fs from 'node:fs';
import path from 'node:path';

/**
 * Exports benchmark results into structured, machine-readable JSON.
 */
export class JsonReporter {
  static writeReport(results, outputPath = './benchmark/reports/benchmark_results.json') {
    const resolvedPath = path.resolve(outputPath);
    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(resolvedPath, JSON.stringify(results, null, 2), 'utf8');
    return resolvedPath;
  }
}
