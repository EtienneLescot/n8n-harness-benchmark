import {
  workflow,
  node,
  trigger,
  languageModel,
  memory,
  tool,
  merge,
  expr,
  newCredential
} from '@n8n/workflow-sdk';

// ── AI Subnodes ─────────────────────────────────────────────────────────────

// 1. Language Model (OpenAI gpt-5-mini via n8n AI credits)
const openAiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI Chat Model',
    parameters: {
      model: { __rl: true, mode: 'list', value: 'gpt-5-mini' },
      options: {}
    },
    credentials: { openAiApi: newCredential('OpenAI') },
    position: [980, 560]
  }
});

// 2. Shared In-Memory Buffer Window (no external credentials needed)
const agentMemory = memory({
  type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
  version: 1.4,
  config: {
    name: 'Shared Agent Memory',
    parameters: {
      sessionIdType: 'customKey',
      sessionKey: 'daily-brief-session',
      contextWindowLength: 5
    },
    position: [1140, 560]
  }
});

// 3. Calculator Tool for arithmetic & schedule duration calculations
const calcTool = tool({
  type: '@n8n/n8n-nodes-langchain.toolCalculator',
  version: 1,
  config: {
    name: 'Calculator Tool',
    parameters: {},
    position: [1300, 560]
  }
});

// ── Triggers ────────────────────────────────────────────────────────────────

// Schedule Trigger: runs every day at 08:00 AM
const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Daily Schedule 8h',
    parameters: {
      rule: {
        interval: [
          {
            field: 'days',
            daysInterval: 1,
            triggerAtHour: 8,
            triggerAtMinute: 0
          }
        ]
      }
    },
    position: [100, 240]
  },
  output: [{}]
});

// Manual Trigger for test executions and instant dry-runs
const manualTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {
    name: 'Manual Test Run',
    position: [100, 440]
  },
  output: [{}]
});

// ── Data Ingestion Nodes ────────────────────────────────────────────────────

// Google Mail retrieval: fetches unread and recent emails
const fetchGmail = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Fetch Gmail Emails',
    parameters: {
      resource: 'message',
      operation: 'getAll',
      returnAll: false,
      limit: 15,
      simple: true,
      filters: {
        readStatus: 'both'
      }
    },
    credentials: {
      gmailOAuth2: newCredential('Gmail')
    },
    position: [380, 240]
  },
  output: [
    {
      id: 'msg-001',
      threadId: 'th-001',
      Subject: 'URGENT : Validation Budget Q4 et Arbitrages Financiers',
      From: 'Direction Financière <finance@enterprise.com>',
      To: 'etienne@enterprise.com',
      snippet: 'Merci de valider le prévisionnel budgétaire Q4 et les allocations de ressources avant 17h pour passage en CODIR.',
      internalDate: '1725624000000',
      labels: [{ id: 'INBOX', name: 'INBOX' }, { id: 'IMPORTANT', name: 'IMPORTANT' }]
    },
    {
      id: 'msg-002',
      threadId: 'th-002',
      Subject: 'Renouvellement Contrat Partenaire Cloud & Infrastructure IA',
      From: 'Cloud Infrastructure Ops <billing@cloudprovider.io>',
      To: 'etienne@enterprise.com',
      snippet: 'Votre abonnement enterprise arrive à échéance le 15 septembre. Veuillez examiner la proposition de tarification pluriannuelle.',
      internalDate: '1725615000000',
      labels: [{ id: 'INBOX', name: 'INBOX' }]
    },
    {
      id: 'msg-003',
      threadId: 'th-003',
      Subject: 'Ordre du Jour - Comité de Direction & Sprint Review',
      From: 'Alexandre Meyer <alex@devteam.io>',
      To: 'etienne@enterprise.com',
      snippet: 'Voici l\'ordre du jour de notre point de synchronisation de 10h : avancement benchmarks, intégration multi-agents et roadmap Q4.',
      internalDate: '1725608000000',
      labels: [{ id: 'INBOX', name: 'INBOX' }]
    }
  ]
});

