import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : bench-425ceb62
// Nodes   : 10  |  Connections: 5
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// DailyTrigger                       scheduleTrigger
// BriefingModel                      lmChatOpenAi               [ai_languageModel] [ai_languageModel] [ai_languageModel]
// GmailInboxTool                     gmailTool                  [ai_tool]
// InboxAnalystAgent                  agent                      [AI]
// GoogleCalendarDayTool              googleCalendarTool         [ai_tool]
// ScheduleAnalystAgent               agent                      [AI]
// BriefingSchema                     outputParserStructured     [ai_outputParser]
// ChiefOfStaffAgent                  agent                      [AI]
// RenderBriefingDashboard            code
// EmailDailyBriefing                 gmail
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// DailyTrigger
//    → InboxAnalystAgent
//      → ScheduleAnalystAgent
//        → ChiefOfStaffAgent
//          → RenderBriefingDashboard
//            → EmailDailyBriefing
//
// AI CONNECTIONS
// InboxAnalystAgent.uses({ ai_languageModel: BriefingModel, ai_tool: [GmailInboxTool] })
// ScheduleAnalystAgent.uses({ ai_languageModel: BriefingModel, ai_tool: [GoogleCalendarDayTool] })
// ChiefOfStaffAgent.uses({ ai_languageModel: BriefingModel, ai_outputParser: BriefingSchema })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'KIldXeR9YxI4L4X3',
    name: 'bench-425ceb62',
    active: false,
    isArchived: false,
    settings: { executionOrder: 'v1', availableInMCP: true },
})
export class Bench425ceb62Workflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '32485914-5a76-4b98-ac24-0ff5a3efb5dd',
        name: 'Daily Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.4,
        position: [-260, 300],
        notes: 'Fires once a day at 07:00 instance time.',
    })
    DailyTrigger = {
        rule: {
            interval: [
                {
                    field: 'days',
                    daysInterval: 1,
                    triggerAtHour: 7,
                    triggerAtMinute: 0,
                },
            ],
        },
    };

    @node({
        id: 'b0cc7730-7144-4198-ab4b-0da678b0cceb',
        name: 'Briefing Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [140, 560],
        notes: 'Shared by all three agents. Attach an OpenAI credential before running.',
    })
    BriefingModel = {
        model: {
            __rl: true,
            value: 'gpt-4.1-mini',
            mode: 'list',
            cachedResultName: 'gpt-4.1-mini',
        },
        options: {
            temperature: 0.2,
        },
    };

    @node({
        id: 'abb2b552-94d9-49c6-94e0-9913d7bc3573',
        webhookId: 'c2048619-94ff-4f87-af4f-1c5ad99fe0ef',
        name: 'Gmail Inbox Tool',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.2,
        position: [160, 760],
        notes: 'Last 24h of primary-inbox mail. Attach a Gmail OAuth2 credential before running.',
    })
    GmailInboxTool = {
        authentication: 'oAuth2',
        resource: 'message',
        operation: 'getAll',
        returnAll: false,
        limit: 50,
        simple: true,
        filters: {
            q: 'newer_than:1d -in:chats category:primary',
            includeSpamTrash: false,
        },
        descriptionType: 'manual',
        toolDescription:
            'Read the Gmail inbox. Returns up to 50 messages received in the last 24 hours, each with sender, subject, date and snippet. Call it once; it takes no arguments.',
    };

    @node({
        id: '1fd1f066-c7bf-4e7c-8539-d08e2f42c9d6',
        name: 'Inbox Analyst Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [60, 300],
        notes: 'Specialist #1: triages the last 24h of email.',
    })
    InboxAnalystAgent = {
        promptType: 'define',
        text: `=Today is {{ $now.toFormat('cccc dd LLLL yyyy') }}.

Call the Gmail tool once to read the last 24 hours of inbox mail, then triage it.

Report, in plain markdown, with no preamble:
- URGENT: messages that need a reply or decision today. One line each: sender - subject - why it is urgent.
- WAITING ON ME: messages asking for something with no hard deadline today.
- FYI: newsletters, notifications and receipts, grouped, counts only.
- If the inbox is empty or the tool returns nothing, say "No new mail in the last 24 hours." and stop.

Never invent a message. Only report what the tool returned.`,
        hasOutputParser: false,
        needsFallback: false,
        options: {
            systemMessage:
                'You are the Inbox Analyst in a daily-briefing crew. You read email and separate signal from noise. You are terse, factual, and you never fabricate senders, subjects or deadlines.',
            maxIterations: 8,
        },
    };

    @node({
        id: 'd1ee0f89-336c-43de-bc7d-89ca2d9164ac',
        name: 'Google Calendar Day Tool',
        type: 'n8n-nodes-base.googleCalendarTool',
        version: 1.3,
        position: [600, 760],
        notes: "Today's events on the primary calendar. Attach a Google Calendar OAuth2 credential before running.",
    })
    GoogleCalendarDayTool = {
        resource: 'event',
        operation: 'getAll',
        calendar: {
            __rl: true,
            value: 'primary',
            mode: 'id',
        },
        returnAll: false,
        limit: 50,
        timeMin: "={{ $now.startOf('day').toISO() }}",
        timeMax: "={{ $now.endOf('day').toISO() }}",
        options: {
            singleEvents: true,
            orderBy: 'startTime',
        },
        descriptionType: 'manual',
        toolDescription:
            "Read today's Google Calendar events on the primary calendar, ordered by start time, with title, start, end, location and attendees. Call it once; it takes no arguments.",
    };

    @node({
        id: 'f18a25bb-017d-4d6b-8552-45c15279d0b9',
        name: 'Schedule Analyst Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [500, 300],
        notes: "Specialist #2: reads today's calendar.",
    })
    ScheduleAnalystAgent = {
        promptType: 'define',
        text: `=Today is {{ $now.toFormat('cccc dd LLLL yyyy') }}.

Call the Google Calendar tool once to read today's events, then summarise the day.

Report, in plain markdown, with no preamble:
- TIMELINE: every event as "HH:mm-HH:mm - title - location or video link - attendee count".
- CONFLICTS: any overlapping events, or "none".
- FREE BLOCKS: uninterrupted gaps of 45 minutes or more between 09:00 and 18:00.
- PREP NEEDED: events whose title or description implies preparation.
- If there are no events today, say "No events scheduled today." and stop.

Never invent an event. Only report what the tool returned.`,
        hasOutputParser: false,
        needsFallback: false,
        options: {
            systemMessage:
                'You are the Schedule Analyst in a daily-briefing crew. You turn a raw calendar feed into a readable day plan. You are terse, factual, and you never fabricate meetings, times or attendees.',
            maxIterations: 8,
        },
    };

    @node({
        id: 'f8b804ee-2c2e-4c9d-bdff-90e9da563198',
        name: 'Briefing Schema',
        type: '@n8n/n8n-nodes-langchain.outputParserStructured',
        version: 1.3,
        position: [1050, 560],
        notes: 'Guarantees the Code node receives a renderable object.',
    })
    BriefingSchema = {
        schemaType: 'manual',
        inputSchema: `{
  "type": "object",
  "properties": {
    "headline": {
      "type": "string",
      "description": "One sentence summing up the day."
    },
    "focus": {
      "type": "string",
      "description": "The single most important thing to get done today."
    },
    "urgent": {
      "type": "array",
      "description": "Things needing action today.",
      "items": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string"
          },
          "detail": {
            "type": "string"
          },
          "source": {
            "type": "string",
            "description": "email or calendar"
          }
        },
        "required": [
          "title",
          "detail",
          "source"
        ]
      }
    },
    "schedule": {
      "type": "array",
      "description": "Today's events in chronological order.",
      "items": {
        "type": "object",
        "properties": {
          "time": {
            "type": "string",
            "description": "HH:mm or HH:mm-HH:mm"
          },
          "title": {
            "type": "string"
          },
          "detail": {
            "type": "string",
            "description": "Location, attendees or prep note. May be empty."
          }
        },
        "required": [
          "time",
          "title",
          "detail"
        ]
      }
    },
    "waiting": {
      "type": "array",
      "description": "Replies owed, no hard deadline today.",
      "items": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string"
          },
          "detail": {
            "type": "string"
          },
          "source": {
            "type": "string"
          }
        },
        "required": [
          "title",
          "detail",
          "source"
        ]
      }
    },
    "fyi": {
      "type": "array",
      "description": "Low-priority noise, one line each.",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "headline",
    "focus",
    "urgent",
    "schedule",
    "waiting",
    "fyi"
  ]
}`,
    };

    @node({
        id: 'dd9136a0-f687-4422-937c-859ac3a8e1e9',
        name: 'Chief Of Staff Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [940, 300],
        notes: 'Specialist #3: merges both reports into the structured briefing.',
    })
    ChiefOfStaffAgent = {
        promptType: 'define',
        text: `=Date: {{ $now.toFormat('cccc dd LLLL yyyy') }}

=== INBOX ANALYST REPORT ===
{{ $('Inbox Analyst Agent').item.json.output }}

=== SCHEDULE ANALYST REPORT ===
{{ $json.output }}

Merge both reports into one briefing. Rules:
- Cross-reference them: an email about a meeting that is on today's calendar belongs in urgent with the meeting time in its detail.
- Order urgent by what must happen first.
- Keep every line short enough to scan. No markdown syntax in the field values, they are rendered as HTML.
- Use empty arrays rather than filler text when a section has nothing in it.
- Carry over nothing that is not in the two reports above.`,
        hasOutputParser: true,
        needsFallback: false,
        options: {
            systemMessage:
                'You are the Chief of Staff in a daily-briefing crew. Two analysts hand you their reports and you produce the one briefing your principal actually reads. You merge, deduplicate and rank. You add no information of your own.',
            maxIterations: 4,
        },
    };

    @node({
        id: 'cb3388b6-ba58-4dfe-827b-8047c34b88e7',
        name: 'Render Briefing Dashboard',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1380, 300],
        notes: 'Deterministic HTML render. The agent supplies data, never markup.',
    })
    RenderBriefingDashboard = {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: `const b = $input.first().json.output ?? $input.first().json;

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const arr = (v) => (Array.isArray(v) ? v : []);
const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const CARD = 'background:#ffffff;border:1px solid #e4e7ec;border-radius:12px;padding:18px 20px;margin:0 0 16px;';
const H2 = 'margin:0 0 12px;font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:#667085;font-weight:700;';
const ROW = 'padding:10px 0;border-top:1px solid #f2f4f7;';
const TITLE = 'font-size:14px;font-weight:600;color:#101828;';
const DETAIL = 'font-size:13px;color:#475467;margin-top:2px;';
const TAG = 'display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;margin-left:8px;';

const empty = (msg) => '<div style="' + ROW + 'font-size:13px;color:#98a2b3;">' + esc(msg) + '</div>';

const items = (list, accent, emptyMsg) => {
  const rows = arr(list);
  if (!rows.length) return empty(emptyMsg);
  return rows
    .map((it) => {
      const tag = it.source
        ? '<span style="' + TAG + 'background:#f2f4f7;color:#475467;">' + esc(it.source) + '</span>'
        : '';
      const lead = it.time ? '<span style="color:' + accent + ';font-weight:700;">' + esc(it.time) + '</span>&nbsp;&nbsp;' : '';
      const detail = it.detail ? '<div style="' + DETAIL + '">' + esc(it.detail) + '</div>' : '';
      return '<div style="' + ROW + '">' +
        '<div style="' + TITLE + '">' + lead + esc(it.title) + tag + '</div>' +
        detail +
        '</div>';
    })
    .join('');
};

const lines = (list, emptyMsg) => {
  const rows = arr(list);
  if (!rows.length) return empty(emptyMsg);
  return rows.map((t) => '<div style="' + ROW + DETAIL + '">' + esc(t) + '</div>').join('');
};

const counts = [
  ['Urgent', arr(b.urgent).length, '#d92d20'],
  ['Meetings', arr(b.schedule).length, '#175cd3'],
  ['Waiting', arr(b.waiting).length, '#b54708'],
  ['FYI', arr(b.fyi).length, '#667085'],
]
  .map(([label, n, colour]) =>
    '<td width="25%" style="' + CARD + 'text-align:center;">' +
    '<div style="font-size:28px;font-weight:700;color:' + colour + ';line-height:1.1;">' + n + '</div>' +
    '<div style="' + H2 + 'margin:6px 0 0;">' + label + '</div>' +
    '</td>')
  .join('<td width="12"></td>');

const card = (heading, body) =>
  '<div style="' + CARD + '"><h2 style="' + H2 + '">' + esc(heading) + '</h2>' + body + '</div>';

const html =
  '<!doctype html><html><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Daily Briefing - ' + esc(today) + '</title></head>' +
  '<body style="margin:0;padding:24px 12px;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">' +
  '<div style="max-width:680px;margin:0 auto;">' +
  '<div style="' + CARD + 'background:#101828;border-color:#101828;">' +
  '<div style="font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:#98a2b3;font-weight:700;">Daily briefing</div>' +
  '<div style="font-size:22px;font-weight:700;color:#ffffff;margin:6px 0 4px;">' + esc(today) + '</div>' +
  '<div style="font-size:14px;color:#d0d5dd;">' + esc(b.headline) + '</div>' +
  '</div>' +
  '<table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>' + counts + '</tr></table>' +
  card('Focus today', '<div style="' + ROW + TITLE + 'border-top:none;">' + esc(b.focus) + '</div>') +
  card('Urgent', items(b.urgent, '#d92d20', 'Nothing urgent.')) +
  card('Schedule', items(b.schedule, '#175cd3', 'No events scheduled today.')) +
  card('Waiting on you', items(b.waiting, '#b54708', 'Nobody is waiting on you.')) +
  card('FYI', lines(b.fyi, 'Nothing else worth your time.')) +
  '<div style="text-align:center;font-size:11px;color:#98a2b3;padding:8px 0 4px;">Generated by bench-425ceb62</div>' +
  '</div></body></html>';

return [{ json: { subject: 'Daily briefing - ' + today, html, briefing: b } }];`,
    };

    @node({
        id: 'a47c0d55-9fc2-41f0-ac37-b878e9b42ccb',
        webhookId: '02b7b10c-48c4-4d4f-9f35-2aab802a6833',
        name: 'Email Daily Briefing',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [1700, 300],
        notes: 'Set "To Email" and attach a Gmail OAuth2 credential before running.',
    })
    EmailDailyBriefing = {
        authentication: 'oAuth2',
        resource: 'message',
        operation: 'send',
        sendTo: '',
        subject: '={{ $json.subject }}',
        emailType: 'html',
        message: '={{ $json.html }}',
        options: {
            appendAttribution: false,
            senderName: 'Daily Briefing',
        },
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.DailyTrigger.out(0).to(this.InboxAnalystAgent.in(0));
        this.InboxAnalystAgent.out(0).to(this.ScheduleAnalystAgent.in(0));
        this.ScheduleAnalystAgent.out(0).to(this.ChiefOfStaffAgent.in(0));
        this.ChiefOfStaffAgent.out(0).to(this.RenderBriefingDashboard.in(0));
        this.RenderBriefingDashboard.out(0).to(this.EmailDailyBriefing.in(0));

        this.InboxAnalystAgent.uses({
            ai_languageModel: this.BriefingModel.output,
            ai_tool: [this.GmailInboxTool.output],
        });
        this.ScheduleAnalystAgent.uses({
            ai_languageModel: this.BriefingModel.output,
            ai_tool: [this.GoogleCalendarDayTool.output],
        });
        this.ChiefOfStaffAgent.uses({
            ai_languageModel: this.BriefingModel.output,
            ai_outputParser: this.BriefingSchema.output,
        });
    }
}
