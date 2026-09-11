import { workflow, node, trigger, sticky, placeholder, newCredential, merge, languageModel, expr } from '@n8n/workflow-sdk';

const dailyTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Every Morning At 7',
    parameters: {
      rule: {
        interval: [
          { field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 0 }
        ]
      }
    },
    position: [0, 400]
  },
  output: [{ timestamp: '2026-09-12T07:00:00.000+02:00' }]
});

const fetchEmails = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Fetch Last 24h Email',
    parameters: {
      resource: 'message',
      operation: 'getAll',
      returnAll: false,
      limit: 50,
      simple: true,
      filters: {
        includeSpamTrash: false,
        readStatus: 'both',
        receivedAfter: expr('{{ $now.minus({ hours: 24 }).toISO() }}')
      }
    },
    credentials: { gmailOAuth2: newCredential('Gmail account') },
    onError: 'continueRegularOutput',
    position: [240, 240]
  },
  output: [
    {
      id: '18f2a1b9c4d5e6f7',
      threadId: '18f2a1b9c4d5e6f7',
      From: 'Ana Ruiz <ana@acme.example>',
      To: 'me@example.com',
      Subject: 'Contract redlines need sign-off today',
      snippet: 'Legal sent back the redlines, we need your sign-off before 3pm to hold the Friday close.',
      internalDate: '1789203600000',
      labels: [{ id: 'INBOX', name: 'INBOX' }, { id: 'UNREAD', name: 'UNREAD' }]
    }
  ]
});

const aggregateEmails = node({
  type: 'n8n-nodes-base.aggregate',
  version: 1,
  config: {
    name: 'Bundle Email Into One Item',
    parameters: {
      aggregate: 'aggregateAllItemData',
      destinationFieldName: 'emails',
      include: 'allFields'
    },
    position: [480, 240]
  },
  output: [
    {
      emails: [
        {
          From: 'Ana Ruiz <ana@acme.example>',
          Subject: 'Contract redlines need sign-off today',
          snippet: 'Legal sent back the redlines, we need your sign-off before 3pm to hold the Friday close.'
        }
      ]
    }
  ]
});

const fetchEvents = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: {
    name: "Fetch Today's Calendar",
    parameters: {
      resource: 'event',
      operation: 'getAll',
      calendar: { __rl: true, mode: 'id', value: 'primary' },
      returnAll: true,
      timeMin: expr('{{ $now.startOf("day").toISO() }}'),
      timeMax: expr('{{ $now.endOf("day").toISO() }}'),
      options: {
        singleEvents: true,
        orderBy: 'startTime',
        recurringEventHandling: 'expand'
      }
    },
    credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar account') },
    onError: 'continueRegularOutput',
    position: [240, 600]
  },
  output: [
    {
      id: 'evt_9a1b2c3d',
      summary: 'Quarterly roadmap review',
      description: 'Bring the updated delivery dates.',
      status: 'confirmed',
      htmlLink: 'https://calendar.google.com/event?eid=evt_9a1b2c3d',
      start: { dateTime: '2026-09-12T09:30:00+02:00', timeZone: 'Europe/Paris' },
      end: { dateTime: '2026-09-12T10:30:00+02:00', timeZone: 'Europe/Paris' },
      organizer: { email: 'ana@acme.example', self: false }
    }
  ]
});

const aggregateEvents = node({
  type: 'n8n-nodes-base.aggregate',
  version: 1,
  config: {
    name: 'Bundle Events Into One Item',
    parameters: {
      aggregate: 'aggregateAllItemData',
      destinationFieldName: 'events',
      include: 'allFields'
    },
    position: [480, 600]
  },
  output: [
    {
      events: [
        {
          summary: 'Quarterly roadmap review',
          start: { dateTime: '2026-09-12T09:30:00+02:00' },
          end: { dateTime: '2026-09-12T10:30:00+02:00' }
        }
      ]
    }
  ]
});

const sharedModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'Briefing Chat Model',
    parameters: {
      model: { __rl: true, mode: 'list', value: 'gpt-4.1-mini', cachedResultName: 'gpt-4.1-mini' },
      options: { temperature: 0.2 }
    },
    credentials: { openAiApi: newCredential('OpenAI account') },
    position: [760, 880]
  }
});

const emailAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Email Triage Agent',
    parameters: {
      promptType: 'define',
      text: expr(
        'Triage this batch of Gmail messages from the last 24 hours.\n' +
        'Return markdown only, no preamble.\n\n' +
        'MESSAGES (JSON):\n{{ JSON.stringify($json.emails) }}'
      ),
      options: {
        systemMessage:
          'You are the Email Triage Agent in a daily briefing crew. You never write the final ' +
          'briefing, you only hand structured findings to the Briefing Composer Agent.\n\n' +
          'Sort every message into exactly one bucket: NEEDS REPLY TODAY, WAITING ON OTHERS, ' +
          'FYI, or NOISE.\n' +
          'For each non-noise message give one line: sender - subject - why it matters (max 15 words).\n' +
          'Then list explicit action items you can extract, each with a deadline if one is stated.\n' +
          'Close with a one-sentence inbox summary, e.g. "12 new, 3 need a reply today".\n' +
          'Collapse NOISE to a single count. Never invent senders, subjects or deadlines. ' +
          'If the batch is empty, say so plainly.'
      }
    },
    subnodes: { model: sharedModel },
    position: [760, 240]
  },
  output: [
    {
      output:
        '**NEEDS REPLY TODAY**\n- Ana Ruiz - Contract redlines - sign-off blocks the Friday close\n\n**Actions**\n- Sign contract redlines (today, 3pm)\n\n12 new, 1 needs a reply today.'
    }
  ]
});

const calendarAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Calendar Agent',
    parameters: {
      promptType: 'define',
      text: expr(
        "Analyse today's Google Calendar events.\n" +
        'Return markdown only, no preamble.\n\n' +
        'EVENTS (JSON):\n{{ JSON.stringify($json.events) }}'
      ),
      options: {
        systemMessage:
          'You are the Calendar Agent in a daily briefing crew. You never write the final ' +
          'briefing, you only hand structured findings to the Briefing Composer Agent.\n\n' +
          'Produce a chronological timeline of the day: local start-end time, title, and who ' +
          'called it. Flag overlapping events as CONFLICT and back-to-back blocks with no gap.\n' +
          'Call out the longest free block as focus time.\n' +
          'List any event whose description implies preparation, with what to prepare.\n' +
          'Close with a one-sentence load summary, e.g. "5 meetings, 4h booked, 1 conflict".\n' +
          'Times come from the event start/end fields, never guess them. ' +
          'If there are no events, say the day is clear.'
      }
    },
    subnodes: { model: sharedModel },
    position: [760, 600]
  },
  output: [
    {
      output:
        '**Timeline**\n- 09:30-10:30 Quarterly roadmap review (Ana Ruiz)\n\n**Prep**\n- Roadmap review: bring updated delivery dates\n\n1 meeting, 1h booked, no conflicts.'
    }
  ]
});

const mergeFindings = merge({
  version: 3.2,
  config: {
    name: 'Collect Agent Findings',
    parameters: {
      mode: 'combine',
      combineBy: 'combineByPosition',
      options: { includeUnpaired: true }
    },
    position: [1020, 420]
  },
  output: [{ output: 'merged agent findings' }]
});

const briefingAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Briefing Composer Agent',
    parameters: {
      promptType: 'define',
      text: expr(
        'Compose the HTML body of my daily briefing dashboard from the two specialist reports below.\n\n' +
        '=== EMAIL TRIAGE REPORT ===\n' +
        "{{ $('Email Triage Agent').item.json.output }}\n\n" +
        '=== CALENDAR REPORT ===\n' +
        "{{ $('Calendar Agent').item.json.output }}"
      ),
      options: {
        systemMessage:
          'You are the Briefing Composer Agent. Two specialist agents hand you their reports; ' +
          'you merge them into one scannable dashboard body.\n\n' +
          'Output rules, follow exactly:\n' +
          '- Return raw HTML only. No markdown, no code fences, no commentary.\n' +
          '- No <html>, <head>, <body> or <style> tags. Fragment markup only.\n' +
          '- Wrap each section in <section class="card"><h2>Title</h2>...</section>.\n' +
          '- Emit the sections in this order: Top Priorities (max 5 <li>, email and calendar ' +
          'items interleaved by urgency), Schedule (an <ol> timeline), Inbox (grouped by the ' +
          'triage buckets), Prep &amp; Follow-ups.\n' +
          '- Mark anything urgent with <span class="tag tag-urgent">urgent</span> and conflicts ' +
          'with <span class="tag tag-warn">conflict</span>.\n' +
          '- Use <ul>/<ol>/<li>/<p>/<strong>/<span> only. No tables, no inline style attributes, ' +
          'no scripts, no images.\n' +
          '- Carry over only facts present in the two reports. Never invent a meeting, sender or ' +
          'deadline. If a section has nothing, render <p class="empty">Nothing today.</p>.'
      }
    },
    subnodes: { model: sharedModel },
    executeOnce: true,
    position: [1280, 420]
  },
  output: [
    {
      output:
        '<section class="card"><h2>Top Priorities</h2><ul><li><strong>Sign contract redlines</strong> <span class="tag tag-urgent">urgent</span> - due 3pm</li></ul></section>'
    }
  ]
});