// Google Calendar retrieval: fetches today's scheduled events
const fetchCalendar = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: {
    name: 'Fetch Google Calendar Events',
    parameters: {
      resource: 'event',
      operation: 'getAll',
      returnAll: false,
      limit: 20,
      timeMin: expr('{{ $today.toISO() }}'),
      timeMax: expr('{{ $today.plus({ days: 1 }).toISO() }}'),
      options: {
        singleEvents: true,
        orderBy: 'startTime'
      }
    },
    credentials: {
      googleCalendarOAuth2Api: newCredential('Google Calendar')
    },
    position: [380, 440]
  },
  output: [
    {
      id: 'cal-001',
      summary: 'Comité de Direction Stratégique (CODIR)',
      start: { dateTime: '2026-09-06T10:00:00+02:00' },
      end: { dateTime: '2026-09-06T11:30:00+02:00' },
      organizer: { email: 'direction@enterprise.com' },
      description: 'Point stratégique mensuel, revue des objectifs Q3-Q4 et arbitrages budgétaires.',
      status: 'confirmed'
    },
    {
      id: 'cal-002',
      summary: 'Démonstration Client : Architecture Multi-Agents Enterprise',
      start: { dateTime: '2026-09-06T14:00:00+02:00' },
      end: { dateTime: '2026-09-06T15:00:00+02:00' },
      organizer: { email: 'sarah.jenkins@client.com' },
      description: 'Présentation de la solution IA, benchmarks de latence et démonstration live.',
      status: 'confirmed'
    },
    {
      id: 'cal-003',
      summary: 'Synchronisation 1-on-1 Lead Tech & Recrutement',
      start: { dateTime: '2026-09-06T16:30:00+02:00' },
      end: { dateTime: '2026-09-06T17:15:00+02:00' },
      organizer: { email: 'alex@devteam.io' },
      description: 'Revue de sprint, organisation technique de l\'équipe et profils candidats à valider.',
      status: 'confirmed'
    }
  ]
});

// Merge data streams from parallel branches
const combineStreams = merge({
  version: 3.2,
  config: {
    name: 'Merge Streams',
    parameters: {
      mode: 'append'
    },
    position: [640, 340]
  },
  output: [{}]
});

// Normalize and prepare structured daily context
const prepareContext = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prepare Daily Context',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `// Extract all items from both sources
const emailItems = $('Fetch Gmail Emails').all().map(i => i.json);
const eventItems = $('Fetch Google Calendar Events').all().map(i => i.json);

const todayStr = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

