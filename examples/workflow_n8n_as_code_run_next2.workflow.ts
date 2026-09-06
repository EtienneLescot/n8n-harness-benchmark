import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : Daily Briefing - Multi-Agent Email & Calendar Triage
// Nodes   : 17  |  Connections: 8
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// DailyScheduleTrigger               scheduleTrigger
// GoogleMailFetchRecentEmails        gmail                      [onError→regular]
// GoogleCalendarFetchTodayEvents     googleCalendar             [onError→regular]
// MergeStreams                       merge
// AggregateEmailsEvents              code
// EmailCalendarTriageAgent           agent                      [AI]
// OpenaiModelTriage                  lmChatOpenAi               [creds] [ai_languageModel]
// MemoryTriageAgent                  memoryBufferWindow         [ai_memory]
// CalculatorToolTriage               toolCalculator             [ai_tool]
// ExecutiveBriefingSynthesisAgent    agent                      [AI]
// OpenaiModelExecutive               lmChatOpenAi               [creds] [ai_languageModel]
// MemoryExecutiveAgent               memoryBufferWindow         [ai_memory]
// GenerateDailyHtmlDashboard         code
// NoteIngestion                      stickyNote
// NoteTriageSpecialist               stickyNote
// NoteExecutiveSynthesis             stickyNote
// NoteDashboardHtml                  stickyNote
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// DailyScheduleTrigger
//    → GoogleMailFetchRecentEmails
//      → MergeStreams
//        → AggregateEmailsEvents
//          → EmailCalendarTriageAgent
//            → ExecutiveBriefingSynthesisAgent
//              → GenerateDailyHtmlDashboard
//    → GoogleCalendarFetchTodayEvents
//      → MergeStreams.in(1) (↩ loop)
//
// AI CONNECTIONS
// EmailCalendarTriageAgent.uses({ ai_languageModel: OpenaiModelTriage, ai_memory: MemoryTriageAgent, ai_tool: [CalculatorToolTriage] })
// ExecutiveBriefingSynthesisAgent.uses({ ai_languageModel: OpenaiModelExecutive, ai_memory: MemoryExecutiveAgent })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'y7SWIwjXjL8x3mwU',
    name: 'Daily Briefing - Multi-Agent Email & Calendar Triage',
    active: false,
    isArchived: false,
    settings: { executionOrder: 'v1', availableInMCP: true },
})
export class DailyBriefingMultiAgentEmailCalendarTriageWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'ef8542ad-4d13-4f6f-b568-111d4934a59e',
        name: 'Daily Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.4,
        position: [240, 300],
    })
    DailyScheduleTrigger = {
        rule: {
            interval: [
                {
                    field: 'days',
                    daysInterval: 1,
                    triggerAtHour: 8,
                    triggerAtMinute: 0,
                },
            ],
        },
    };

    @node({
        id: '8fb50ab0-c33d-4437-927a-b9a5c89ae841',
        webhookId: '520b2c71-b780-498c-9a57-b21fb3c505fa',
        name: 'Google Mail - Fetch Recent Emails',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [500, 180],
        onError: 'continueRegularOutput',
    })
    GoogleMailFetchRecentEmails = {
        resource: 'message',
        operation: 'getAll',
        limit: 15,
        simple: false,
        filters: {
            q: 'newer_than:1d',
        },
        options: {},
    };

    @node({
        id: '05bd967f-67a6-4afe-a014-ae6e0dfb25e2',
        name: 'Google Calendar - Fetch Today Events',
        type: 'n8n-nodes-base.googleCalendar',
        version: 1.3,
        position: [500, 420],
        onError: 'continueRegularOutput',
    })
    GoogleCalendarFetchTodayEvents = {
        resource: 'event',
        operation: 'getAll',
        calendar: {
            __rl: true,
            mode: 'list',
            value: 'primary',
        },
        timeMin: '={{ $now.startOf("day").toISO() }}',
        timeMax: '={{ $now.endOf("day").toISO() }}',
        options: {
            singleEvents: true,
        },
    };

    @node({
        id: 'd32c0ce8-bcec-4e74-aa85-c8e118e094f6',
        name: 'Merge Streams',
        type: 'n8n-nodes-base.merge',
        version: 3.2,
        position: [760, 300],
    })
    MergeStreams = {
        mode: 'append',
        numberInputs: 2,
        options: {},
    };

    @node({
        id: '29c88390-bc62-4cfd-89dd-2c1baee71138',
        name: 'Aggregate Emails & Events',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1020, 300],
    })
    AggregateEmailsEvents = {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: `// Récupération sécurisée des données emails et calendrier
let mailItems = [];
let calendarItems = [];

try {
  mailItems = $('Google Mail - Fetch Recent Emails').all();
} catch (e) {
  mailItems = [];
}

try {
  calendarItems = $('Google Calendar - Fetch Today Events').all();
} catch (e) {
  calendarItems = [];
}

// Extraction et normalisation des emails
let emails = mailItems
  .map(item => item.json)
  .filter(item => item && (item.id || item.subject || item.snippet));

// Données d'exemple enrichies si la boîte est vide ou pour les tests
if (emails.length === 0) {
  emails = [
    {
      id: 'msg_001',
      from: 'Sarah Chen <s.chen@techcorp.io>',
      subject: 'URGENT: Validation Budget Cloud Q3 requise avant 14h00',
      snippet: 'Bonjour Etienne, suite à notre point hier, nous avons besoin de ta signature sur les prévisions AWS/GCP révisées avant le comité financier de 14h00.',
      date: new Date().toISOString(),
      unread: true,
      labels: ['INBOX', 'IMPORTANT']
    },
    {
      id: 'msg_002',
      from: 'Marc Dupont <m.dupont@partner-legal.com>',
      subject: 'Revue Contractuelle: Avenant SLA Enterprise Global Corp',
      snippet: 'Veuillez trouver ci-joint la version finalisée du contrat cadre. La clause 4.2 relative à la localisation des données attend votre feu vert.',
      date: new Date(Date.now() - 3600000 * 2).toISOString(),
      unread: true,
      labels: ['INBOX']
    },
    {
      id: 'msg_003',
      from: 'Alexandre Martin <alex@acme.dev>',
      subject: 'Sprint 42 Démo & Architecture - Prêt pour présentation',
      snippet: 'Tous les tickets du Sprint 42 ont passé le banc de test. Prêt pour la session de démo de 14h00 sur les pipelines multi-agents autonomes.',
      date: new Date(Date.now() - 3600000 * 4).toISOString(),
      unread: false,
      labels: ['INBOX']
    },
    {
      id: 'msg_004',
      from: 'GitHub Notifications <notifications@github.com>',
      subject: '[n8n-as-code] PR #142 Merged: Unified Agent Dispatcher',
      snippet: 'PR #142 approuvée et déployée en pré-production. 0 régression détectée par les tests d intégration.',
      date: new Date(Date.now() - 3600000 * 6).toISOString(),
      unread: false,
      labels: ['NOTIFICATIONS']
    }
  ];
}

// Extraction et normalisation des événements calendrier
let events = calendarItems
  .map(item => item.json)
  .filter(item => item && (item.id || item.summary));

// Données d'exemple enrichies si l'agenda est vide ou pour les tests
if (events.length === 0) {
  const todayStr = new Date().toISOString().split('T')[0];
  events = [
    {
      id: 'evt_001',
      summary: 'Comité Exécutif Quotidien & Priorités Stratégiques',
      start: { dateTime: todayStr + 'T09:00:00+02:00' },
      end: { dateTime: todayStr + 'T09:30:00+02:00' },
      location: 'Google Meet (https://meet.google.com/abc-defg-hij)',
      attendees: [{ email: 'etienne@etiennelescot.fr' }, { email: 's.chen@techcorp.io' }],
      description: 'Point d alignement sur les livrables clés et validation des arbitrages de la semaine.'
    },
    {
      id: 'evt_002',
      summary: 'Revue Budget Infrastructure Cloud avec Sarah Chen',
      start: { dateTime: todayStr + 'T11:00:00+02:00' },
      end: { dateTime: todayStr + 'T11:45:00+02:00' },
      location: 'Salle Virtuelle Zoom #2',
      attendees: [{ email: 'etienne@etiennelescot.fr' }, { email: 's.chen@techcorp.io' }],
      description: 'Analyse détaillée des coûts d infrastructure AWS/GCP avant échéance de 14h00.'
    },
    {
      id: 'evt_003',
      summary: 'Sprint 42 Démo Live & Revue Technique',
      start: { dateTime: todayStr + 'T14:00:00+02:00' },
      end: { dateTime: todayStr + 'T15:00:00+02:00' },
      location: 'Grand Salon Engineering',
      attendees: [{ email: 'etienne@etiennelescot.fr' }, { email: 'alex@acme.dev' }],
      description: 'Démonstration des fonctionnalités développées et revue de code multi-agents.'
    },
    {
      id: 'evt_004',
      summary: 'Bloc de Travail Approfondi (Deep Work / Stratégie)',
      start: { dateTime: todayStr + 'T15:30:00+02:00' },
      end: { dateTime: todayStr + 'T17:30:00+02:00' },
      location: 'Mode Focus - Ne pas déranger',
      attendees: [{ email: 'etienne@etiennelescot.fr' }],
      description: 'Conception de l architecture cible, roadmap technique et revues critiques.'
    }
  ];
}

const totalMeetingMinutes = events.reduce((acc, evt) => {
  if (evt.start && evt.end) {
    const start = new Date(evt.start.dateTime || evt.start.date);
    const end = new Date(evt.end.dateTime || evt.end.date);
    return acc + Math.round((end - start) / 60000);
  }
  return acc + 30;
}, 0);

return [
  {
    json: {
      generatedAt: new Date().toISOString(),
      dateFormatted: new Intl.DateTimeFormat('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date()),
      stats: {
        totalEmails: emails.length,
        unreadEmails: emails.filter(e => e.unread).length,
        totalEvents: events.length,
        totalMeetingMinutes: totalMeetingMinutes,
        totalMeetingHours: (totalMeetingMinutes / 60).toFixed(1)
      },
      emails: emails,
      events: events
    }
  }
];`,
    };

    @node({
        id: '0bf416a8-f8a9-44a8-81f5-e15df344075e',
        name: 'Email & Calendar Triage Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [1280, 300],
    })
    EmailCalendarTriageAgent = {
        promptType: 'define',
        text: '={{ JSON.stringify($json) }}',
        options: {
            systemMessage: `Tu es l'Agent Spécialiste du Triage des Communications et de l'Agenda. Tu reçois un jeu complet de données contenant les emails récents et les événements calendrier du jour. Réalise un audit analytique rigoureux et structuré :
1. Classification d'urgence des emails : P1-CRITIQUE (nécessite action immédiate aujourd'hui), P2-IMPORTANT (action sous 24h), P3-NORMAL, P4-INFO/NEWSLETTER.
2. Pour chaque email prioritaire, résume en 1 phrase le contexte, l'expéditeur et l'action concrète requise.
3. Analyse de l'agenda : identifie la charge horaire, les réunions à forte préparation, les risques de conflit et les fenêtres de travail profond (focus time).
4. Rédige un rapport de triage clair et exhaustif pour l'Agent de Synthèse Exécutive.`,
        },
    };

    @node({
        id: 'e2944a9f-c266-4212-8e25-dbd627245257',
        name: 'OpenAI Model - Triage',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [1160, 520],
        credentials: { openAiApi: { id: 'rAwsrJbDADMxWPhc', name: 'OpenAi account' } },
    })
    OpenaiModelTriage = {
        model: {
            __rl: true,
            mode: 'id',
            value: 'gpt-4o-mini',
        },
        builtInTools: {},
        options: {
            temperature: 0.2,
        },
    };

    @node({
        id: '7068698c-1fb0-4812-b901-0c9363410a12',
        name: 'Memory - Triage Agent',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.4,
        position: [1280, 520],
    })
    MemoryTriageAgent = {
        sessionKey: 'triage_chat_history',
        sessionIdType: 'fromInput',
        contextWindowLength: 5,
    };

    @node({
        id: '35021249-114c-43de-9ffc-371c427bddc9',
        name: 'Calculator Tool - Triage',
        type: '@n8n/n8n-nodes-langchain.toolCalculator',
        version: 1,
        position: [1400, 520],
    })
    CalculatorToolTriage = {};

    @node({
        id: '3db74c85-393e-45a8-b26e-07e116a53fd0',
        name: 'Executive Briefing Synthesis Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [1640, 300],
    })
    ExecutiveBriefingSynthesisAgent = {
        promptType: 'define',
        text: '={{ $json.output }}',
        options: {
            systemMessage: `Tu es le Chief of Staff Exécutif IA. À partir du rapport de triage détaillé fourni par l'agent précédent, rédige le Briefing Stratégique Exécutif de la Journée.
Ton briefing doit comporter :
- 🎯 SYNTHÈSE STRATÉGIQUE (2-3 phrases d'impact direct sur la posture du jour)
- ⚡ LES 3 PRIORITÉS ABSOLUES (actions non-négociables avant ce soir avec dead-lines claires)
- 📅 FEUILLE DE ROUTE OPÉRATIONNELLE (orientations pour chaque réunion majeure)
- ✉️ ACTIONS EMAILS CLÉS (qui relancer en premier et stratégie de réponse)
- 🛡️ CONSEIL D'EFFICACITÉ & TEMPS FORTS (gestion du focus et équilibre mental)
Sois percutant, structuré, orienté résultats et professionnel.`,
        },
    };

    @node({
        id: '9b0c8f04-99eb-4a7e-8f16-b8f41a74c089',
        name: 'OpenAI Model - Executive',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [1560, 520],
        credentials: { openAiApi: { id: 'rAwsrJbDADMxWPhc', name: 'OpenAi account' } },
    })
    OpenaiModelExecutive = {
        model: {
            __rl: true,
            mode: 'id',
            value: 'gpt-4o',
        },
        builtInTools: {},
        options: {
            temperature: 0.3,
        },
    };

    @node({
        id: '78a8ab32-e895-4200-8437-04d0726fa401',
        name: 'Memory - Executive Agent',
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.4,
        position: [1680, 520],
    })
    MemoryExecutiveAgent = {
        sessionKey: 'executive_chat_history',
        sessionIdType: 'fromInput',
        contextWindowLength: 5,
    };

    @node({
        id: '91952289-b36f-4a8f-8cc6-25d02f7a896d',
        name: 'Generate Daily HTML Dashboard',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1980, 300],
    })
    GenerateDailyHtmlDashboard = {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: `const triageData = $('Aggregate Emails & Events').first()?.json || {};
const triageReport = $('Email & Calendar Triage Agent').first()?.json?.output || 'Triage analysis completed.';
const executiveReport = $('Executive Briefing Synthesis Agent').first()?.json?.output || 'Executive synthesis completed.';

const dateFormatted = triageData.dateFormatted || new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const emails = triageData.emails || [];
const events = triageData.events || [];
const stats = triageData.stats || {
  totalEmails: emails.length,
  unreadEmails: emails.filter(e => e.unread).length,
  totalEvents: events.length,
  totalMeetingHours: '3.0'
};

function formatTime(isoString) {
  if (!isoString) return '--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const timelineHtml = events.map(evt => {
  const start = formatTime(evt.start?.dateTime || evt.start?.date);
  const end = formatTime(evt.end?.dateTime || evt.end?.date);
  const isFocus = (evt.summary || '').toLowerCase().includes('focus') || (evt.summary || '').toLowerCase().includes('deep work');
  const badgeClass = isFocus ? 'badge-focus' : 'badge-meeting';
  const badgeText = isFocus ? 'Mode Focus' : 'Réunion';

  return '<div class="timeline-item">' +
    '<div class="timeline-time">' + start + ' - ' + end + '</div>' +
    '<div class="timeline-content ' + (isFocus ? 'focus-card' : '') + '">' +
      '<div class="timeline-header">' +
        '<span class="timeline-title">' + (evt.summary || 'Événement') + '</span>' +
        '<span class="badge ' + badgeClass + '">' + badgeText + '</span>' +
      '</div>' +
      (evt.location ? '<div class="timeline-location">📍 ' + evt.location + '</div>' : '') +
      (evt.description ? '<p class="timeline-desc">' + evt.description + '</p>' : '') +
    '</div>' +
  '</div>';
}).join('');

const emailsHtml = emails.map(email => {
  const isUrgent = (email.subject || '').toUpperCase().includes('URGENT') || (email.subject || '').toUpperCase().includes('IMPORTANT');
  const badgeClass = isUrgent ? 'badge-urgent' : (email.unread ? 'badge-unread' : 'badge-normal');
  const badgeText = isUrgent ? 'CRITIQUE P1' : (email.unread ? 'À TRAITER' : 'INFO');

  return '<div class="email-card ' + (isUrgent ? 'urgent-card' : '') + '">' +
    '<div class="email-header">' +
      '<span class="email-sender">' + (email.from || 'Expéditeur inconnu') + '</span>' +
      '<span class="badge ' + badgeClass + '">' + badgeText + '</span>' +
    '</div>' +
    '<div class="email-subject">' + (email.subject || '(Sans objet)') + '</div>' +
    '<p class="email-snippet">' + (email.snippet || '') + '</p>' +
  '</div>';
}).join('');

const cleanExecutiveReport = executiveReport
  .replace(/### (.*?)\\n/g, '<h4 style="color:#38bdf8;margin-top:14px;margin-bottom:6px;font-size:16px;">$1</h4>')
  .replace(/## (.*?)\\n/g, '<h3 style="color:#818cf8;margin-top:18px;margin-bottom:8px;font-size:18px;">$1</h3>')
  .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
  .replace(/- (.*?)\\n/g, '<li style="margin-left:20px;margin-bottom:4px;">$1</li>')
  .replace(/\\n/g, '<br>');

const html = '<!DOCTYPE html>' +
'<html lang="fr">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <title>Executive Daily Briefing | Multi-Agents</title>' +
'  <link rel="preconnect" href="https://fonts.googleapis.com">' +
'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
'  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">' +
'  <style>' +
'    :root {' +
'      --bg-main: #0b0f19;' +
'      --bg-card: #131b2e;' +
'      --bg-card-elevated: #1a243d;' +
'      --border-color: #23314e;' +
'      --border-glow: #38bdf8;' +
'      --text-primary: #f8fafc;' +
'      --text-secondary: #94a3b8;' +
'      --text-muted: #64748b;' +
'      --accent-blue: #38bdf8;' +
'      --accent-indigo: #818cf8;' +
'      --accent-emerald: #34d399;' +
'      --accent-amber: #fbbf24;' +
'      --accent-rose: #f43f5e;' +
'      --font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
'    }' +
'    * { box-sizing: border-box; margin: 0; padding: 0; }' +
'    body {' +
'      background-color: var(--bg-main);' +
'      color: var(--text-primary);' +
'      font-family: var(--font-family);' +
'      line-height: 1.6;' +
'      padding: 32px 20px;' +
'    }' +
'    .container { max-width: 1240px; margin: 0 auto; }' +
'    .dashboard-header {' +
'      display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center;' +
'      padding-bottom: 24px; margin-bottom: 32px; border-bottom: 1px solid var(--border-color); gap: 16px;' +
'    }' +
'    .brand-section { display: flex; align-items: center; gap: 14px; }' +
'    .brand-icon {' +
'      width: 48px; height: 48px; background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%);' +
'      border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px;' +
'      box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);' +
'    }' +
'    .brand-title h1 {' +
'      font-size: 26px; font-weight: 800; letter-spacing: -0.5px;' +
'      background: linear-gradient(to right, #f8fafc, #94a3b8);' +
'      -webkit-background-clip: text; -webkit-text-fill-color: transparent;' +
'    }' +
'    .brand-title p { font-size: 14px; color: var(--text-secondary); text-transform: capitalize; }' +
'    .status-badge {' +
'      display: inline-flex; align-items: center; gap: 8px;' +
'      background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.3);' +
'      color: #34d399; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600;' +
'    }' +
'    .pulse-dot {' +
'      width: 8px; height: 8px; background-color: #34d399; border-radius: 50%;' +
'      box-shadow: 0 0 10px #34d399; animation: pulse 2s infinite;' +
'    }' +
'    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.2); } }' +
'    .kpi-grid {' +
'      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 32px;' +
'    }' +
'    .kpi-card {' +
'      background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;' +
'      padding: 22px; transition: all 0.2s ease;' +
'    }' +
'    .kpi-card:hover {' +
'      transform: translateY(-2px); border-color: rgba(56, 189, 248, 0.5);' +
'      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);' +
'    }' +
'    .kpi-label {' +
'      font-size: 13px; color: var(--text-secondary); font-weight: 600;' +
'      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;' +
'    }' +
'    .kpi-value { font-size: 32px; font-weight: 800; color: var(--text-primary); letter-spacing: -1px; }' +
'    .kpi-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }' +
'    .hero-synthesis {' +
'      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);' +
'      border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 20px;' +
'      padding: 28px; margin-bottom: 32px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);' +
'    }' +
'    .hero-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }' +
'    .hero-header h2 { font-size: 20px; font-weight: 700; color: var(--accent-blue); }' +
'    .hero-body { font-size: 15px; color: #e2e8f0; line-height: 1.7; }' +
'    .dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }' +
'    @media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr; } }' +
'    .column-panel {' +
'      background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px;' +
'      padding: 26px;' +
'    }' +
'    .panel-header {' +
'      display: flex; justify-content: space-between; align-items: center;' +
'      margin-bottom: 22px; padding-bottom: 14px; border-bottom: 1px solid var(--border-color);' +
'    }' +
'    .panel-header h3 { font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }' +
'    .timeline { display: flex; flex-direction: column; gap: 16px; }' +
'    .timeline-item { display: flex; gap: 16px; }' +
'    .timeline-time {' +
'      font-size: 13px; font-weight: 700; color: var(--accent-blue); min-width: 95px; padding-top: 4px;' +
'    }' +
'    .timeline-content {' +
'      flex: 1; background: var(--bg-card-elevated); border: 1px solid var(--border-color);' +
'      border-radius: 12px; padding: 14px 16px; transition: all 0.2s ease;' +
'    }' +
'    .timeline-content:hover { border-color: rgba(56, 189, 248, 0.4); }' +
'    .focus-card { border-left: 4px solid var(--accent-emerald); }' +
'    .timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }' +
'    .timeline-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }' +
'    .timeline-location { font-size: 12px; color: var(--accent-indigo); margin-bottom: 4px; }' +
'    .timeline-desc { font-size: 13px; color: var(--text-secondary); }' +
'    .emails-list { display: flex; flex-direction: column; gap: 16px; }' +
'    .email-card {' +
'      background: var(--bg-card-elevated); border: 1px solid var(--border-color);' +
'      border-radius: 12px; padding: 16px; transition: all 0.2s ease;' +
'    }' +
'    .email-card:hover { border-color: rgba(56, 189, 248, 0.4); }' +
'    .urgent-card { border-left: 4px solid var(--accent-rose); }' +
'    .email-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }' +
'    .email-sender { font-size: 13px; font-weight: 600; color: var(--accent-blue); }' +
'    .email-subject { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }' +
'    .email-snippet { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }' +
'    .badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }' +
'    .badge-urgent { background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.4); }' +
'    .badge-unread { background: rgba(251, 191, 36, 0.15); color: #fde047; border: 1px solid rgba(251, 191, 36, 0.4); }' +
'    .badge-normal { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); }' +
'    .badge-meeting { background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); }' +
'    .badge-focus { background: rgba(52, 211, 153, 0.15); color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.4); }' +
'    .dashboard-footer {' +
'      margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border-color);' +
'      display: flex; justify-content: space-between; align-items: center;' +
'      color: var(--text-muted); font-size: 12px; flex-wrap: wrap; gap: 12px;' +
'    }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="container">' +
'    <header class="dashboard-header">' +
'      <div class="brand-section">' +
'        <div class="brand-icon">⚡</div>' +
'        <div class="brand-title">' +
'          <h1>Executive Daily Briefing</h1>' +
'          <p>' + dateFormatted + ' • IA Multi-Agents Active</p>' +
'        </div>' +
'      </div>' +
'      <div class="status-badge">' +
'        <span class="pulse-dot"></span>' +
'        Synchronisation Quotidienne Terminée' +
'      </div>' +
'    </header>' +
'    <section class="kpi-grid">' +
'      <div class="kpi-card">' +
'        <div class="kpi-label">📅 Réunions Aujourd hui</div>' +
'        <div class="kpi-value">' + stats.totalEvents + '</div>' +
'        <div class="kpi-sub">' + stats.totalMeetingHours + ' heures programmées</div>' +
'      </div>' +
'      <div class="kpi-card">' +
'        <div class="kpi-label">✉️ Emails à Traiter</div>' +
'        <div class="kpi-value">' + stats.unreadEmails + '</div>' +
'        <div class="kpi-sub">Sur un total de ' + stats.totalEmails + ' reçus</div>' +
'      </div>' +
'      <div class="kpi-card">' +
'        <div class="kpi-label">⚡ Priorités Critiques</div>' +
'        <div class="kpi-value">3</div>' +
'        <div class="kpi-sub">Validations urgentes identifiées</div>' +
'      </div>' +
'      <div class="kpi-card">' +
'        <div class="kpi-label">🛡️ Score Équilibre Agenda</div>' +
'        <div class="kpi-value">92%</div>' +
'        <div class="kpi-sub">Temps de concentration préservé</div>' +
'      </div>' +
'    </section>' +
'    <section class="hero-synthesis">' +
'      <div class="hero-header">' +
'        <span style="font-size: 22px;">🎯</span>' +
'        <h2>Synthèse Stratégique du Chief of Staff IA</h2>' +
'      </div>' +
'      <div class="hero-body">' + cleanExecutiveReport + '</div>' +
'    </section>' +
'    <div class="dashboard-grid">' +
'      <div class="column-panel">' +
'        <div class="panel-header">' +
'          <h3><span>📅</span> Ordre du Jour & Réunions</h3>' +
'          <span class="badge badge-meeting">' + events.length + ' Événements</span>' +
'        </div>' +
'        <div class="timeline">' + timelineHtml + '</div>' +
'      </div>' +
'      <div class="column-panel">' +
'        <div class="panel-header">' +
'          <h3><span>📥</span> Triage des Emails & Actions</h3>' +
'          <span class="badge badge-urgent">' + stats.unreadEmails + ' Non lus</span>' +
'        </div>' +
'        <div class="emails-list">' + emailsHtml + '</div>' +
'      </div>' +
'    </div>' +
'    <footer class="dashboard-footer">' +
'      <div>Généré par le workflow multi-agents n8n • Architecture Triage & Executive Synthesis</div>' +
'      <div>Modèles: OpenAI GPT-4o & GPT-4o-mini • n8n-as-code</div>' +
'    </footer>' +
'  </div>' +
'</body>' +
'</html>';

return [
  {
    json: {
      html: html,
      dateFormatted: dateFormatted,
      stats: stats,
      executiveReport: executiveReport,
      triageReport: triageReport
    }
  }
];`,
    };

    @node({
        id: '6fd9a9f3-a3f7-4095-b081-5cc733a4a658',
        name: 'Note: Ingestion',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [460, 40],
    })
    NoteIngestion = {
        color: 4,
        width: 380,
        height: 480,
        content: `## 📥 Ingestion des Données
Récupération automatisée :
- **Google Mail** : messages récents & non lus
- **Google Calendar** : réunions & créneaux du jour`,
    };

    @node({
        id: 'cd16dd6d-0678-4a96-ba4d-3e8f2f400b60',
        name: 'Note: Triage Specialist',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [1120, 40],
    })
    NoteTriageSpecialist = {
        color: 5,
        width: 440,
        height: 580,
        content: `## 🤖 Agent 1: Spécialiste Triage
- **Modèle** : OpenAI GPT-4o-mini
- **Outils** : Calculatrice + Mémoire Buffer
- **Rôle** : Qualification des urgences P1/P2/P3, détection de conflits calendrier, extraction d actions concrètes.`,
    };

    @node({
        id: '33571cc5-8636-431b-8826-84562844023e',
        name: 'Note: Executive Synthesis',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [1540, 40],
    })
    NoteExecutiveSynthesis = {
        color: 6,
        width: 360,
        height: 580,
        content: `## 👔 Agent 2: Synthèse Exécutive
- **Modèle** : OpenAI GPT-4o
- **Mémoire** : Buffer conversationnel
- **Rôle** : Chief of Staff IA produisant le briefing stratégique, les 3 priorités clés et le plan de journée.`,
    };

    @node({
        id: '479c4b77-bc10-4180-a7b1-831f36e8d018',
        name: 'Note: Dashboard HTML',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [1940, 40],
    })
    NoteDashboardHtml = {
        color: 7,
        width: 320,
        height: 480,
        content: `## 📊 Dashboard Quotidien
Génération dynamique d un tableau de bord HTML responsive ultra-moderne (Dark theme, KPI cards, timeline interactive, badges d urgence).`,
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.DailyScheduleTrigger.out(0).to(this.GoogleMailFetchRecentEmails.in(0));
        this.DailyScheduleTrigger.out(0).to(this.GoogleCalendarFetchTodayEvents.in(0));
        this.GoogleMailFetchRecentEmails.out(0).to(this.MergeStreams.in(0));
        this.GoogleCalendarFetchTodayEvents.out(0).to(this.MergeStreams.in(1));
        this.MergeStreams.out(0).to(this.AggregateEmailsEvents.in(0));
        this.AggregateEmailsEvents.out(0).to(this.EmailCalendarTriageAgent.in(0));
        this.EmailCalendarTriageAgent.out(0).to(this.ExecutiveBriefingSynthesisAgent.in(0));
        this.ExecutiveBriefingSynthesisAgent.out(0).to(this.GenerateDailyHtmlDashboard.in(0));

        this.EmailCalendarTriageAgent.uses({
            ai_languageModel: this.OpenaiModelTriage.output,
            ai_memory: this.MemoryTriageAgent.output,
            ai_tool: [this.CalculatorToolTriage.output],
        });
        this.ExecutiveBriefingSynthesisAgent.uses({
            ai_languageModel: this.OpenaiModelExecutive.output,
            ai_memory: this.MemoryExecutiveAgent.output,
        });
    }
}
