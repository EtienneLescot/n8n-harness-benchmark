import {
  workflow,
  node,
  trigger,
  languageModel,
  expr
} from '@n8n/workflow-sdk';

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.2,
  config: {
    name: 'Daily Schedule Trigger (8:00 AM)',
    parameters: {
      rule: {
        interval: [{ field: 'cronExpression', expression: '0 8 * * *' }]
      }
    },
    position: [100, 300]
  }
});

const fetchEmails = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.1,
  config: {
    name: 'Fetch Daily Google Mails',
    parameters: {
      resource: 'message',
      operation: 'getAll',
      returnAll: false,
      limit: 20,
      filters: {
        q: 'newer_than:1d is:unread'
      }
    },
    position: [360, 180]
  }
});

const fetchCalendar = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: {
    name: 'Fetch Today Google Calendar Events',
    parameters: {
      resource: 'event',
      operation: 'getAll',
      calendar: {
        __rl: true,
        value: 'primary',
        mode: 'list'
      },
      timeMin: expr("{{ $today.startOf('day').toISO() }}"),
      timeMax: expr("{{ $today.endOf('day').toISO() }}")
    },
    position: [360, 440]
  }
});

const mergeFeeds = node({
  type: 'n8n-nodes-base.merge',
  version: 3,
  config: {
    name: 'Merge Ingested Feeds',
    parameters: {
      mode: 'combine',
      combineBy: 'combineAll'
    },
    position: [620, 300]
  }
});

const geminiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  version: 1,
  config: {
    name: 'Gemini 3.8 Flash LLM',
    parameters: {
      modelName: 'gemini-2.5-flash',
      options: { temperature: 0.2 }
    },
    position: [900, 520]
  }
});

const triageAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 1.7,
  config: {
    name: 'Multi-Agent Daily Triage & Synthesis',
    parameters: {
      promptType: 'define',
      text: expr("=Analyze the following unread emails and calendar events:\n{{ JSON.stringify($json) }}\n\nTriage into:\n1. URGENT ACTION ITEMS (High priority emails requiring immediate reply or decision)\n2. SCHEDULE & PREP (Meetings, conflict detection, buffer time warnings, preparation notes)\n3. GENERAL DIGEST (Low-priority updates, newsletters, FYI)\n4. EXECUTIVE DAILY SUMMARY (A 3-sentence high-level overview for today).\n\nOutput a structured JSON with keys: executiveSummary, urgentItems, calendarAgenda, lowPriorityDigest, totalEmailsAnalyzed, totalMeetingsToday."),
      hasOutputParser: true
    },
    subnodes: {
      model: geminiModel
    },
    position: [900, 300]
  }
});

const htmlDashboard = node({
  type: 'n8n-nodes-base.html',
  version: 1.2,
  config: {
    name: 'Generate HTML Dashboard of the Day',
    parameters: {
      operation: 'generateHtmlTemplate',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Daily Briefing & Triage Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 32px 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #2563eb, #7c3aed); border-radius: 16px; padding: 32px; margin-bottom: 28px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 24px; margin-bottom: 20px; }
    .badge { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .badge-urgent { background: #ef4444; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌅 Executive Daily Briefing (Native MCP)</h1>
      <p>{{ $json.executiveSummary }}</p>
    </div>
    <div class="card">
      <h3><span class="badge badge-urgent">Urgent</span> 🚨 Action Items</h3>
      <div>{{ $json.urgentItems }}</div>
    </div>
    <div class="card">
      <h3>📅 Today's Agenda & Conflicts</h3>
      <div>{{ $json.calendarAgenda }}</div>
    </div>
  </div>
</body>
</html>`
    },
    position: [1200, 300]
  }
});

export default workflow('daily-briefing-native-mcp', 'Daily Briefing & Multi-Agent Triage (Native MCP)')
  .add(scheduleTrigger)
  .to(fetchEmails)
  .to(mergeFeeds.input(0))
  .add(scheduleTrigger)
  .to(fetchCalendar)
  .to(mergeFeeds.input(1))
  .add(mergeFeeds)
  .to(triageAgent)
  .to(htmlDashboard);
