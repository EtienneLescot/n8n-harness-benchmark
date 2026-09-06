import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : Multi-Agent Daily Assistant: Emails, Calendar & HTML Dashboard
// Nodes   : 14  |  Connections: 5
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ScheduleTriggerDaily8h             scheduleTrigger
// ManualTrigger                      manualTrigger
// WebhookDashboardView               webhook
// DailyCoordinatorAgent              agent                      [AI]
// OpenaiGpt4oCoordinator             lmChatOpenAi               [creds] [ai_languageModel]
// StructuredOutputParser             outputParserStructured     [ai_outputParser]
// EmailSpecialistAgent               agentTool                  [AI] [ai_tool]
// OpenaiGpt4oEmailAgent              lmChatOpenAi               [creds] [ai_languageModel]
// GmailTool                          gmailTool                  [ai_tool]
// CalendarSpecialistAgent            agentTool                  [AI] [ai_tool]
// OpenaiGpt4oCalendarAgent           lmChatOpenAi               [creds] [ai_languageModel]
// GoogleCalendarTool                 googleCalendarTool         [ai_tool]
// GenererDashboardHtml               code
// RespondToWebhook                   respondToWebhook
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ScheduleTriggerDaily8h
//    → DailyCoordinatorAgent
//      → GenererDashboardHtml
//        → RespondToWebhook
// ManualTrigger
//    → DailyCoordinatorAgent (↩ loop)
// WebhookDashboardView
//    → DailyCoordinatorAgent (↩ loop)
//
// AI CONNECTIONS
// DailyCoordinatorAgent.uses({ ai_languageModel: OpenaiGpt4oCoordinator, ai_outputParser: StructuredOutputParser, ai_tool: [EmailSpecialistAgent, CalendarSpecialistAgent] })
// EmailSpecialistAgent.uses({ ai_languageModel: OpenaiGpt4oEmailAgent, ai_tool: [GmailTool] })
// CalendarSpecialistAgent.uses({ ai_languageModel: OpenaiGpt4oCalendarAgent, ai_tool: [GoogleCalendarTool] })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'gRDckX2o3M2BtcyK',
    name: 'Multi-Agent Daily Assistant: Emails, Calendar & HTML Dashboard',
    active: false,
    isArchived: false,
    projectId: 'sD2aDWI5bIJF3Km3',
    projectName: 'Etienne Lescot <etienne@etiennelescot.fr>',
    homeProject: {
        id: 'sD2aDWI5bIJF3Km3',
        name: 'Etienne Lescot <etienne@etiennelescot.fr>',
        type: 'personal',
        createdAt: '2025-12-17T14:24:27.408Z',
        updatedAt: '2025-12-17T14:24:37.777Z',
    },
    settings: { executionOrder: 'v1', availableInMCP: true },
})
export class MultiAgentDailyAssistantEmailsCalendarHtmlDashboardWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '30796b34-2943-4082-9b55-1d9bac114680',
        name: 'Schedule Trigger (Daily 8h)',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.3,
        position: [240, 200],
    })
    ScheduleTriggerDaily8h = {
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
        id: 'cebadf8b-75e9-4e4c-b295-c8321d3f03d5',
        name: 'Manual Trigger',
        type: 'n8n-nodes-base.manualTrigger',
        version: 1,
        position: [240, 360],
    })
    ManualTrigger = {};

    @node({
        id: 'e6f6f1d9-1aed-4e0a-917d-751a88921d60',
        webhookId: 'f5c8f91c-758c-423d-b05d-5aa21110dae6',
        name: 'Webhook (Dashboard View)',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [240, 520],
    })
    WebhookDashboardView = {
        httpMethod: 'GET',
        path: 'daily-dashboard',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: '77d84970-8af4-404d-ac69-394fb75dd939',
        name: 'Daily Coordinator Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [560, 360],
    })
    DailyCoordinatorAgent = {
        promptType: 'define',
        text: `=Aujourd'hui nous sommes le {{ $today.toFormat('yyyy-MM-dd') }}.
Effectue le briefing exécutif de ma journée :
1. Fais appel au spécialiste des emails ("Email Specialist Agent") pour récupérer et analyser mes emails récents (dernières 24h), filtrer le bruit/spam et extraire les emails prioritaires nécessitant une action.
2. Fais appel au spécialiste du calendrier ("Calendar Specialist Agent") pour inspecter mon agenda Google Calendar d'aujourd'hui, lister mes réunions, calculer le temps de réunion et le temps de travail concentré disponible, et identifier d'éventuels conflits.
3. Synthétise l'ensemble de ces informations sous forme d'un objet JSON structuré respectant exactement le schéma demandé.`,
        hasOutputParser: true,
        options: {
            systemMessage: `Tu es un Assistant Exécutif IA de haut niveau. Ton rôle est d'orchestrer la préparation du briefing quotidien en déléguant précisément aux sous-agents spécialisés :
- Pour les emails : délègue à "Email Specialist Agent".
- Pour le calendrier : délègue à "Calendar Specialist Agent".
Ensuite, classe et priorise toutes les informations de manière stratégique et pragmatique (Urgent, Important, FYI, Temps libre). Fournis toujours un résultat structuré, complet et sans omission.`,
        },
    };

    @node({
        id: '1c94b1a3-e6bd-46c3-b657-3a2e3fe8e5d7',
        name: 'OpenAI GPT-4o (Coordinator)',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [420, 600],
        credentials: { openAiApi: { id: '3tpHjeLbkX5PIuNM', name: 'n8n free OpenAI API credits' } },
    })
    OpenaiGpt4oCoordinator = {
        model: {
            __rl: true,
            mode: 'id',
            value: 'gpt-4o',
        },
        options: {
            temperature: 0.2,
        },
    };

    @node({
        id: '9cb4e17b-a6ab-4c43-866f-3058c60d3cce',
        name: 'Structured Output Parser',
        type: '@n8n/n8n-nodes-langchain.outputParserStructured',
        version: 1.3,
        position: [560, 600],
    })
    StructuredOutputParser = {
        schemaType: 'manual',
        inputSchema: `{
  "type": "object",
  "properties": {
    "date": { "type": "string", "description": "Date du jour format YYYY-MM-DD" },
    "dateFormatted": { "type": "string", "description": "Date lisible en français ex: Lundi 6 Septembre 2026" },
    "executiveSummary": { "type": "string", "description": "Synthèse exécutive claire de la journée (2-3 phrases percutantes)" },
    "metrics": {
      "type": "object",
      "properties": {
        "emailsTotal": { "type": "number" },
        "emailsUrgent": { "type": "number" },
        "meetingsCount": { "type": "number" },
        "meetingsTotalHours": { "type": "number" },
        "focusHours": { "type": "number" }
      },
      "required": ["emailsTotal", "emailsUrgent", "meetingsCount", "meetingsTotalHours", "focusHours"]
    },
    "schedule": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "time": { "type": "string" },
          "title": { "type": "string" },
          "duration": { "type": "string" },
          "attendees": { "type": "array", "items": { "type": "string" } },
          "locationOrLink": { "type": "string" },
          "prepNotes": { "type": "string" },
          "isConflict": { "type": "boolean" }
        },
        "required": ["time", "title"]
      }
    },
    "priorityEmails": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "from": { "type": "string" },
          "subject": { "type": "string" },
          "category": { "type": "string", "enum": ["URGENT", "ACTION_REQUISE", "INFO_IMPORTANTE", "PROJET"] },
          "urgency": { "type": "string", "enum": ["HAUTE", "MOYENNE", "BASSE"] },
          "summary": { "type": "string" },
          "actionRequired": { "type": "string" }
        },
        "required": ["from", "subject", "category", "urgency", "summary"]
      }
    },
    "actionItems": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "task": { "type": "string" },
          "priority": { "type": "string", "enum": ["HAUTE", "MOYENNE", "BASSE"] },
          "source": { "type": "string", "enum": ["EMAIL", "CALENDRIER", "STRATÉGIQUE"] }
        },
        "required": ["task", "priority", "source"]
      }
    },
    "productivityAdvice": { "type": "string", "description": "Conseil d'organisation personnalisé pour optimiser la journée" }
  },
  "required": ["date", "executiveSummary", "metrics", "schedule", "priorityEmails", "actionItems", "productivityAdvice"]
}`,
    };

    @node({
        id: 'f6506aa2-7b8b-4556-ae60-6f0a717906ab',
        name: 'Email Specialist Agent',
        type: '@n8n/n8n-nodes-langchain.agentTool',
        version: 3,
        position: [800, 480],
    })
    EmailSpecialistAgent = {
        toolDescription:
            'Agent spécialisé dans la récupération, le filtrage et l analyse des emails récents et non lus de Gmail. Utilisé pour identifier les urgences, les demandes d action et ignorer le spam/newsletters.',
        text: 'Consulte les messages récents dans Gmail, élimine le spam et les newsletters publicitaires, analyse les expéditeurs, les sujets et les contenus pertinents, classe-les par priorité et extrait les actions requises.',
        hasOutputParser: false,
        options: {
            systemMessage:
                'Tu es un expert en gestion et tri des emails professionnels. Ton rôle est d interroger Gmail avec ton outil, d analyser les emails des dernières 24h, de distinguer le signal du bruit (ignorer promotions/newsletters automatisées), et de restituer une liste claire des emails importants avec leur degré d urgence et les réponses ou actions attendues.',
        },
    };

    @node({
        id: '4b9fb986-45a8-4c8b-8b1a-f28851b63e22',
        name: 'OpenAI GPT-4o (Email Agent)',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [740, 700],
        credentials: { openAiApi: { id: '3tpHjeLbkX5PIuNM', name: 'n8n free OpenAI API credits' } },
    })
    OpenaiGpt4oEmailAgent = {
        model: {
            __rl: true,
            mode: 'id',
            value: 'gpt-4o',
        },
        options: {
            temperature: 0.2,
        },
    };

    @node({
        id: 'ee5633f3-3d89-4bb9-9515-e31bc5805d19',
        webhookId: '2f28e146-1006-4609-abfb-c7de0ccfbe74',
        name: 'Gmail Tool',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.2,
        position: [860, 700],
    })
    GmailTool = {
        resource: 'message',
        operation: 'getAll',
        limit: 25,
        simple: false,
        filters: {
            readStatus: 'both',
        },
    };

    @node({
        id: '76b81c89-10f6-48ff-af79-c882f60bf28f',
        name: 'Calendar Specialist Agent',
        type: '@n8n/n8n-nodes-langchain.agentTool',
        version: 3,
        position: [1060, 480],
    })
    CalendarSpecialistAgent = {
        toolDescription:
            'Agent spécialisé dans l analyse du calendrier Google Calendar pour la journée en cours. Utilisé pour lister les réunions, vérifier les plages horaires, détecter les conflits d agenda et calculer le temps de travail concentré.',
        text: 'Consulte les événements de la journée sur Google Calendar, analyse les horaires de début et fin, les participants, les ordres du jour, calcule le temps total de réunion et identifie les périodes propices au travail concentré.',
        hasOutputParser: false,
        options: {
            systemMessage:
                'Tu es un expert en planification et optimisation de temps. Interroge Google Calendar pour la journée en cours, analyse minutieusement chaque rendez-vous, repère les chevauchements éventuels, note les besoins de préparation pour chaque réunion et calcule le volume d heures de réunion versus le temps libre disponible.',
        },
    };

    @node({
        id: 'ae0d3999-f403-4f45-a8a6-c2f34516afe5',
        name: 'OpenAI GPT-4o (Calendar Agent)',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [1000, 700],
        credentials: { openAiApi: { id: '3tpHjeLbkX5PIuNM', name: 'n8n free OpenAI API credits' } },
    })
    OpenaiGpt4oCalendarAgent = {
        model: {
            __rl: true,
            mode: 'id',
            value: 'gpt-4o',
        },
        options: {
            temperature: 0.2,
        },
    };

    @node({
        id: '964877d5-5a26-4641-a2ac-625557ae1cd8',
        name: 'Google Calendar Tool',
        type: 'n8n-nodes-base.googleCalendarTool',
        version: 1.3,
        position: [1120, 700],
    })
    GoogleCalendarTool = {
        resource: 'event',
        operation: 'getAll',
        calendar: {
            mode: 'list',
            value: 'primary',
        },
        limit: 25,
    };

    @node({
        id: 'a9502648-ce12-465b-af59-b71bfb4e1ada',
        name: 'Générer Dashboard HTML',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [900, 280],
    })
    GenererDashboardHtml = {
        jsCode: `// Récupération sécurisée des données produites par le Coordinator Agent
const item = items[0].json;
let data = item.output || item;

if (typeof data === 'string') {
  try {
    data = JSON.parse(data);
  } catch (e) {
    data = {
      dateFormatted: new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      executiveSummary: data,
      metrics: { emailsTotal: 0, emailsUrgent: 0, meetingsCount: 0, meetingsTotalHours: 0, focusHours: 8 },
      schedule: [],
      priorityEmails: [],
      actionItems: [],
      productivityAdvice: "Consultez vos messages et votre agenda manuellement."
    };
  }
}

const metrics = data.metrics || { emailsTotal: 0, emailsUrgent: 0, meetingsCount: 0, meetingsTotalHours: 0, focusHours: 8 };
const schedule = Array.isArray(data.schedule) ? data.schedule : [];
const emails = Array.isArray(data.priorityEmails) ? data.priorityEmails : [];
const actions = Array.isArray(data.actionItems) ? data.actionItems : [];
const dateStr = data.dateFormatted || new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const summary = data.executiveSummary || "Votre journée est prête à être organisée.";
const advice = data.productivityAdvice || "Priorisez les tâches à fort impact durant vos plages de concentration.";

// Construction des blocs HTML
const scheduleHtml = schedule.length > 0
  ? schedule.map(ev => \`
    <div class="timeline-item \${ev.isConflict ? 'conflict' : ''}">
      <div class="time-badge">\${ev.time || '--:--'} (\${ev.duration || '30m'})</div>
      <div class="timeline-content">
        <div class="timeline-header">
          <h4 class="event-title">\${ev.title || 'Réunion'}</h4>
          \${ev.isConflict ? '<span class="badge badge-danger">⚠️ Conflit détecté</span>' : ''}
        </div>
        \${ev.locationOrLink ? \`<p class="event-meta">📍 \${ev.locationOrLink}</p>\` : ''}
        \${ev.attendees && ev.attendees.length ? \`<p class="event-meta">👥 \${ev.attendees.join(', ')}</p>\` : ''}
        \${ev.prepNotes ? \`<div class="event-prep">💡 \${ev.prepNotes}</div>\` : ''}
      </div>
    </div>
  \`).join('')
  : '<p class="empty-state">🎉 Aucun rendez-vous prévu aujourd\\'hui. Excellente journée pour avancer en profondeur !</p>';

const emailsHtml = emails.length > 0
  ? emails.map(em => {
      const badgeClass = em.urgency === 'HAUTE' ? 'badge-danger' : em.urgency === 'MOYENNE' ? 'badge-warning' : 'badge-info';
      return \`
        <div class="card email-card">
          <div class="email-header">
            <div>
              <span class="badge \${badgeClass}">\${em.urgency || 'NORMAL'}</span>
              <span class="email-category">\${em.category || 'Email'}</span>
            </div>
            <span class="email-sender">\${em.from || 'Expéditeur inconnu'}</span>
          </div>
          <h4 class="email-subject">\${em.subject || '(Sans objet)'}</h4>
          <p class="email-summary">\${em.summary || ''}</p>
          \${em.actionRequired ? \`<div class="action-box"><strong>Action :</strong> \${em.actionRequired}</div>\` : ''}
        </div>
      \`;
    }).join('')
  : '<p class="empty-state">📬 Aucun email urgent détecté. Votre boîte de réception est sous contrôle !</p>';

const actionsHtml = actions.length > 0
  ? actions.map(act => {
      const priorityClass = act.priority === 'HAUTE' ? 'p-high' : act.priority === 'MOYENNE' ? 'p-medium' : 'p-low';
      return \`
        <li class="action-item">
          <input type="checkbox" id="check-\${Math.random().toString(36).substring(7)}" />
          <div class="action-content">
            <span class="action-text">\${act.task}</span>
            <div class="action-tags">
              <span class="priority-pill \${priorityClass}">\${act.priority}</span>
              <span class="source-tag">🏷️ \${act.source || 'Général'}</span>
            </div>
          </div>
        </li>
      \`;
    }).join('')
  : '<p class="empty-state">✅ Aucune action urgente en attente.</p>';

const html = \`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Dashboard - \${dateStr}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --surface: #111827;
      --surface-border: #1f2937;
      --surface-hover: #1e293b;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --primary: #6366f1;
      --primary-light: #818cf8;
      --accent: #06b6d4;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --radius: 16px;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: radial-gradient(circle at top right, #1e1b4b 0%, var(--bg) 60%);
      color: var(--text-main);
      min-height: 100vh;
      padding: 32px 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--surface-border);
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-title h1 {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #ffffff 0%, var(--text-muted) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .header-title p {
      color: var(--accent);
      font-size: 1rem;
      margin-top: 4px;
      text-transform: capitalize;
      font-weight: 500;
    }
    .header-badges {
      display: flex;
      gap: 10px;
    }
    .chip {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: var(--primary-light);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Executive summary card */
    .hero-card {
      background: linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(17, 24, 39, 0.9) 100%);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 32px;
      box-shadow: var(--shadow);
      position: relative;
      overflow: hidden;
    }
    .hero-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 6px; height: 100%;
      background: linear-gradient(to bottom, var(--primary), var(--accent));
    }
    .hero-title {
      font-size: 0.9rem;
      color: var(--primary-light);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hero-text {
      font-size: 1.15rem;
      line-height: 1.6;
      color: #f3f4f6;
    }
    .hero-advice {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      font-size: 0.95rem;
      font-style: italic;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 18px;
      margin-bottom: 36px;
    }
    .metric-box {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius);
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: var(--shadow);
    }
    .metric-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    .m-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .m-red { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .m-indigo { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
    .m-green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .metric-info .val {
      font-size: 1.6rem;
      font-weight: 800;
      line-height: 1.1;
    }
    .metric-info .lbl {
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
      margin-top: 4px;
    }

    /* Main layout columns */
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
    }
    @media (max-width: 900px) {
      .main-grid { grid-template-columns: 1fr; }
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    .column-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Timeline Calendar */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .timeline-item {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius);
      padding: 16px 20px;
      display: flex;
      gap: 16px;
      transition: all 0.2s;
    }
    .timeline-item:hover {
      background: var(--surface-hover);
      border-color: #374151;
    }
    .timeline-item.conflict {
      border-color: rgba(239, 68, 68, 0.6);
      background: rgba(239, 68, 68, 0.06);
    }
    .time-badge {
      background: #1f2937;
      color: #93c5fd;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      height: fit-content;
      white-space: nowrap;
    }
    .timeline-content { flex: 1; }
    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .event-title {
      font-size: 1.05rem;
      font-weight: 600;
      color: #f9fafb;
    }
    .event-meta {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .event-prep {
      margin-top: 8px;
      padding: 6px 10px;
      background: rgba(99, 102, 241, 0.1);
      border-left: 3px solid var(--primary);
      border-radius: 4px;
      font-size: 0.85rem;
      color: #e0e7ff;
    }

    /* Emails */
    .emails-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius);
      padding: 18px 20px;
      transition: all 0.2s;
    }
    .card:hover {
      background: var(--surface-hover);
      border-color: #374151;
    }
    .email-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: 0.85rem;
    }
    .email-sender {
      color: var(--text-muted);
      font-size: 0.85rem;
      max-width: 240px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .email-category {
      color: var(--text-muted);
      margin-left: 6px;
      font-size: 0.8rem;
    }
    .email-subject {
      font-size: 1.05rem;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .email-summary {
      color: #d1d5db;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .action-box {
      margin-top: 10px;
      padding: 8px 12px;
      background: rgba(245, 158, 11, 0.1);
      border-left: 3px solid var(--warning);
      border-radius: 4px;
      font-size: 0.85rem;
      color: #fef3c7;
    }

    /* Badges */
    .badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .badge-danger { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
    .badge-warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-info { background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); }

    /* Action checklist */
    .actions-card {
      margin-top: 32px;
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: var(--radius);
      padding: 24px;
    }
    .actions-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }
    .action-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      transition: background 0.15s;
    }
    .action-item:hover { background: rgba(255, 255, 255, 0.05); }
    .action-item input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: var(--primary);
    }
    .action-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex: 1;
      gap: 12px;
      flex-wrap: wrap;
    }
    .action-text {
      font-size: 0.95rem;
      font-weight: 500;
    }
    .action-tags {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .priority-pill {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .p-high { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .p-medium { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .p-low { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .source-tag {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .empty-state {
      padding: 30px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.95rem;
      background: rgba(255, 255, 255, 0.01);
      border-radius: var(--radius);
      border: 1px dashed var(--surface-border);
    }

    footer {
      margin-top: 48px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
      padding-top: 20px;
      border-top: 1px solid var(--surface-border);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-title">
        <h1>Briefing Quotidien Multi-Agents</h1>
        <p>📅 \${dateStr}</p>
      </div>
      <div class="header-badges">
        <span class="chip">🤖 Multi-Agents Orchestré</span>
        <span class="chip">⚡ Live n8n Engine</span>
      </div>
    </header>

    <div class="hero-card">
      <div class="hero-title">⚡ Synthèse Stratégique du Jour</div>
      <div class="hero-text">\${summary}</div>
      <div class="hero-advice">💡 <strong>Recommandation :</strong> \${advice}</div>
    </div>

    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-icon m-blue">✉️</div>
        <div class="metric-info">
          <div class="val">\${metrics.emailsTotal}</div>
          <div class="lbl">Emails Analysés</div>
        </div>
      </div>
      <div class="metric-box">
        <div class="metric-icon m-red">🚨</div>
        <div class="metric-info">
          <div class="val">\${metrics.emailsUrgent}</div>
          <div class="lbl">Emails Urgents</div>
        </div>
      </div>
      <div class="metric-box">
        <div class="metric-icon m-indigo">🗓️</div>
        <div class="metric-info">
          <div class="val">\${metrics.meetingsCount} (\${metrics.meetingsTotalHours}h)</div>
          <div class="lbl">Réunions du Jour</div>
        </div>
      </div>
      <div class="metric-box">
        <div class="metric-icon m-green">🎯</div>
        <div class="metric-info">
          <div class="val">\${metrics.focusHours}h</div>
          <div class="lbl">Temps de Focus Dispo</div>
        </div>
      </div>
    </div>

    <div class="main-grid">
      <div class="column">
        <div class="column-header">
          <h2>🗓️ Agenda & Réunions</h2>
        </div>
        <div class="timeline">
          \${scheduleHtml}
        </div>
      </div>

      <div class="column">
        <div class="column-header">
          <h2>📬 Emails Prioritaires & Triés</h2>
        </div>
        <div class="emails-list">
          \${emailsHtml}
        </div>
      </div>
    </div>

    <div class="actions-card">
      <div class="column-header">
        <h2>✅ Actions Recommandées & Priorités</h2>
      </div>
      <ul class="actions-list">
        \${actionsHtml}
      </ul>
    </div>

    <footer>
      Généré automatiquement par le workflow multi-agents n8n • Google Suite & AI Assistant
    </footer>
  </div>
</body>
</html>\`;

return [{
  json: {
    ...data,
    htmlDashboard: html
  }
}];`,
    };

    @node({
        id: 'cc66df38-965a-44e4-bfc9-9bacd47c8221',
        name: 'Respond to Webhook',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.5,
        position: [1140, 280],
    })
    RespondToWebhook = {
        respondWith: 'text',
        responseBody: '={{ $json.htmlDashboard }}',
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ScheduleTriggerDaily8h.out(0).to(this.DailyCoordinatorAgent.in(0));
        this.ManualTrigger.out(0).to(this.DailyCoordinatorAgent.in(0));
        this.WebhookDashboardView.out(0).to(this.DailyCoordinatorAgent.in(0));
        this.DailyCoordinatorAgent.out(0).to(this.GenererDashboardHtml.in(0));
        this.GenererDashboardHtml.out(0).to(this.RespondToWebhook.in(0));

        this.DailyCoordinatorAgent.uses({
            ai_languageModel: this.OpenaiGpt4oCoordinator.output,
            ai_outputParser: this.StructuredOutputParser.output,
            ai_tool: [this.EmailSpecialistAgent.output, this.CalendarSpecialistAgent.output],
        });
        this.EmailSpecialistAgent.uses({
            ai_languageModel: this.OpenaiGpt4oEmailAgent.output,
            ai_tool: [this.GmailTool.output],
        });
        this.CalendarSpecialistAgent.uses({
            ai_languageModel: this.OpenaiGpt4oCalendarAgent.output,
            ai_tool: [this.GoogleCalendarTool.output],
        });
    }
}
