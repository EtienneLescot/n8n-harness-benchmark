import { workflow, node, trigger, sticky, placeholder, newCredential, merge, languageModel, outputParser, expr } from '@n8n/workflow-sdk';

const gmailCred = newCredential('Gmail');

const briefingModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'Briefing Model',
    parameters: {
      model: { __rl: true, mode: 'list', value: 'gpt-5.4', cachedResultName: 'gpt-5.4' },
      options: { reasoningEffort: 'low' }
    },
    credentials: { openAiApi: newCredential('OpenAI') },
    position: [660, 900]
  }
});

const dailyTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Every Morning At 07:00',
    parameters: {
      rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 0 }] }
    },
    position: [-180, 340]
  },
  output: [{}]
});

const fetchInbox = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Fetch Inbox Since Midnight',
    parameters: {
      resource: 'message',
      operation: 'getAll',
      returnAll: false,
      limit: 50,
      simple: true,
      filters: {
        includeSpamTrash: false,
        readStatus: 'both',
        receivedAfter: expr('{{ $today.toISO() }}')
      }
    },
    credentials: { gmailOAuth2: gmailCred },
    position: [60, 140]
  },
  output: [{ id: '18f2a', threadId: '18f2a', From: 'jane@acme.com', To: 'me@example.com', Subject: 'Contract signature needed today', snippet: 'We need the countersigned SOW before 11:00 to keep the start date.', labels: [{ id: 'INBOX', name: 'INBOX' }], internalDate: '1757550000000' }]
});

const bundleEmails = node({
  type: 'n8n-nodes-base.aggregate',
  version: 1,
  config: {
    name: 'Bundle Emails',
    parameters: {
      aggregate: 'aggregateAllItemData',
      destinationFieldName: 'emails',
      include: 'specifiedFields',
      fieldsToInclude: 'id, threadId, From, To, Subject, snippet, labels, internalDate'
    },
    alwaysOutputData: true,
    position: [280, 140]
  },
  output: [{ emails: [{ id: '18f2a', From: 'jane@acme.com', Subject: 'Contract signature needed today', snippet: 'We need the countersigned SOW before 11:00 to keep the start date.' }] }]
});

const emailTriageParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Email Triage Schema',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "urgent": [{ "from": "jane@acme.com", "subject": "Contract signature needed today", "why": "Hard deadline at 11:00", "action": "Send the countersigned SOW" }], "needsReply": [{ "from": "bob@acme.com", "subject": "Re: Q3 numbers", "why": "Waiting on your figures", "action": "Reply with the revenue table" }], "fyi": ["AI Weekly newsletter", "Invoice 4021 paid"], "counts": { "total": 24, "urgent": 1, "needsReply": 3, "fyi": 20 } }'
    },
    position: [520, 320]
  }
});

const emailTriageAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Email Triage Agent',
    parameters: {
      promptType: 'define',
      text: expr('Date: {{ $now.toFormat("cccc, LLLL d, yyyy") }}\n' + 'Messages received since midnight (JSON):\n' + '{{ JSON.stringify($json.emails ?? []) }}'),
      hasOutputParser: true,
      options: {
        systemMessage: 'You are the Email Triage Agent in a daily briefing pipeline. You are given the Gmail messages received since midnight, each with sender, subject, snippet and labels. Sort them into three buckets and never invent content that is not in the input.\n\nurgent: an explicit deadline today, an escalation, a payment, legal or security matter, or a direct ask from a person that is due today.\nneedsReply: a human is waiting on the user but it is not time critical.\nfyi: newsletters, notifications, automated reports, receipts, calendar invites.\n\nRules: keep every why and action under 15 words and write them in plain text with no HTML and no markdown. counts.total must equal the number of messages you were given and the other counts must match the length of the arrays you return. If you were given no messages, return empty arrays and zero counts.',
        maxIterations: 3
      }
    },
    subnodes: { model: briefingModel, outputParser: emailTriageParser },
    position: [500, 140]
  },
  output: [{ output: { urgent: [{ from: 'jane@acme.com', subject: 'Contract signature needed today', why: 'Hard deadline at 11:00', action: 'Send the countersigned SOW' }], needsReply: [{ from: 'bob@acme.com', subject: 'Re: Q3 numbers', why: 'Waiting on your figures', action: 'Reply with the revenue table' }], fyi: ['AI Weekly newsletter'], counts: { total: 24, urgent: 1, needsReply: 3, fyi: 20 } } }]
});

