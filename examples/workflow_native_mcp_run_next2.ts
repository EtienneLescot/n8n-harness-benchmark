import { workflow, node, trigger, tool, languageModel, outputParser, ifElse, newCredential, expr } from '@n8n/workflow-sdk';

// ── Modèle de Langage ────────────────────────────────────────────────────────
const openAiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI Chat Model',
    parameters: {
      model: { __rl: true, mode: 'id', value: 'gpt-5-mini' }
    },
    credentials: { openAiApi: newCredential('n8n free OpenAI API credits') }
  }
});

// ── Outils Spécialisés ───────────────────────────────────────────────────────
const gmailToolNode = tool({
  type: 'n8n-nodes-base.gmailTool',
  version: 2.2,
  config: {
    name: 'Gmail_Scanner',
    parameters: {
      resource: 'message',
      operation: 'getAll',
      simple: true,
      filters: { readStatus: 'both' }
    },
    credentials: { gmailOAuth2: newCredential('Gmail') }
  }
});

const gcalToolNode = tool({
  type: 'n8n-nodes-base.googleCalendarTool',
  version: 1.3,
  config: {
    name: 'Google_Calendar_Agenda',
    parameters: {
      resource: 'event',
      operation: 'getAll',
      calendar: {
        __rl: true,
        mode: 'list',
        value: 'primary'
      },
      timeMin: expr('{{ $today }}'),
      timeMax: expr('{{ $today.plus({ days: 1 }) }}')
    },
    credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar') }
  }
});

// ── Sous-Agent 1 : Spécialiste Triage Emails ─────────────────────────────────
const emailTriageAgent = tool({
  type: '@n8n/n8n-nodes-langchain.agentTool',
  version: 3,
  config: {
    name: 'Agent_Triage_Emails',
    parameters: {
      toolDescription: 'Agent spécialisé dans l analyse, le filtrage et la priorisation des emails Gmail récents (dernières 24h). Détecte les urgences, classe par catégorie (Urgent, Action Requise, Pour Information, Newsletter) et extrait les actions attendues.',
      text: 'Examine les emails récents via Gmail_Scanner. Trie-les par niveau d urgence et résume chaque message avec l action concrète à mener.'
    },
    subnodes: {
      model: openAiModel,
      tools: [gmailToolNode]
    }
  }
});

// ── Sous-Agent 2 : Spécialiste Agenda & Calendrier ───────────────────────────
const calendarAgent = tool({
  type: '@n8n/n8n-nodes-langchain.agentTool',
  version: 3,
  config: {
    name: 'Agent_Agenda_Calendrier',
    parameters: {
      toolDescription: 'Agent expert en gestion d agenda Google Calendar. Analyse les réunions du jour, ordonne la timeline, détecte les chevauchements ou conflits, identifie les temps de préparation requis et calcule les plages de travail concentré (Deep Work).',
      text: 'Examine les événements du jour via Google_Calendar_Agenda. Analyse les horaires, les participants, les liens de visio et identifie les réunions critiques ainsi que les créneaux libres.'
    },
    subnodes: {
      model: openAiModel,
      tools: [gcalToolNode]
    }
  }
});

