/**
 * Centralized Metrics Collector for the Benchmark Harness.
 * Tracks wall-clock execution times, token usage, interaction friction,
 * tool calls, and computes normalized 0-100 scores.
 */
export class MetricsCollector {
  constructor(toolName, runId) {
    this.toolName = toolName;
    this.runId = runId;
    this.startTime = Date.now();
    this.phaseTimers = {};
    this.tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
    this.interactions = {
      turns: 0,
      toolCalls: 0,
      toolCallBreakdown: {},
      errors: 0,
      retries: 0,
    };
    this.frictionEvents = [];
    this.qualitativeRatings = {
      easeOfInstallation: null,
      easeOfUse: null,
      notes: '',
    };
    this.evaluation = null;
  }

  startPhase(phaseName) {
    this.phaseTimers[phaseName] = {
      start: Date.now(),
      elapsedMs: 0,
      completed: false,
    };
  }

  endPhase(phaseName) {
    if (this.phaseTimers[phaseName]) {
      this.phaseTimers[phaseName].elapsedMs = Date.now() - this.phaseTimers[phaseName].start;
      this.phaseTimers[phaseName].completed = true;
    }
  }

  recordTokens({ promptTokens = 0, completionTokens = 0, totalTokens = null }) {
    this.tokenUsage.promptTokens += promptTokens;
    this.tokenUsage.completionTokens += completionTokens;
    this.tokenUsage.totalTokens += totalTokens !== null ? totalTokens : (promptTokens + completionTokens);
  }

  recordTurn() {
    this.interactions.turns += 1;
  }

  recordToolCall(toolName) {
    this.interactions.toolCalls += 1;
    this.interactions.toolCallBreakdown[toolName] = (this.interactions.toolCallBreakdown[toolName] || 0) + 1;
  }

  recordError(errorMsg, phase = 'general') {
    this.interactions.errors += 1;
    this.frictionEvents.push({
      timestamp: new Date().toISOString(),
      phase,
      type: 'error',
      message: typeof errorMsg === 'string' ? errorMsg : errorMsg?.message || String(errorMsg),
    });
  }

  recordFriction(message, phase = 'general') {
    this.frictionEvents.push({
      timestamp: new Date().toISOString(),
      phase,
      type: 'friction',
      message,
    });
  }

  setQualitativeRatings(ratings) {
    if (ratings.easeOfInstallation !== undefined) {
      this.qualitativeRatings.easeOfInstallation = ratings.easeOfInstallation;
    }
    if (ratings.easeOfUse !== undefined) {
      this.qualitativeRatings.easeOfUse = ratings.easeOfUse;
    }
    if (ratings.notes) {
      this.qualitativeRatings.notes = ratings.notes;
    }
  }

  setEvaluation(evaluationResult) {
    this.evaluation = evaluationResult;
  }

  /**
   * Computes normalized scores (0-100) for the 5 benchmark metrics.
   */
  computeScores() {
    const totalDurationMs = Date.now() - this.startTime;
    const totalDurationSec = totalDurationMs / 1000;
    const totalTokens = this.tokenUsage.totalTokens;

    // 1. Ease of Installation (0-100)
    let installationScore = 80;
    const setupDurationSec = (this.phaseTimers['setup']?.elapsedMs || 0) / 1000;
    if (setupDurationSec > 0) {
      if (setupDurationSec < 30) installationScore += 15;
      else if (setupDurationSec < 60) installationScore += 10;
      else if (setupDurationSec > 180) installationScore -= 20;
    }
    const setupErrors = this.frictionEvents.filter(e => e.phase === 'setup').length;
    installationScore -= setupErrors * 15;
    if (this.qualitativeRatings.easeOfInstallation !== null) {
      installationScore = (installationScore + this.qualitativeRatings.easeOfInstallation) / 2;
    }
    installationScore = Math.max(0, Math.min(100, Math.round(installationScore)));

    // 2. Ease of Use (0-100)
    let easeOfUseScore = 85;
    if (this.interactions.turns > 4) easeOfUseScore -= (this.interactions.turns - 4) * 10;
    easeOfUseScore -= this.interactions.errors * 10;
    if (this.qualitativeRatings.easeOfUse !== null) {
      easeOfUseScore = (easeOfUseScore + this.qualitativeRatings.easeOfUse) / 2;
    }
    easeOfUseScore = Math.max(0, Math.min(100, Math.round(easeOfUseScore)));

    // 3. Token Consumption Score (0-100)
    // Baseline: 5,000 tokens gives 100, 25,000 tokens gives 0
    let tokenScore = 100;
    if (totalTokens > 5000) {
      tokenScore = Math.max(0, Math.min(100, Math.round(100 - (totalTokens - 5000) / 200)));
    }

    // 4. Creation Time Score (0-100)
    // Baseline: < 15 seconds gives 100, > 180 seconds degrades
    let timeScore = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, totalDurationSec - 15) / 1.65)));

    // 5. Workflow Quality Score (0-100)
    const qualityScore = this.evaluation?.totalScore || 0;

    // Composite Weighted Score
    // Weights: Install (20%), Ease of Use (20%), Tokens (15%), Time (15%), Quality (30%)
    const compositeScore = Math.round(
      installationScore * 0.20 +
      easeOfUseScore * 0.20 +
      tokenScore * 0.15 +
      timeScore * 0.15 +
      qualityScore * 0.30
    );

    return {
      scores: {
        easeOfInstallation: installationScore,
        easeOfUse: easeOfUseScore,
        tokenConsumption: tokenScore,
        creationTime: timeScore,
        workflowQuality: qualityScore,
        composite: compositeScore,
      },
      rawMetrics: {
        totalDurationMs,
        totalDurationSec: Number(totalDurationSec.toFixed(2)),
        phaseDurations: Object.fromEntries(
          Object.entries(this.phaseTimers).map(([k, v]) => [k, Math.round(v.elapsedMs)])
        ),
        tokenUsage: this.tokenUsage,
        interactions: this.interactions,
        frictionEventsCount: this.frictionEvents.length,
        frictionEvents: this.frictionEvents,
      },
    };
  }

  exportSummary() {
    const computed = this.computeScores();
    return {
      runId: this.runId,
      toolName: this.toolName,
      timestamp: new Date().toISOString(),
      ...computed,
      evaluation: this.evaluation,
    };
  }
}