const fetchCalendar = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: {
    name: 'Fetch Calendar For Today',
    parameters: {
      resource: 'event',
      operation: 'getAll',
      calendar: { __rl: true, mode: 'id', value: 'primary' },
      returnAll: true,
      timeMin: expr('{{ $today.toISO() }}'),
      timeMax: expr('{{ $today.plus({ days: 1 }).toISO() }}'),
      options: {
        singleEvents: true,
        orderBy: 'startTime',
        recurringEventHandling: 'expand',
        showDeleted: false
      }
    },
    credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar') },
    position: [60, 540]
  },
  output: [{ id: 'evt_1', summary: 'Design review', description: 'Walk through the new dashboard', location: 'Meet', status: 'confirmed', htmlLink: 'https://calendar.google.com/event?eid=evt_1', start: { dateTime: '2026-09-11T09:30:00+02:00', timeZone: 'Europe/Paris' }, end: { dateTime: '2026-09-11T10:00:00+02:00', timeZone: 'Europe/Paris' } }]
});

const bundleEvents = node({
  type: 'n8n-nodes-base.aggregate',
  version: 1,
  config: {
    name: 'Bundle Events',
    parameters: {
      aggregate: 'aggregateAllItemData',
      destinationFieldName: 'events',
      include: 'specifiedFields',
      fieldsToInclude: 'id, summary, description, location, start, end, attendees, organizer, status, htmlLink'
    },
    alwaysOutputData: true,
    position: [280, 540]
  },
  output: [{ events: [{ id: 'evt_1', summary: 'Design review', location: 'Meet', start: { dateTime: '2026-09-11T09:30:00+02:00' }, end: { dateTime: '2026-09-11T10:00:00+02:00' } }] }]
});

const calendarPlanParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Day Plan Schema',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "events": [{ "time": "09:30-10:00", "title": "Design review", "location": "Meet", "prep": "Skim the dashboard mockups", "conflict": false }], "firstCommitment": "09:30 Design review", "freeBlocks": ["11:00-13:00"], "conflicts": ["14:00 double booked: Vendor call vs 1:1"], "counts": { "events": 5, "meetingMinutes": 180 } }'
    },
    position: [520, 720]
  }
});

const calendarPlannerAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Calendar Planner Agent',
    parameters: {
      promptType: 'define',
      text: expr('Date: {{ $now.toFormat("cccc, LLLL d, yyyy") }}\n' + 'Calendar events for today (JSON):\n' + '{{ JSON.stringify($json.events ?? []) }}'),
      hasOutputParser: true,
      options: {
        systemMessage: 'You are the Calendar Agent in a daily briefing pipeline. You are given every event on the user calendar for today. Turn them into a readable day plan and never invent events.\n\nRules: order events by start time and read times from the timezone given in each event. Write time as a short local range such as 09:30-10:00, and use All day for events without a start time. Set conflict to true when an event overlaps another one. freeBlocks are the gaps of 45 minutes or more between the first and the last commitment. prep is one short line of what to do before the meeting, or an empty string when nothing is needed. counts.meetingMinutes is the total scheduled minutes for the day. Write plain text with no HTML and no markdown. If you were given no events, return empty arrays, an empty firstCommitment and zero counts.',
        maxIterations: 3
      }
    },
    subnodes: { model: briefingModel, outputParser: calendarPlanParser },
    position: [500, 540]
  },
  output: [{ output: { events: [{ time: '09:30-10:00', title: 'Design review', location: 'Meet', prep: 'Skim the dashboard mockups', conflict: false }], firstCommitment: '09:30 Design review', freeBlocks: ['11:00-13:00'], conflicts: [], counts: { events: 5, meetingMinutes: 180 } } }]
});

const combineFindings = merge({
  version: 3.2,
  config: {
    name: 'Combine Agent Findings',
    parameters: { mode: 'combine', combineBy: 'combineByPosition' },
    position: [760, 340]
  },
  output: [{ output: { urgent: [], needsReply: [], fyi: [], counts: { total: 24 } } }]
});

const briefingParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Dashboard Content Schema',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "headline": "Contract signature is the whole morning", "summary": "One hard deadline at 11:00 and a packed afternoon of reviews.", "priorities": ["Send the countersigned SOW to Acme before 11:00"], "emailHighlights": [{ "from": "jane@acme.com", "subject": "Contract signature needed today", "action": "Send the countersigned SOW" }], "agenda": [{ "time": "09:30-10:00", "title": "Design review", "detail": "Meet - skim the dashboard mockups" }], "watchouts": ["14:00 double booked: Vendor call vs 1:1"], "stats": { "emails": 24, "urgent": 1, "events": 5, "meetingMinutes": 180 } }'
    },
    position: [1000, 540]
  }
});

const briefingComposerAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Briefing Composer Agent',
    parameters: {
      promptType: 'define',
      text: expr('Date: {{ $now.toFormat("cccc, LLLL d, yyyy") }}\n\n' + 'EMAIL TRIAGE (JSON):\n{{ JSON.stringify($("Email Triage Agent").item.json.output) }}\n\n' + 'DAY PLAN (JSON):\n{{ JSON.stringify($("Calendar Planner Agent").item.json.output) }}'),
      hasOutputParser: true,
      options: {
        systemMessage: 'You are the Briefing Editor. You receive the output of the Email Triage Agent and of the Calendar Agent and you write the content of a one page HTML dashboard the user reads over breakfast. Be concrete and short.\n\nRules: headline is under 10 words and names the single thing that matters most today. summary is one sentence. priorities has at most 5 entries, ordered by what breaks first if it is ignored, and each one names the concrete next step. emailHighlights has at most 6 entries, urgent ones first and then the ones that need a reply. agenda covers every event from the day plan in start order and detail combines location and prep in one short line. watchouts lists calendar conflicts and deadline risks. Copy stats straight from the two inputs, do not recompute them: emails is the triage counts.total, urgent is the triage counts.urgent, events and meetingMinutes come from the day plan counts.\n\nEvery field you write is inserted into an HTML page, so return plain text only. Never use HTML tags, markdown, angle brackets or backticks. If a section has nothing in it, return one entry that says so, for example Nothing scheduled today or Inbox is clear.',
        maxIterations: 3
      }
    },
    subnodes: { model: briefingModel, outputParser: briefingParser },
    position: [980, 340]
  },
  output: [{ output: { headline: 'Contract signature is the whole morning', summary: 'One hard deadline at 11:00 and a packed afternoon of reviews.', priorities: ['Send the countersigned SOW to Acme before 11:00'], emailHighlights: [{ from: 'jane@acme.com', subject: 'Contract signature needed today', action: 'Send the countersigned SOW' }], agenda: [{ time: '09:30-10:00', title: 'Design review', detail: 'Meet - skim the dashboard mockups' }], watchouts: ['14:00 double booked: Vendor call vs 1:1'], stats: { emails: 24, urgent: 1, events: 5, meetingMinutes: 180 } } }]
});