// ── Parser Structuré pour Sortie Dashboard ────────────────────────────────────
const dashboardDataParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Dashboard_Data_Parser',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: JSON.stringify({
        dateFormatted: 'Lundi 7 Septembre 2026',
        dayStatus: 'Journée Équilibrée',
        statusColor: 'emerald',
        executiveSummary: 'Une matinée concentrée sur le stratégique avec 2 réunions clés, suivie d une après-midi disponible pour le travail de fond.',
        topPriorities: [
          'Valider le devis pour le client ACME avant 12h00',
          'Préparer la réunion de cadrage équipe de 14h00',
          'Finaliser la revue budgétaire Q3'
        ],
        metrics: {
          meetingCount: 3,
          totalMeetingDuration: '2h30',
          deepWorkHours: '4h00',
          urgentEmailCount: 2,
          actionCount: 5
        },
        agendaEvents: [
          {
            time: '09:30 - 10:15',
            title: 'Point d Équipe Hebdomadaire',
            type: 'Équipe',
            attendees: 'Alice, Bob, Claire',
            locationOrLink: 'https://meet.google.com/abc-defg-hij',
            prepNotes: 'Revoir le rapport d avancement transmis par Alice.',
            priority: 'Haute'
          },
          {
            time: '11:00 - 11:45',
            title: 'Revue Projet Client ACME',
            type: 'Client',
            attendees: 'Marc (Directeur ACME), Etienne',
            locationOrLink: 'https://meet.google.com/klm-nopq-rst',
            prepNotes: 'Avoir les chiffres du devis sous la main.',
            priority: 'Critique'
          },
          {
            time: '16:00 - 16:30',
            title: '1-on-1 Synchronisation',
            type: 'Interne',
            attendees: 'Thomas',
            locationOrLink: 'Google Meet',
            prepNotes: 'Point de suivi sur les livrables de la semaine.',
            priority: 'Normale'
          }
        ],
        triagedEmails: [
          {
            from: 'Marc Lefebvre <marc@acme-corp.com>',
            subject: 'Validation finale du contrat & planning',
            category: 'Urgent',
            badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
            summary: 'Demande la signature électronique du contrat avant midi pour enclencher la facturation.',
            suggestedAction: 'Ouvrir le lien DocuSign et signer avant la réunion de 11h.',
            deadline: 'Aujourd hui 12h00'
          },
          {
            from: 'Sophie Martin <sophie@partenaire.fr>',
            subject: 'Retour sur les maquettes UI',
            category: 'Action Requise',
            badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
            summary: 'Commentaires reçus sur le prototype v2, attend notre validation pour démarrer l intégration.',
            suggestedAction: 'Consulter Figma et envoyer un email de validation.',
            deadline: 'Aujourd hui 17h00'
          },
          {
            from: 'GitHub Notifications',
            subject: '[Repository] New security advisory published',
            category: 'Pour Information',
            badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
            summary: 'Mise à jour de dépendance mineure disponible.',
            suggestedAction: 'À traiter lors de la prochaine maintenance.',
            deadline: 'Fin de semaine'
          }
        ],
        actionChecklist: [
          { task: 'Signer et retourner le contrat ACME', dueTime: '11h00', priority: 'Critique' },
          { task: 'Envoyer les slides de cadrage à Thomas', dueTime: '13h30', priority: 'Haute' },
          { task: 'Répondre à Sophie Martin sur les maquettes', dueTime: '15h00', priority: 'Moyenne' },
          { task: 'Planifier la session de tests Q4', dueTime: '17h30', priority: 'Basse' }
        ],
        strategicAdvice: 'Votre après-midi de 13h30 à 16h00 est dégagée de toute réunion : réservez ce bloc de 2h30 en mode Ne Pas Déranger pour boucler vos livrables de fond.'
      })
    }
  }
});

// ── Déclencheurs (Triggers) ──────────────────────────────────────────────────
const scheduleTriggerNode = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Déclencheur Quotidien (Matin 07h30)',
    parameters: {
      rule: {
        interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 30 }]
      }
    }
  }
});

const manualTriggerNode = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Test Manuel Canvas' }
});

const webhookTriggerNode = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'GET Webhook Dashboard',
    parameters: {
      httpMethod: 'GET',
      path: 'dashboard-journee',
      responseMode: 'responseNode',
      options: {}
    }
  }
});

// ── Agent Superviseur Exécutif ───────────────────────────────────────────────
const supervisorAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Superviseur_Executif_Briefing',
    parameters: {
      promptType: 'define',
      text: expr('Nous sommes le {{ $now.setZone("Europe/Paris").toFormat("cccc d MMMM yyyy", { locale: "fr" }) }}. Coordonne l Agent_Triage_Emails et l Agent_Agenda_Calendrier. Interroge les emails récents et le calendrier du jour. Trie toutes les informations par ordre de priorité et produis la structure JSON complète pour le dashboard de la journée.'),
      hasOutputParser: true,
      options: {
        systemMessage: 'Tu es le Superviseur Exécutif IA. Tu coordonnes deux agents spécialisés : Agent_Triage_Emails et Agent_Agenda_Calendrier. Tu croises les réunions du jour avec les messages urgents reçus, définis le Top 3 des priorités et fournis une analyse stratégique pour optimiser la journée de l utilisateur. Tu retournes toujours un objet JSON valide conforme au schéma du parser.'
      }
    },
    subnodes: {
      model: openAiModel,
      tools: [emailTriageAgent, calendarAgent],
      outputParser: dashboardDataParser
    }
  }
});