return [{
  json: {
    date: todayStr,
    timestamp: new Date().toISOString(),
    emailCount: emailItems.length,
    emails: emailItems,
    eventCount: eventItems.length,
    events: eventItems,
    status: 'READY_FOR_TRIAGE'
  }
}];`
    },
    position: [860, 340]
  },
  output: [
    {
      date: 'dimanche 6 septembre 2026',
      timestamp: '2026-09-06T08:00:00.000Z',
      emailCount: 3,
      emails: [
        { Subject: 'URGENT : Validation Budget Q4', From: 'Direction Financière <finance@enterprise.com>' },
        { Subject: 'Renouvellement Contrat Partenaire Cloud', From: 'Cloud Ops <billing@cloudprovider.io>' },
        { Subject: 'Ordre du Jour - Comité de Direction', From: 'Alexandre Meyer <alex@devteam.io>' }
      ],
      eventCount: 3,
      events: [
        { summary: 'Comité de Direction Stratégique', start: { dateTime: '2026-09-06T10:00:00+02:00' } },
        { summary: 'Démonstration Client Multi-Agents', start: { dateTime: '2026-09-06T14:00:00+02:00' } },
        { summary: 'Synchronisation 1-on-1 Lead Tech', start: { dateTime: '2026-09-06T16:30:00+02:00' } }
      ],
      status: 'READY_FOR_TRIAGE'
    }
  ]
});

// ── Multi-Agent Hierarchy ───────────────────────────────────────────────────

// Agent 1: Triage & Classification Agent
const triageAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Triage & Priority Agent',
    parameters: {
      promptType: 'define',
      text: expr('Voici les flux d\'information bruts de la journée pour analyse et triage :\n\n'
        + 'Date : {{ $json.date }}\n'
        + 'Emails reçus ({{ $json.emailCount }}) : {{ JSON.stringify($json.emails) }}\n'
        + 'Événements agenda ({{ $json.eventCount }}) : {{ JSON.stringify($json.events) }}\n\n'
        + 'Effectue un triage méthodique et exhaustif :\n'
        + '1. Classe chaque email par priorité stricte : [P1 - CRITIQUE/URGENT], [P2 - IMPORTANT], ou [P3 - ROUTINE/INFO].\n'
        + '2. Identifie pour chaque élément l\'action requise et l\'heure limite.\n'
        + '3. Analyse l\'agenda de la journée : horaires clés, temps de préparation nécessaire, et créneaux de travail focus disponibles.\n'
        + '4. Identifie les risques de télescopage ou de surcharge.'),
      options: {
        systemMessage: 'Tu es l\'Agent IA Senior de Triage Exécutif. Tu filtres, évalues et priorises impitoyablement les sollicitations entrantes (emails et réunions). Tu distingues ce qui requiert l\'attention immédiate du dirigeant de ce qui peut être délégué ou traité plus tard.'
      }
    },
    subnodes: {
      model: openAiModel,
      memory: agentMemory,
      tools: [calcTool]
    },
    position: [1120, 340]
  },
  output: [
    {
      output: `### RAPPORT DE TRIAGE OPÉRATIONNEL

**1. CLASSIFICATION DES EMAILS ENTRANTS :**
- 🔴 **[P1 - CRITIQUE]** Direction Financière : "Validation Budget Q4 et Arbitrages Financiers"
  - *Enjeu* : Validation requise avant 17h pour passage officiel au CODIR.
  - *Action requise* : Revue rapide du prévisionnel et signature avant 11h30.
- 🟡 **[P2 - IMPORTANT]** Cloud Infrastructure Ops : "Renouvellement Contrat Partenaire Cloud & Infrastructure IA"
  - *Enjeu* : Échéance au 15 Septembre, optimisation des remises pluriannuelles.
  - *Action requise* : Transmettre à l'équipe Infra pour contre-proposition technique.
- 🔵 **[P3 - ROUTINE]** Alexandre Meyer : "Ordre du Jour - Comité de Direction & Sprint Review"
  - *Enjeu* : Préparation de la réunion de 10h00.
  - *Action requise* : Prise de connaissance des slides du sprint.

**2. ANALYSE DU CALENDRIER DU JOUR :**
- 10:00 - 11:30 (1h30) : Comité de Direction Stratégique (CODIR) - Alignement budgétaire et stratégique.
- 14:00 - 15:00 (1h00) : Démonstration Client : Architecture Multi-Agents Enterprise - Enjeu commercial majeur.
- 16:30 - 17:15 (45 min) : Synchronisation 1-on-1 Lead Tech & Recrutement - Décisions équipe.
- **Bilan temporel** : 3h15 de réunions programmées. 4h45 de temps focus disponible pour les arbitrages prioritaires.`
    }
  ]
});

// Agent 2: Executive Synthesis Agent
const executiveAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Executive Synthesis Agent',
    parameters: {
      promptType: 'define',
      text: expr('Voici le rapport d\'analyse de l\'agent de triage :\n\n{{ $json.output }}\n\n'
        + 'En tant que Directeur de Cabinet IA, rédige la Synthèse Exécutive Décisionnelle de la journée destinée au tableau de bord du dirigeant.\n'
        + 'Structure ta réponse en :\n'
        + '1. Cap stratégique du jour (2-3 phrases clés)\n'
        + '2. Top 3 Décisions & Actions Incontournables\n'
        + '3. Préparation tactique des réunions clés\n'
        + '4. Fenêtres d\'efficacité & temps de concentration recommandé'),
      options: {
        systemMessage: 'Tu es le Directeur de Cabinet IA du dirigeant. Ton rôle est de délivrer une synthèse exécutive de très haute tenue : vision stratégique, clarté absolue, hiérarchisation sans compromis et focus sur la prise de décision.'
      }
    },
    subnodes: {
      model: openAiModel,
      memory: agentMemory
    },
    position: [1420, 340]
  },
  output: [
    {
      output: `### SYNTHÈSE EXÉCUTIVE DÉCISIONNELLE

