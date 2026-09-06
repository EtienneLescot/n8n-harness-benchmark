import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates an interactive HTML Dashboard showcasing benchmark results
 * based on Option B: Ground-Truth n8n API Validation + Universal Minimax Scoring.
 */
export class DashboardReporter {
  static generateHtml(results) {
    const { n8nac = {}, nativeMcp = {}, metadata = {} } = results;
    const nScore = n8nac.scores || {};
    const mScore = nativeMcp.scores || {};
    const nAudit = n8nac.qualityAudit || {};
    const mAudit = nativeMcp.qualityAudit || {};
    const nTel = n8nac.rawMetrics || {};
    const mTel = nativeMcp.rawMetrics || {};

    const winner = (nScore.composite || 0) >= (mScore.composite || 0)
      ? 'n8n-as-code'
      : 'n8n Native MCP';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Benchmark Dashboard: n8n-as-code vs. n8n Native MCP</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --card-border: #1f2937;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --accent-n8nac: #3b82f6;
      --accent-mcp: #ec4899;
      --accent-win: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text-main);
      padding: 32px 20px;
      line-height: 1.5;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      text-align: center;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--card-border);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #1e293b;
      color: #38bdf8;
      margin-bottom: 12px;
      border: 1px solid #334155;
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      background: linear-gradient(135deg, #60a5fa, #a855f7, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .prompt-box {
      background: #1e293b;
      border-left: 4px solid var(--accent-n8nac);
      padding: 12px 18px;
      border-radius: 6px;
      margin: 20px auto;
      max-width: 800px;
      text-align: left;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      color: #cbd5e1;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .kpi-card.highlight {
      border-color: var(--accent-win);
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.05) 0%, var(--card-bg) 100%);
    }
    .kpi-title { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .kpi-value { font-size: 2rem; font-weight: 800; }
    .kpi-value.n8nac { color: var(--accent-n8nac); }
    .kpi-value.mcp { color: var(--accent-mcp); }
    .kpi-value.winner { color: var(--accent-win); }
    .kpi-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; }
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 36px;
    }
    @media (max-width: 800px) { .charts-grid { grid-template-columns: 1fr; } }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 24px;
    }
    .card-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; }
    .chart-container { position: relative; height: 320px; width: 100%; }
    .table-container { overflow-x: auto; margin-top: 16px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 12px 16px; border-bottom: 1px solid var(--card-border); }
    th { color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; font-weight: 600; }
    td { font-size: 0.95rem; }
    .winner-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-win);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">Antigravity Benchmark Suite • Option B Minimax & API Ground Truth</div>
      <h1>n8n-as-code vs. n8n Native MCP</h1>
      <p style="color: var(--text-muted);">Scientific evaluation on live instance <a href="${metadata.environment?.n8nInstance}" target="_blank" style="color: #60a5fa;">${metadata.environment?.n8nInstance}</a></p>
      <div class="prompt-box">
        <strong>Prompt:</strong> "Create on my n8n instance a multi-agent workflow that daily checks my Google emails and calendar, sorts the information, and presents an HTML daily briefing dashboard."
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi-card highlight">
        <div class="kpi-title">Overall Winner</div>
        <div class="kpi-value winner">${winner}</div>
        <div class="kpi-sub">Composite Score Delta: ${Math.abs((nScore.composite || 0) - (mScore.composite || 0)).toFixed(2)} pts</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">n8n-as-code Score</div>
        <div class="kpi-value n8nac">${nScore.composite ?? 0} <span style="font-size: 1rem; color: var(--text-muted);">/ 100</span></div>
        <div class="kpi-sub">Speed: ${nTel.totalDurationSec}s • Tokens: ${nTel.tokenUsage?.totalTokens}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Native MCP Score</div>
        <div class="kpi-value mcp">${mScore.composite ?? 0} <span style="font-size: 1rem; color: var(--text-muted);">/ 100</span></div>
        <div class="kpi-sub">Speed: ${mTel.totalDurationSec}s • Tokens: ${mTel.tokenUsage?.totalTokens}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Evaluation Model</div>
        <div class="kpi-value" style="font-size: 1.2rem; color: #a855f7; margin-top: 8px;">Deterministic</div>
        <div class="kpi-sub">Server validate_node_config + Minimax</div>
      </div>
    </div>

    <div class="charts-grid">
      <div class="card">
        <div class="card-title">Multi-Dimensional Minimax Comparison</div>
        <div class="chart-container">
          <canvas id="radarChart"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Normalized Dimension Scores (0 - 100)</div>
        <div class="chart-container">
          <canvas id="barChart"></canvas>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 32px;">
      <div class="card-title">Detailed Dimension & Ground-Truth API Breakdown</div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Weight</th>
              <th>n8n-as-code</th>
              <th>n8n Native MCP</th>
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Workflow Quality (API Ground Truth)</strong></td>
              <td>40%</td>
              <td>${nScore.workflowQuality ?? 0}/100 (${nAudit.scores?.nodeSchemaValidity ?? 0}% valid nodes)</td>
              <td>${mScore.workflowQuality ?? 0}/100 (${mAudit.scores?.nodeSchemaValidity ?? 0}% valid nodes)</td>
              <td><span class="winner-tag">${(nScore.workflowQuality || 0) >= (mScore.workflowQuality || 0) ? 'n8n-as-code' : 'Native MCP'}</span></td>
            </tr>
            <tr>
              <td><strong>2. Creation Time (Minimax)</strong></td>
              <td>25%</td>
              <td>${nScore.creationTime ?? 0}/100 (${nTel.totalDurationSec ?? 0}s)</td>
              <td>${mScore.creationTime ?? 0}/100 (${mTel.totalDurationSec ?? 0}s)</td>
              <td><span class="winner-tag">${(nScore.creationTime || 0) >= (mScore.creationTime || 0) ? 'n8n-as-code' : 'Native MCP'}</span></td>
            </tr>
            <tr>
              <td><strong>3. Token Efficiency (Minimax)</strong></td>
              <td>25%</td>
              <td>${nScore.tokenConsumption ?? 0}/100 (${nTel.tokenUsage?.totalTokens ?? 0} tokens)</td>
              <td>${mScore.tokenConsumption ?? 0}/100 (${mTel.tokenUsage?.totalTokens ?? 0} tokens)</td>
              <td><span class="winner-tag">${(nScore.tokenConsumption || 0) >= (mScore.tokenConsumption || 0) ? 'n8n-as-code' : 'Native MCP'}</span></td>
            </tr>
            <tr>
              <td><strong>4. Setup Time (Minimax)</strong></td>
              <td>10%</td>
              <td>${nScore.setupTime ?? 0}/100 (${nTel.setupTimeSec ?? 0}s)</td>
              <td>${mScore.setupTime ?? 0}/100 (${mTel.setupTimeSec ?? 0}s)</td>
              <td><span class="winner-tag">${(nScore.setupTime || 0) >= (mScore.setupTime || 0) ? 'n8n-as-code' : 'Native MCP'}</span></td>
            </tr>
            <tr style="background: rgba(255, 255, 255, 0.03); font-weight: 700;">
              <td>Overall Composite Score</td>
              <td>100%</td>
              <td>${nScore.composite ?? 0} / 100</td>
              <td>${mScore.composite ?? 0} / 100</td>
              <td><span class="winner-tag">${winner}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    // Radar Chart
    const radarCtx = document.getElementById('radarChart').getContext('2d');
    new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: ['Setup Time', 'Creation Time', 'Tokens', 'Node Validity', 'Workflow Quality'],
        datasets: [
          {
            label: 'n8n-as-code',
            data: [
              ${nScore.setupTime ?? 0},
              ${nScore.creationTime ?? 0},
              ${nScore.tokenConsumption ?? 0},
              ${nAudit.scores?.nodeSchemaValidity ?? 0},
              ${nScore.workflowQuality ?? 0}
            ],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            pointBackgroundColor: '#3b82f6',
          },
          {
            label: 'n8n Native MCP',
            data: [
              ${mScore.setupTime ?? 0},
              ${mScore.creationTime ?? 0},
              ${mScore.tokenConsumption ?? 0},
              ${mAudit.scores?.nodeSchemaValidity ?? 0},
              ${mScore.workflowQuality ?? 0}
            ],
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.2)',
            pointBackgroundColor: '#ec4899',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { color: '#9ca3af', backdropColor: 'transparent' },
            grid: { color: '#1f2937' },
            pointLabels: { color: '#cbd5e1', font: { size: 11, family: 'Inter' } }
          }
        }
      }
    });

    // Bar Chart
    const barCtx = document.getElementById('barChart').getContext('2d');
    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: ['Setup Time', 'Creation Time', 'Token Efficiency', 'Workflow Quality', 'Composite Score'],
        datasets: [
          {
            label: 'n8n-as-code',
            data: [
              ${nScore.setupTime ?? 0},
              ${nScore.creationTime ?? 0},
              ${nScore.tokenConsumption ?? 0},
              ${nScore.workflowQuality ?? 0},
              ${nScore.composite ?? 0}
            ],
            backgroundColor: '#3b82f6',
          },
          {
            label: 'n8n Native MCP',
            data: [
              ${mScore.setupTime ?? 0},
              ${mScore.creationTime ?? 0},
              ${mScore.tokenConsumption ?? 0},
              ${mScore.workflowQuality ?? 0},
              ${mScore.composite ?? 0}
            ],
            backgroundColor: '#ec4899',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: '#1f2937' },
            ticks: { color: '#9ca3af' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#9ca3af' }
          }
        }
      }
    });
  </script>
</body>
</html>
`;
  }

  static writeReport(results, outputPath = './benchmark/reports/benchmark_dashboard.html') {
    const html = this.generateHtml(results);
    const resolvedPath = path.resolve(outputPath);
    const parentDir = path.dirname(resolvedPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(resolvedPath, html, 'utf8');
    return resolvedPath;
  }
}
