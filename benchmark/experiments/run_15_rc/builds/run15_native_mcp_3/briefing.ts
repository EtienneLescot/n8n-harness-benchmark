import { workflow, node, trigger, sticky, placeholder, newCredential, merge, languageModel, outputParser, expr } from '@n8n/workflow-sdk';

const dailyTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Daily 07:00 Trigger',
    parameters: {
      rule: {
        interval: [
          { field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 0 }
        ]
      }
    },
    position: [-320, 0]
  },
  output: [{}]
});

const briefingModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'Briefing Model',
    parameters: {
      model: { __rl: true, mode: 'list', value: 'gpt-5-mini', cachedResultName: 'gpt-5-mini' },
      options: { temperature: 0.2 }
    },
    credentials: { openAiApi: newCredential('OpenAI') },
    position: [220, 340]
  }
});

const fetchEmails = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Fetch Overnight Email',
    parameters: {
      resource: 'message',
      operation: 'getAll',
      returnAll: false,
      limit: 50,
      simple: true,
      filters: {
        readStatus: 'unread',
        includeSpamTrash: false,
        receivedAfter: expr('{{ $now.minus({ hours: 24 }).toISO() }}')
      }
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    position: [-60, -160]
  },
  output: [
    {
      id: '18f0a1',
      threadId: '18f0a1',
      From: 'jane@acme.com',
      To: 'me@example.com',
      Subject: 'Contract review before Friday',
      snippet: 'Could you sign off on the redlines today so legal can file',
      internalDate: '1757500000000',
      labels: [{ id: 'UNREAD', name: 'UNREAD' }]
    }
  ]
});

const collectEmails = node({
  type: 'n8n-nodes-base.aggregate',
  version: 1,
  config: {
    name: 'Collect Email Batch',
    parameters: {
      aggregate: 'aggregateAllItemData',
      destinationFieldName: 'emails',
      include: 'allFields',
      options: {}
    },
    position: [160, -160]
  },
  output: [
    {
      emails: [
        { From: 'jane@acme.com', Subject: 'Contract review before Friday', snippet: 'Could you sign off on the redlines today' }
      ]
    }
  ]
});

const emailParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Email Triage Schema',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{"headline":"3 mails need you today, 9 can wait","unreadCount":12,"actionRequired":[{"from":"jane@acme.com","subject":"Contract review","why":"Asks for sign-off before Friday","priority":"high","suggestedAction":"Reply with redlines"}],"fyi":[{"from":"news@digest.com","subject":"Weekly digest","why":"Newsletter, no action"}],"waitingOnOthers":[{"from":"sam@acme.com","subject":"Budget numbers","why":"Sam owes the figures"}]}'
    },
    position: [400, 340]
  }
});

const emailAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Email Triage Agent',
    parameters: {
      promptType: 'define',
      hasOutputParser: true,
      text: expr('Today is {{ $now.toFormat("cccc d LLLL yyyy") }}.\n\nUNREAD EMAILS: {{ JSON.stringify($json.emails) }}'),
      options: {
        systemMessage:
          'You are the email triage agent of a daily briefing crew.\n' +
          'Sort the unread messages you are given into three buckets: actionRequired (needs a reply or a decision today), waitingOnOthers (the ball is in someone else court), and fyi (read-only noise).\n' +
          'Judge priority from sender, subject and snippet. Rank actionRequired most urgent first and keep every "why" under 15 words.\n' +
          'If the list is empty or contains only empty objects, return empty arrays, unreadCount 0 and a headline saying the inbox is clear.\n' +
          'Never invent a sender or a subject that is not in the input. Answer with JSON matching the schema, no prose outside the JSON.'
      }
    },
    subnodes: { model: briefingModel, outputParser: emailParser },
    position: [400, -160]
  },
  output: [
    {
      output: {
        headline: '3 mails need you today, 9 can wait',
        unreadCount: 12,
        actionRequired: [
          { from: 'jane@acme.com', subject: 'Contract review', why: 'Asks for sign-off before Friday', priority: 'high', suggestedAction: 'Reply with redlines' }
        ],
        fyi: [{ from: 'news@digest.com', subject: 'Weekly digest', why: 'Newsletter, no action' }],
        waitingOnOthers: []
      }
    }
  ]
});

const fetchEvents = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: {
    name: 'Fetch Today Calendar',
    parameters: {
      resource: 'event',
      operation: 'getAll',
      calendar: { __rl: true, mode: 'list', value: 'primary', cachedResultName: 'Primary calendar' },
      returnAll: true,
      timeMin: expr('{{ $now.startOf("day").toISO() }}'),
      timeMax: expr('{{ $now.endOf("day").toISO() }}'),
      options: { singleEvents: true, orderBy: 'startTime' }
    },
    credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar') },
    alwaysOutputData: true,
    onError: 'continueRegularOutput',
    position: [-60, 140]
  },
  output: [
    {
      id: 'evt_9x',
      summary: 'Standup',
      description: 'Daily sync',
      start: { dateTime: '2026-09-11T09:30:00+02:00', timeZone: 'Europe/Paris' },
      end: { dateTime: '2026-09-11T09:45:00+02:00', timeZone: 'Europe/Paris' },
      htmlLink: 'https://calendar.google.com/event?eid=evt_9x',
      status: 'confirmed'
    }
  ]
});

const collectEvents = node({
  type: 'n8n-nodes-base.aggregate',
  version: 1,
  config: {
    name: 'Collect Day Events',
    parameters: {
      aggregate: 'aggregateAllItemData',
      destinationFieldName: 'events',
      include: 'allFields',
      options: {}
    },
    position: [160, 140]
  },
  output: [
    {
      events: [
        { summary: 'Standup', start: { dateTime: '2026-09-11T09:30:00+02:00' }, end: { dateTime: '2026-09-11T09:45:00+02:00' } }
      ]
    }
  ]
});

const calendarParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Calendar Schema',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{"headline":"4 meetings, first at 09:30, 2h of focus time left","meetingCount":4,"firstStart":"09:30","lastEnd":"17:00","schedule":[{"time":"09:30-09:45","title":"Standup","location":"Google Meet","attendees":4,"prep":"Skim the board before joining"}],"conflicts":["11:00 Design review overlaps 1:1 with Sam"],"focusBlocks":["13:00-15:00 free"]}'
    },
    position: [580, 340]
  }
});

const calendarAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Calendar Analyst Agent',
    parameters: {
      promptType: 'define',
      hasOutputParser: true,
      text: expr('Today is {{ $now.toFormat("cccc d LLLL yyyy") }}.\n\nTODAY EVENTS: {{ JSON.stringify($json.events) }}'),
      options: {
        systemMessage:
          'You are the calendar analyst of a daily briefing crew.\n' +
          'Turn the events you are given into a readable day plan: a chronological schedule with local HH:mm ranges, overlapping meetings listed as conflicts, and the free gaps longer than 45 minutes listed as focusBlocks.\n' +
          'Add a one-line prep note only where it is obvious from the title or description.\n' +
          'If the list is empty or contains only empty objects, return empty arrays, meetingCount 0 and a headline saying the day is clear.\n' +
          'Never invent a meeting or a time that is not in the input. Answer with JSON matching the schema, no prose outside the JSON.'
      }
    },
    subnodes: { model: briefingModel, outputParser: calendarParser },
    position: [400, 140]
  },
  output: [
    {
      output: {
        headline: '4 meetings, first at 09:30, 2h of focus time left',
        meetingCount: 4,
        firstStart: '09:30',
        lastEnd: '17:00',
        schedule: [{ time: '09:30-09:45', title: 'Standup', location: 'Google Meet', attendees: 4, prep: 'Skim the board before joining' }],
        conflicts: [],
        focusBlocks: ['13:00-15:00 free']
      }
    }
  ]
});

const combineAnalyses = merge({
  version: 3.2,
  config: {
    name: 'Combine Analyses',
    parameters: {
      mode: 'combine',
      combineBy: 'combineByPosition',
      numberInputs: 2
    },
    position: [660, -10]
  },
  output: [{ output: {} }]
});

const composerAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Briefing Composer Agent',
    parameters: {
      promptType: 'define',
      text: expr(
        'Build the briefing dashboard for {{ $now.toFormat("cccc d LLLL yyyy") }}.\n\n' +
        'EMAIL TRIAGE: {{ JSON.stringify($("Email Triage Agent").first().json.output) }}\n\n' +
        'CALENDAR ANALYSIS: {{ JSON.stringify($("Calendar Analyst Agent").first().json.output) }}'
      ),
      options: {
        systemMessage:
          'You are the briefing designer of a daily briefing crew. You receive the triaged email JSON and the analysed calendar JSON and you return the HTML daily briefing dashboard.\n' +
          'Output ONE complete HTML document and nothing else: no markdown fences, no commentary, no explanation before or after.\n' +
          'Document rules: inline CSS only (mail clients drop style sheets and scripts), no JavaScript, no external images, a layout that stays readable at 600px wide, system font stack, dark text on a light card background.\n' +
          'Structure: a header with the date and a one-sentence state of the day; a row of KPI tiles (unread emails, mails needing action, meetings today, free focus time); a "Needs you today" section listing the action-required mail with sender, subject, why and suggested action, most urgent first; a "Today schedule" section as a time-ordered table with any conflict called out in red; a "Focus blocks" line; and a muted "FYI and waiting on others" section at the end.\n' +
          'If a section has no data, print a short reassuring line instead of an empty block. Never invent an email, a meeting or a number that is not in the JSON you were given.'
      }
    },
    subnodes: { model: briefingModel },
    executeOnce: true,
    position: [880, -10]
  },
  output: [{ output: '<html><body><h1>Daily briefing</h1></body></html>' }]
});

const sendBriefing = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Send HTML Briefing',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: placeholder('Where the briefing is delivered, e.g. you@yourdomain.com'),
      subject: expr('Daily briefing - {{ $now.toFormat("cccc d LLLL") }}'),
      emailType: 'html',
      message: expr('{{ $json.output }}'),
      options: { appendAttribution: false, senderName: 'Daily Briefing' }
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    position: [1120, -10]
  },
  output: [{ id: '18f0b2', threadId: '18f0b2', labelIds: ['SENT'] }]
});

const setupNote = sticky(
  '## Before activating\n\n1. Attach your Gmail, Google Calendar and OpenAI credentials to the four nodes that ask for them.\n2. Set the recipient on **Send HTML Briefing** (it is a placeholder).\n3. Adjust the 07:00 trigger to your timezone.\n\nThe two analyst agents sort the raw Gmail and Calendar data into JSON; the composer agent turns that JSON into the HTML dashboard that is emailed to you.',
  [dailyTrigger],
  { color: 4 }
);

export default workflow('daily-google-briefing', 'bench-1fbb1429')
  .add(dailyTrigger)
  .to(fetchEmails.to(collectEmails.to(emailAgent.to(combineAnalyses.input(0)))))
  .add(dailyTrigger)
  .to(fetchEvents.to(collectEvents.to(calendarAgent.to(combineAnalyses.input(1)))))
  .add(combineAnalyses)
  .to(composerAgent)
  .to(sendBriefing)
  .add(setupNote);