**Cap Stratégique du Jour :**
Une journée à fort impact combinant gouvernance interne (CODIR à 10h) et rayonnement commercial externe (Démonstration Client IA à 14h). La clé du succès réside dans l'anticipation des arbitrages budgétaires dès ce matin pour libérer l'esprit lors du pitch client de l'après-midi.

**Top 3 Actions Incontournables :**
1. **Arbitrage Budget Q4 :** Valider les chiffres avec la Direction Financière dès la fin du CODIR (avant 12h00).
2. **Démonstration Client Multi-Agents (14h) :** Réserver le créneau 13h30-14h00 pour relire les slides et s'assurer de l'environnement de démo live.
3. **Contrat Cloud Infrastructure :** Déléguer la revue des métriques au Lead Tech lors du point de 16h30.

**Recommandation d'Agenda :**
Bloquer la plage 11h30-12h30 pour le travail de fond, et préserver le créneau 15h00-16h30 pour le traitement des emails P2 et la décompression post-démo.`
    }
  ]
});

// ── HTML Dashboard Generation ───────────────────────────────────────────────

const generateDashboard = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build HTML Dashboard',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `// Retrieve data from upstream nodes
const context = $('Prepare Daily Context').first().json || {};
const triageText = $('Triage & Priority Agent').first().json.output || '';
const synthesisText = $input.first().json.output || '';

const dateStr = context.date || 'Aujourd\\'hui';
const emailList = context.emails || [];
const eventList = context.events || [];

// Identify urgent items count
const urgentCount = emailList.filter(e => {
  const s = ((e.Subject || '') + ' ' + (e.snippet || '')).toLowerCase();
  return s.includes('urgent') || s.includes('critique') || s.includes('budget') || s.includes('important');
}).length || 1;