// ── Générateur HTML du Dashboard ─────────────────────────────────────────────
const buildHtmlNode = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Générateur Dashboard HTML',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `
const inputItem = $input.all()[0]?.json || {};
let data = inputItem.output || inputItem;

if (typeof data === 'string') {
  try {
    data = JSON.parse(data);
  } catch (e) {
    const match = data.match(/\\{([\\s\\S]*)\\}/);
    if (match) {
      try { data = JSON.parse(match[0]); } catch(err) {}
    }
  }
}

const now = new Date();
const dateStr = data.dateFormatted || now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const dayStatus = data.dayStatus || 'Journée Organisée';
const executiveSummary = data.executiveSummary || 'Voici votre briefing quotidien préparé par vos agents IA. Vos priorités et votre agenda sont synchronisés.';
const topPriorities = Array.isArray(data.topPriorities) ? data.topPriorities : ['Traiter les urgences du matin', 'Assister aux réunions planifiées', 'Avancer sur les projets prioritaires'];
const metrics = data.metrics || { meetingCount: 3, totalMeetingDuration: '2h30', deepWorkHours: '3h30', urgentEmailCount: 2, actionCount: 4 };
const agendaEvents = Array.isArray(data.agendaEvents) ? data.agendaEvents : [];
const triagedEmails = Array.isArray(data.triagedEmails) ? data.triagedEmails : [];
const actionChecklist = Array.isArray(data.actionChecklist) ? data.actionChecklist : [];
const strategicAdvice = data.strategicAdvice || 'Optimisez vos plages de concentration l après-midi et traitez vos emails par blocs.';