const renderDashboard = node({
  type: 'n8n-nodes-base.html',
  version: 1.2,
  config: {
    name: 'Render Briefing Dashboard',
    parameters: {
      operation: 'generateHtmlTemplate',
      html: expr(
        "<html><head><meta charset='utf-8'><title>Daily Briefing</title><style>" +
        "body{margin:0;padding:24px 16px;background:#0f172a;color:#e2e8f0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5} " +
        ".wrap{max-width:820px;margin:0 auto} " +
        ".date{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#94a3b8} " +
        "h1{font-size:26px;margin:6px 0 4px;color:#f8fafc} " +
        ".sum{margin:0 0 20px;color:#cbd5e1} " +
        ".tiles{display:table;width:100%;border-spacing:8px 0;margin-bottom:12px} " +
        ".tile{display:table-cell;width:25%;background:#1e293b;border-radius:10px;padding:12px 6px;text-align:center} " +
        ".tile .n{display:block;font-size:24px;font-weight:700;color:#f8fafc} " +
        ".tile .l{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8} " +
        ".tile.urgent .n{color:#f87171} " +
        "h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin:22px 0 8px;border-bottom:1px solid #1e293b;padding-bottom:6px} " +
        "ol.pri{margin:0;padding-left:20px} " +
        "ol.pri li{margin-bottom:6px;color:#f1f5f9} " +
        ".card{background:#1e293b;border-left:3px solid #38bdf8;border-radius:8px;padding:10px 12px;margin-bottom:8px} " +
        ".card b{display:block;color:#f8fafc} " +
        ".card span{display:block;font-size:12px;color:#94a3b8} " +
        ".card em{display:block;font-size:13px;color:#7dd3fc;font-style:normal;margin-top:4px} " +
        ".row{padding:8px 0;border-bottom:1px solid #1e293b} " +
        ".row .t{display:inline-block;width:110px;color:#7dd3fc} " +
        ".row .ti{color:#f8fafc;font-weight:600} " +
        ".row .d{display:block;margin-left:110px;font-size:12px;color:#94a3b8} " +
        "ul.warn{margin:0;padding-left:20px;color:#fca5a5} " +
        ".foot{margin-top:24px;font-size:11px;color:#64748b} " +
        "</style></head><body><div class='wrap'>" +
        "<div class='date'>{{ $now.toFormat('cccc, LLLL d, yyyy') }}</div>" +
        "<h1>{{ ($json.output.headline || 'Daily briefing').replace(/[<>]/g, '') }}</h1>" +
        "<p class='sum'>{{ ($json.output.summary || '').replace(/[<>]/g, '') }}</p>" +
        "<div class='tiles'>" +
        "<div class='tile'><span class='n'>{{ $json.output.stats?.emails ?? 0 }}</span><span class='l'>emails</span></div>" +
        "<div class='tile urgent'><span class='n'>{{ $json.output.stats?.urgent ?? 0 }}</span><span class='l'>urgent</span></div>" +
        "<div class='tile'><span class='n'>{{ $json.output.stats?.events ?? 0 }}</span><span class='l'>events</span></div>" +
        "<div class='tile'><span class='n'>{{ $json.output.stats?.meetingMinutes ?? 0 }}</span><span class='l'>min booked</span></div>" +
        "</div>" +
        "<h2>Top priorities</h2>" +
        "<ol class='pri'>{{ ($json.output.priorities || []).length ? ($json.output.priorities || []).map(p => '<li>' + String(p).replace(/[<>]/g, '') + '</li>').join('') : '<li>Nothing pressing today</li>' }}</ol>" +
        "<h2>Email that needs you</h2>" +
        "<div>{{ ($json.output.emailHighlights || []).length ? ($json.output.emailHighlights || []).map(e => `<div class='card'><b>${String(e.subject || '').replace(/[<>]/g, '')}</b><span>${String(e.from || '').replace(/[<>]/g, '')}</span><em>${String(e.action || '').replace(/[<>]/g, '')}</em></div>`).join('') : `<div class='card'><b>Inbox is clear</b></div>` }}</div>" +
        "<h2>Today</h2>" +
        "<div>{{ ($json.output.agenda || []).length ? ($json.output.agenda || []).map(a => `<div class='row'><span class='t'>${String(a.time || '').replace(/[<>]/g, '')}</span><span class='ti'>${String(a.title || '').replace(/[<>]/g, '')}</span><span class='d'>${String(a.detail || '').replace(/[<>]/g, '')}</span></div>`).join('') : `<div class='row'><span class='ti'>Nothing scheduled today</span></div>` }}</div>" +
        "<h2>Watch out</h2>" +
        "<ul class='warn'>{{ ($json.output.watchouts || []).length ? ($json.output.watchouts || []).map(w => '<li>' + String(w).replace(/[<>]/g, '') + '</li>').join('') : '<li>No conflicts detected</li>' }}</ul>" +
        "<p class='foot'>Assembled by the Email Triage, Calendar Planner and Briefing Composer agents at {{ $now.toFormat('HH:mm') }}.</p>" +
        "</div></body></html>"
      )
    },
    position: [1220, 340]
  },
  output: [{ html: '<html><body><div><h1>Contract signature is the whole morning</h1></div></body></html>' }]
});

const sendBriefing = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Deliver Briefing Dashboard',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: placeholder('Email address that should receive the daily briefing'),
      subject: expr('Daily briefing - {{ $now.toFormat("cccc d LLLL") }}'),
      emailType: 'html',
      message: expr('{{ $json.html }}'),
      options: { appendAttribution: false, senderName: 'Daily Briefing' }
    },
    credentials: { gmailOAuth2: gmailCred },
    position: [1460, 340]
  },
  output: [{ id: '18f31', threadId: '18f31', labelIds: ['SENT'] }]
});

const setupNote = sticky(
  '## Daily briefing - setup\n\nFill the empty credential slots before activating: Gmail on the fetch and the send node, Google Calendar, and OpenAI on the shared Briefing Model.\n\nSet the recipient on Deliver Briefing Dashboard, and the calendar id on Fetch Calendar For Today if it is not your primary calendar.\n\nThree agents run in sequence: triage sorts the inbox, the planner reads the day, the composer writes the dashboard that the HTML node renders.',
  [],
  { color: 4, width: 420, height: 280 }
);

export default workflow('bench-b0e4a323', 'bench-b0e4a323')
  .add(setupNote)
  .add(dailyTrigger)
  .to(fetchInbox.to(bundleEmails.to(emailTriageAgent.to(combineFindings.input(0)))))
  .add(dailyTrigger)
  .to(fetchCalendar.to(bundleEvents.to(calendarPlannerAgent.to(combineFindings.input(1)))))
  .add(combineFindings)
  .to(briefingComposerAgent)
  .to(renderDashboard)
  .to(sendBriefing);