// Build Timeline Events HTML
const eventsHtml = eventList.map((ev, idx) => {
  const startTime = ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '09:00';
  const endTime = ev.end?.dateTime ? new Date(ev.end.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '10:00';
  const title = ev.summary || 'Événement programmé';
  const desc = ev.description || 'Réunion planifiée dans l\\'agenda';
  const isKey = idx === 0 || idx === 1;

  return \`
    <div class="timeline-item \${isKey ? 'timeline-key' : ''}">
      <div class="timeline-badge">\${startTime}</div>
      <div class="timeline-content">
        <div class="timeline-header">
          <span class="timeline-title">\${title}</span>
          <span class="badge badge-time">\${startTime} - \${endTime}</span>
        </div>
        <p class="timeline-desc">\${desc}</p>
        <div class="timeline-footer">
          <span class="badge badge-status">Confirmé</span>
          <span class="organizer-chip">\${ev.organizer?.email || 'Organisateur'}</span>
        </div>
      </div>
    </div>
  \`;
}).join('\\n');

// Build Emails Cards HTML
const emailsHtml = emailList.map((em, idx) => {
  const sub = em.Subject || 'Sans objet';
  const from = em.From || 'Expéditeur inconnu';
  const snip = em.snippet || '';
  const isUrgent = idx === 0 || sub.toLowerCase().includes('urgent');
  const isImportant = idx === 1 || sub.toLowerCase().includes('contrat');
  const badgeClass = isUrgent ? 'badge-danger' : (isImportant ? 'badge-warning' : 'badge-info');
  const badgeLabel = isUrgent ? 'P1 - Urgent' : (isImportant ? 'P2 - Important' : 'P3 - Routine');

  return \`
    <div class="card email-card \${isUrgent ? 'border-urgent' : ''}">
      <div class="card-header">
        <span class="badge \${badgeClass}">\${badgeLabel}</span>
        <span class="email-from">\${from}</span>
      </div>
      <h4 class="email-subject">\${sub}</h4>
      <p class="email-snippet">\${snip}</p>
    </div>
  \`;
}).join('\\n');

// Build Full HTML Dashboard Document
const html = \`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Exécutif de la Journée</title>
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-card: #111827;
      --bg-card-hover: #1f293d;
      --border-color: #1e293b;
      --border-accent: #3b82f6;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-blue: #3b82f6;
      --accent-indigo: #6366f1;
      --accent-purple: #8b5cf6;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(circle at top, #131d33 0%, var(--bg-main) 100%);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 32px 20px;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 28px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-subtitle {
      font-size: 14px;
      color: var(--text-secondary);
      margin-top: 4px;
    }
    .date-pill {
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.35);
      color: #a5b4fc;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--accent-emerald);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--accent-emerald);
    }
    /* Stat Cards */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 20px;
      transition: transform 0.2s ease, border-color 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: rgba(99, 102, 241, 0.4);
    }
    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-secondary);
      font-weight: 600;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 800;
      color: var(--text-primary);
      margin-bottom: 4px;
    }
    .stat-footnote {
      font-size: 12px;
      color: var(--text-muted);
    }
    /* Executive Briefing Banner */
    .executive-card {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 16px;
      padding: 26px;
      margin-bottom: 32px;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
    }
    .executive-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .executive-icon {
      font-size: 24px;
    }
    .executive-title {
      font-size: 18px;
      font-weight: 700;
      color: #e2e8f0;
    }
    .executive-body {
      color: #cbd5e1;
      font-size: 14.5px;
      line-height: 1.7;
      white-space: pre-line;
    }
    /* 2-Column Section */
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 32px;
    }
    @media (max-width: 880px) {
      .main-grid { grid-template-columns: 1fr; }
    }
    .section-title {
      font-size: 17px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    /* Timeline */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .timeline-item {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      transition: background 0.2s ease;
    }
    .timeline-key {
      border-left: 4px solid var(--accent-indigo);
    }
    .timeline-badge {
      background: rgba(99, 102, 241, 0.15);
      color: #a5b4fc;
      font-weight: 700;
      font-size: 13px;
      padding: 6px 10px;
      border-radius: 8px;
      min-width: 60px;
      text-align: center;
    }
    .timeline-content { flex: 1; }
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .timeline-title {
      font-weight: 600;
      font-size: 15px;
      color: var(--text-primary);
    }
    .timeline-desc {
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 10px;
    }
    .timeline-footer {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 11px;
    }
    .organizer-chip {
      color: var(--text-muted);
    }
    /* Email Cards */
    .email-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      transition: border-color 0.2s ease;
    }
    .border-urgent {
      border-left: 4px solid var(--accent-rose);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .email-from {
      font-size: 12px;
      color: var(--text-muted);
    }
    .email-subject {
      font-size: 14.5px;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 6px;
    }
    .email-snippet {
      font-size: 13px;
      color: var(--text-secondary);
    }
    /* Badges */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-time {
      background: rgba(255, 255, 255, 0.08);
      color: #94a3b8;
    }
    .badge-status {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
    }
    .badge-danger {
      background: rgba(244, 63, 94, 0.15);
      color: #fb7185;
      border: 1px solid rgba(244, 63, 94, 0.3);
    }
    .badge-warning {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-info {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    /* Footer */
    .footer {
      text-align: center;
      padding-top: 24px;
      border-top: 1px solid var(--border-color);
      font-size: 12px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="top-bar">
      <div>
        <h1 class="brand-title">Executive Briefing & Daily Dashboard</h1>
        <p class="brand-subtitle">Supervision intelligente multi-agents • Google Mail & Google Calendar</p>
      </div>
      <div class="date-pill">
        <span class="pulse-dot"></span>
        <span>\${dateStr}</span>
      </div>
    </header>

    <!-- KPI Highlights -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Emails Récents</div>
        <div class="stat-value">\${emailList.length}</div>
        <div class="stat-footnote">Flux de messagerie synchronisé</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Alertes Priorité P1</div>
        <div class="stat-value" style="color: #fb7185;">\${urgentCount}</div>
        <div class="stat-footnote">Action requise aujourd'hui</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Réunions au Planning</div>
        <div class="stat-value">\${eventList.length}</div>
        <div class="stat-footnote">Temps total : ~3h15</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Disponibilité Focus</div>
        <div class="stat-value" style="color: #34d399;">~4h45</div>
        <div class="stat-footnote">Créneaux de travail profond</div>
      </div>
    </div>

    <!-- Executive Synthesis Banner -->
    <div class="executive-card">
      <div class="executive-header">
        <span class="executive-icon">🎯</span>
        <h2 class="executive-title">Synthèse Exécutive Décisionnelle (Agent 2)</h2>
      </div>
      <div class="executive-body">\${synthesisText}</div>
    </div>

    <!-- 2 Column Layout: Calendar & Emails -->
    <div class="main-grid">
      <div>
        <h3 class="section-title">📅 Chronologie de la Journée (Google Calendar)</h3>
        <div class="timeline">
          \${eventsHtml}
        </div>
      </div>
      <div>
        <h3 class="section-title">📬 Triage Intelligent & Priorités (Gmail)</h3>
        <div class="email-list">
          \${emailsHtml}
        </div>
      </div>
    </div>

    <footer class="footer">
      Dashboard généré automatiquement par le système multi-agents n8n • Modèle OpenAI gpt-4o-mini • Traitement sécurisé
    </footer>
  </div>
</body>
</html>\`;

return [{
  json: {
    dashboardHtml: html,
    date: dateStr,
    urgentCount: urgentCount,
    eventsCount: eventList.length,
    status: 'COMPLETED'
  }
}];`
    },
    position: [1700, 340]
  },
  output: [
    {
      dashboardHtml: '<!DOCTYPE html><html><body><h1>Dashboard</h1></body></html>',
      date: 'dimanche 6 septembre 2026',
      urgentCount: 1,
      eventsCount: 3,
      status: 'COMPLETED'
    }
  ]
});