const prioritiesHtml = topPriorities.map((p, idx) => \`
  <li class="flex items-start gap-3 bg-white/70 p-3 rounded-xl border border-indigo-100 shadow-sm">
    <span class="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">\${idx + 1}</span>
    <span class="text-sm font-medium text-slate-800">\${p}</span>
  </li>
\`).join('');

const agendaHtml = agendaEvents.map(evt => {
  const prioColor = evt.priority === 'Critique' ? 'bg-rose-500' : (evt.priority === 'Haute' ? 'bg-amber-500' : 'bg-indigo-500');
  return \`
    <div class="relative pl-6 pb-6 border-l-2 border-indigo-200 last:border-l-0 last:pb-0">
      <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full \${prioColor} ring-4 ring-white"></div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
          <span class="text-xs font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">\${evt.time || ''}</span>
          <span class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">\${evt.type || 'Réunion'}</span>
        </div>
        <h4 class="text-base font-bold text-slate-900 mb-1">\${evt.title || 'Sans titre'}</h4>
        <p class="text-xs text-slate-500 mb-2">👥 Participants : \${evt.attendees || 'Non spécifiés'}</p>
        \${evt.prepNotes ? \`<div class="text-xs bg-amber-50/70 border border-amber-200/60 rounded-lg p-2 text-amber-900 mb-2">💡 <strong>Préparation :</strong> \${evt.prepNotes}</div>\` : ''}
        \${evt.locationOrLink ? \`<a href="\${evt.locationOrLink}" target="_blank" class="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"><span>📹 Rejoindre la visio</span></a>\` : ''}
      </div>
    </div>
  \`;
}).join('');

const emailsHtml = triagedEmails.map(em => {
  const isUrgent = (em.category || '').toLowerCase().includes('urgent');
  const cardBorder = isUrgent ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200 bg-white';
  const badgeClass = em.badgeClass || (isUrgent ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800');
  return \`
    <div class="rounded-xl p-4 border \${cardBorder} shadow-sm hover:shadow transition">
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full \${badgeClass}">\${em.category || 'Email'}</span>
        <span class="text-xs text-slate-400 font-medium">\${em.deadline ? '⏱ ' + em.deadline : ''}</span>
      </div>
      <h4 class="text-sm font-bold text-slate-900 mb-1 line-clamp-1">\${em.subject || 'Sans objet'}</h4>
      <p class="text-xs text-slate-500 mb-2">De : \${em.from || 'Inconnu'}</p>
      <p class="text-xs text-slate-700 mb-3 leading-relaxed">\${em.summary || ''}</p>
      \${em.suggestedAction ? \`<div class="text-xs bg-slate-100/80 rounded-lg p-2 font-medium text-slate-800">⚡ <strong>Action :</strong> \${em.suggestedAction}</div>\` : ''}
    </div>
  \`;
}).join('');

const tasksHtml = actionChecklist.map((t, idx) => \`
  <label class="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer select-none">
    <div class="flex items-center gap-3">
      <input type="checkbox" id="task-\${idx}" class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" onchange="this.nextElementSibling.classList.toggle('line-through'); this.nextElementSibling.classList.toggle('text-slate-400');">
      <span class="text-sm font-medium text-slate-800">\${t.task}</span>
    </div>
    <span class="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">\${t.dueTime || ''}</span>
  </label>
\`).join('');

const fullHtml = \`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard du Jour | Assistant Exécutif IA</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased min-h-screen">
  <!-- Header / Navigation Bar -->
  <header class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-xl shadow-inner">🌅</div>
        <div>
          <h1 class="text-lg font-extrabold tracking-tight">Executive Morning Dashboard</h1>
          <p class="text-xs text-indigo-200 capitalize">\${dateStr}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          \${dayStatus}
        </span>
        <button onclick="window.location.reload();" class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur border border-white/10 transition flex items-center gap-1.5">
          <span>🔄 Actualiser</span>
        </button>
        <button onclick="window.print();" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shadow-md transition">
          <span>🖨 Imprimer</span>
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Top Executive Summary Card -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
      <div class="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div class="lg:col-span-2 space-y-3">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/30 border border-indigo-400/20 text-xs font-bold uppercase tracking-wider text-indigo-200">
            🤖 Briefing Superviseur Exécutif
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white leading-tight">Vision Stratégique de Votre Journée</h2>
          <p class="text-sm sm:text-base text-indigo-100/90 leading-relaxed">\${executiveSummary}</p>
          <div class="pt-2">
            <div class="text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">🎯 Top 3 des Priorités Absolues</div>
            <ul class="space-y-2">
              \${prioritiesHtml}
            </ul>
          </div>
        </div>

        <div class="bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 space-y-4">
          <div class="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
            <span>💡 Conseil Focus & Deep Work</span>
          </div>
          <p class="text-xs text-indigo-100 leading-relaxed">\${strategicAdvice}</p>
          <div class="pt-2 border-t border-white/10 text-[11px] text-indigo-200 flex items-center justify-between">
            <span>Système Multi-Agents n8n</span>
            <span>Gmail + Calendar</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4 Metrics KPIs -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-200 transition">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-500 uppercase">Réunions Prévues</span>
          <span class="p-2 rounded-xl bg-indigo-50 text-indigo-600 text-lg">📅</span>
        </div>
        <div class="text-2xl font-black text-slate-900">\${metrics.meetingCount || 0}</div>
        <div class="text-xs text-slate-500 mt-1">Durée cumulée : \${metrics.totalMeetingDuration || '0h'}</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-200 transition">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-500 uppercase">Plage Deep Work</span>
          <span class="p-2 rounded-xl bg-emerald-50 text-emerald-600 text-lg">⚡</span>
        </div>
        <div class="text-2xl font-black text-emerald-700">\${metrics.deepWorkHours || '0h'}</div>
        <div class="text-xs text-slate-500 mt-1">Temps sans interruption</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-200 transition">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-500 uppercase">Emails Prioritaires</span>
          <span class="p-2 rounded-xl bg-rose-50 text-rose-600 text-lg">📬</span>
        </div>
        <div class="text-2xl font-black text-rose-600">\${metrics.urgentEmailCount || 0}</div>
        <div class="text-xs text-slate-500 mt-1">Requérant une réponse rapide</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-200 transition">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-500 uppercase">Actions à Clôturer</span>
          <span class="p-2 rounded-xl bg-amber-50 text-amber-600 text-lg">✅</span>
        </div>
        <div class="text-2xl font-black text-amber-600">\${metrics.actionCount || 0}</div>
        <div class="text-xs text-slate-500 mt-1">Tâches inscrites au plan</div>
      </div>
    </div>

    <!-- Main Content 2-Column Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Left Column: Agenda Timeline -->
      <div class="lg:col-span-7 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">📅</span>
            <h3 class="text-lg font-black text-slate-900">Agenda & Timeline de la Journée</h3>
          </div>
          <span class="text-xs text-slate-500 font-medium">Google Calendar</span>
        </div>
        
        <div class="bg-slate-100/50 p-6 rounded-2xl border border-slate-200/70 space-y-4">
          \${agendaHtml || '<p class="text-sm text-slate-500 italic">Aucune réunion programmée pour aujourd hui. Journée 100% libre pour le travail de fond.</p>'}
        </div>
      </div>

      <!-- Right Column: Emails Triage & Tasks Checklist -->
      <div class="lg:col-span-5 space-y-8">
        <!-- Emails Triage -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">📬</span>
              <h3 class="text-lg font-black text-slate-900">Triage Intelligent Gmail</h3>
            </div>
            <span class="text-xs text-slate-500 font-medium">Agent Spécialisé</span>
          </div>

          <div class="space-y-3">
            \${emailsHtml || '<p class="text-sm text-slate-500 italic">Boîte de réception à jour. Aucun email urgent.</p>'}
          </div>
        </div>

        <!-- Action Items Checklist -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">✅</span>
              <h3 class="text-lg font-black text-slate-900">Plan d Action & To-Do</h3>
            </div>
            <span class="text-xs text-slate-500 font-medium">Interactif</span>
          </div>

          <div class="space-y-2">
            \${tasksHtml || '<p class="text-sm text-slate-500 italic">Toutes les actions du jour sont terminées.</p>'}
          </div>
        </div>
      </div>
    </div>
  </main>

  <footer class="border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-400">
    <p>Workflow Multi-Agents n8n • Orchestration IA (Agent Gmail + Agent Calendar + Superviseur Exécutif) • Généré en temps réel</p>
  </footer>
</body>
</html>\`;

return [{
  json: {
    html: fullHtml,
    executiveSummary: executiveSummary,
    dayStatus: dayStatus,
    dateFormatted: dateStr,
    metrics: metrics
  }
}];
`
    }
  }
});