const buildDashboard = node({
  type: 'n8n-nodes-base.html',
  version: 1.2,
  config: {
    name: 'Render Dashboard HTML',
    parameters: {
      operation: 'generateHtmlTemplate',
      html: expr(
        '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '<meta charset="utf-8" />\n' +
        '<meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
        '<title>Daily Briefing</title>\n' +
        '<style>\n' +
        ':root { color-scheme: light; }\n' +
        'body { margin: 0; padding: 24px; background: #f4f5f7; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #1c1e21; line-height: 1.55; }\n' +
        '.wrap { max-width: 760px; margin: 0 auto; }\n' +
        'header.top { padding-bottom: 16px; border-bottom: 2px solid #d8dade; margin-bottom: 20px; }\n' +
        'h1 { margin: 0; font-size: 24px; letter-spacing: -0.01em; }\n' +
        '.sub { margin: 4px 0 0; color: #616770; font-size: 14px; }\n' +
        '.card { background: #ffffff; border: 1px solid #e2e4e8; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; }\n' +
        '.card h2 { margin: 0 0 10px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.06em; color: #4b5058; }\n' +
        '.card ul, .card ol { margin: 0; padding-left: 20px; }\n' +
        '.card li { margin-bottom: 6px; }\n' +
        '.tag { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; vertical-align: middle; }\n' +
        '.tag-urgent { background: #fde2e1; color: #97231c; }\n' +
        '.tag-warn { background: #fdf0d5; color: #8a5a00; }\n' +
        '.empty { color: #888d94; font-style: italic; margin: 0; }\n' +
        'footer.foot { color: #888d94; font-size: 12px; text-align: center; padding-top: 8px; }\n' +
        '</style>\n' +
        '</head>\n' +
        '<body>\n' +
        '<div class="wrap">\n' +
        '<header class="top">\n' +
        '<h1>Daily Briefing</h1>\n' +
        '<p class="sub">{{ $now.toFormat("cccc d LLLL yyyy") }} &middot; Gmail + Google Calendar</p>\n' +
        '</header>\n' +
        '{{ $json.output }}\n' +
        '<footer class="foot">Assembled by the Email Triage, Calendar and Briefing Composer agents at {{ $now.toFormat("HH:mm") }}.</footer>\n' +
        '</div>\n' +
        '</body>\n' +
        '</html>'
      )
    },
    position: [1540, 420]
  },
  output: [{ html: '<!DOCTYPE html><html lang="en"><body><div class="wrap">...</div></body></html>' }]
});

const sendBriefing = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Email The Dashboard',
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: placeholder('Where to send the briefing (e.g. you@gmail.com)'),
      subject: expr('Daily Briefing - {{ $now.toFormat("cccc d LLLL") }}'),
      emailType: 'html',
      message: expr('{{ $json.html }}'),
      options: { appendAttribution: false }
    },
    credentials: { gmailOAuth2: newCredential('Gmail account') },
    position: [1800, 420]
  },
  output: [{ id: '18f3b7c2d9e0a1b2', threadId: '18f3b7c2d9e0a1b2', labelIds: ['SENT'] }]
});

const collectNote = sticky(
  '## 1. Collect\nTwo independent lanes off one daily schedule. Each Aggregate rolls its lane into a single item so its agent runs once, not once per email or event.',
  [fetchEmails, aggregateEmails, fetchEvents, aggregateEvents],
  { color: 4 }
);

const agentNote = sticky(
  '## 2. Sort\nTwo specialist agents, one shared chat model. They classify and structure; neither writes the final briefing.',
  [emailAgent, calendarAgent],
  { color: 3 }
);

const presentNote = sticky(
  '## 3. Present\nThe composer agent merges both reports into HTML fragments, the HTML node wraps them in the dashboard shell, Gmail delivers it.\n\nConnect the Gmail, Google Calendar and OpenAI credential slots, then set the recipient on the last node.',
  [briefingAgent, buildDashboard, sendBriefing],
  { color: 5 }
);

export default workflow('bench-e87df2d3', 'bench-e87df2d3')
  .add(dailyTrigger)
  .to(fetchEmails.to(aggregateEmails.to(emailAgent.to(mergeFindings.input(0)))))
  .add(dailyTrigger)
  .to(fetchEvents.to(aggregateEvents.to(calendarAgent.to(mergeFindings.input(1)))))
  .add(mergeFindings)
  .to(briefingAgent)
  .to(buildDashboard)
  .to(sendBriefing)
  .add(collectNote)
  .add(agentNote)
  .add(presentNote);