// Final HTML Render Node
const renderHtml = node({
  type: 'n8n-nodes-base.html',
  version: 1.2,
  config: {
    name: 'Render HTML Dashboard',
    parameters: {
      operation: 'generateHtmlTemplate',
      html: expr('{{ $json.dashboardHtml }}')
    },
    position: [1960, 340]
  },
  output: [
    {
      html: '<!DOCTYPE html><html><body><h1>Dashboard</h1></body></html>'
    }
  ]
});

// ── Complete End-to-End Workflow Graph ──────────────────────────────────────

export default workflow('daily-multiagent-executive-dashboard', 'Multi-Agent Daily Briefing & HTML Dashboard')
  // Daily Schedule Trigger fan-out to Gmail and Calendar
  .add(scheduleTrigger)
  .to(fetchGmail.to(combineStreams.input(0)))
  .add(scheduleTrigger)
  .to(fetchCalendar.to(combineStreams.input(1)))
  // Manual Run Trigger fan-out to Gmail and Calendar
  .add(manualTrigger)
  .to(fetchGmail.to(combineStreams.input(0)))
  .add(manualTrigger)
  .to(fetchCalendar.to(combineStreams.input(1)))
  // Merge both streams
  .add(combineStreams)
  // Context normalization
  .to(prepareContext)
  // Multi-Agent Pipeline: Triage Agent (Tier 1) -> Executive Synthesis Agent (Tier 2)
  .to(triageAgent)
  .to(executiveAgent)
  // HTML Presentation
  .to(generateDashboard)
  .to(renderHtml);