// ── Branchement Conditionnel (Webhook vs Automatisé) ─────────────────────────
const checkWebhookMode = ifElse({
  type: 'n8n-nodes-base.if',
  version: 2.3,
  config: {
    name: 'Est-ce un appel Webhook ?',
    parameters: {
      conditions: {
        combinator: 'and',
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [
          {
            id: 'cond_webhook',
            leftValue: expr('{{ $execution.mode }}'),
            operator: { type: 'string', operation: 'equals' },
            rightValue: 'webhook'
          }
        ]
      }
    }
  }
});

const respondHtmlNode = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.1,
  config: {
    name: 'Réponse Webhook (Page HTML)',
    parameters: {
      respondWith: 'text',
      responseBody: expr('{{ $json.html }}'),
      options: {
        responseHeaders: {
          entries: [
            { name: 'Content-Type', value: 'text/html; charset=utf-8' }
          ]
        }
      }
    }
  }
});

const logBriefingNode = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Journal Briefing du Jour',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `
const item = $input.all()[0]?.json || {};
return [{
  json: {
    status: 'success',
    executedAt: new Date().toISOString(),
    dayStatus: item.dayStatus,
    date: item.dateFormatted,
    summary: item.executiveSummary,
    metrics: item.metrics,
    htmlPreviewLength: (item.html || '').length
  }
}];
`
    }
  }
});

// ── Construction du Workflow ────────────────────────────────────────────────
export default workflow('multi-agent-daily-dashboard', 'Assistant Quotidien Multi-Agents : Triage Emails, Calendrier & Dashboard')
  .add(scheduleTriggerNode).to(supervisorAgent)
  .add(manualTriggerNode).to(supervisorAgent)
  .add(webhookTriggerNode).to(supervisorAgent)
  .to(buildHtmlNode)
  .to(checkWebhookMode)
  .add(checkWebhookMode.onTrue(respondHtmlNode))
  .add(checkWebhookMode.onFalse(logBriefingNode));