import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : bench-e7bbf244
// Nodes   : 9  |  Connections: 5
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// DailyTrigger                       scheduleTrigger
// BriefingModel                      lmChatOpenAi               [ai_languageModel] [ai_languageModel] [ai_languageModel]
// SearchInbox                        gmailTool                  [ai_tool]
// ListUpcomingEvents                 googleCalendarTool         [ai_tool]
// EmailTriageAgent                   agent                      [AI]
// CalendarAgent                      agent                      [AI]
// BriefingEditorAgent                agent                      [AI]
// RenderBriefingDashboard            html
// SendDailyBriefing                  gmail
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// DailyTrigger
//    → EmailTriageAgent
//      → CalendarAgent
//        → BriefingEditorAgent
//          → RenderBriefingDashboard
//            → SendDailyBriefing
//
// AI CONNECTIONS
// EmailTriageAgent.uses({ ai_languageModel: BriefingModel, ai_tool: [SearchInbox] })
// CalendarAgent.uses({ ai_languageModel: BriefingModel, ai_tool: [ListUpcomingEvents] })
// BriefingEditorAgent.uses({ ai_languageModel: BriefingModel })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'lm1RPKsMQ1WrHKcp',
    name: 'bench-e7bbf244',
    active: false,
    isArchived: false,
    settings: { executionOrder: 'v1', availableInMCP: true },
})
export class BenchE7bbf244Workflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'cd94a4ba-eed1-46a0-a1fd-55ea17ebd3d1',
        name: 'Daily Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.4,
        position: [-260, 300],
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
        id: '16644c30-f821-4032-b9a9-7a903336197a',
        name: 'Briefing Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [340, 560],
    })
    BriefingModel = {
        model: {
            __rl: true,
            value: 'gpt-5-mini',
            mode: 'list',
        },
        options: {},
    };

    @node({
        id: '05cc7c0e-1527-4661-b52a-b8fafc27dcfd',
        webhookId: '1ba88963-99e9-4aaf-b057-db6805e23ab1',
        name: 'Search Inbox',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.2,
        position: [60, 560],
    })
    SearchInbox = {
        resource: 'message',
        operation: 'getAll',
        returnAll: false,
        limit: 50,
        simple: true,
        filters: {
            q: 'newer_than:1d -in:chats',
        },
        descriptionType: 'manual',
        toolDescription:
            'Read Google Mail messages. Returns sender, subject, snippet and date for the last 24 hours of inbox mail. Call it once to collect the messages to triage.',
    };

    @node({
        id: 'f09834fa-14a7-4c4e-ac92-1fe212dfe347',
        name: 'List Upcoming Events',
        type: 'n8n-nodes-base.googleCalendarTool',
        version: 1.3,
        position: [620, 560],
    })
    ListUpcomingEvents = {
        resource: 'event',
        operation: 'getAll',
        calendar: {
            __rl: true,
            value: 'primary',
            mode: 'id',
        },
        returnAll: false,
        limit: 50,
        timeMin: '={{ $now.startOf("day").toISO() }}',
        timeMax: '={{ $now.plus(2, "days").endOf("day").toISO() }}',
        options: {},
        descriptionType: 'manual',
        toolDescription:
            'Read Google Calendar events from the primary calendar for today and the next two days. Returns title, start, end, location and attendees. Call it once to collect the schedule.',
    };

    @node({
        id: '44e17058-a758-4148-9612-026104e472e3',
        name: 'Email Triage Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [60, 300],
    })
    EmailTriageAgent = {
        promptType: 'define',
        text: 'Triage the Google Mail inbox for the last 24 hours and produce the email digest for today.',
        options: {
            systemMessage:
                'You are the Email Analyst of a daily-briefing crew. Call the Gmail tool once to read the last 24 hours of mail. Sort every message into exactly one bucket: NEEDS REPLY, WAITING ON, FYI, NOISE. For each message that is not NOISE, give sender, subject, a one-line summary, and any explicit deadline or date found in the text. Count the NOISE bucket instead of listing it. Never invent a message, a sender or a deadline: if the tool returns nothing, say the inbox is empty. Answer with compact Markdown only, no preamble and no closing remark.',
        },
    };

    @node({
        id: '9805d81d-9014-4710-b883-146554f7bc23',
        name: 'Calendar Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [620, 300],
    })
    CalendarAgent = {
        promptType: 'define',
        text: 'List and analyse the Google Calendar schedule for today and the next two days.',
        options: {
            systemMessage:
                'You are the Calendar Analyst of a daily-briefing crew. Call the Google Calendar tool once to read the events for today and the next two days. Report the schedule of today in chronological order with start time, end time, title, location and attendee count. Then flag scheduling conflicts, back-to-back blocks, and every free focus window of 60 minutes or more between 09:00 and 18:00. List notable events for the next two days in a separate short section. Never invent an event or an attendee: if the tool returns nothing, say the calendar is clear. Answer with compact Markdown only, no preamble and no closing remark.',
        },
    };

    @node({
        id: '5a1ab0e2-c05c-42c5-91b0-59d42fa74872',
        name: 'Briefing Editor Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [900, 300],
    })
    BriefingEditorAgent = {
        promptType: 'define',
        text: `=EMAIL DIGEST
{{ $('Email Triage Agent').item.json.output }}

CALENDAR DIGEST
{{ $('Calendar Agent').item.json.output }}`,
        options: {
            systemMessage:
                'You are the Briefing Editor. You receive an email digest and a calendar digest produced by two analyst agents. Merge them into one prioritised daily briefing, cross-referencing mail against the schedule, for example a message about a meeting that is on the calendar today. Output ONLY an HTML fragment: a sequence of <section class="card"> blocks, each opening with an <h2>, using <ul><li>, <p>, <strong> and <span class="tag"> for structure. Emit the cards in this order: Top Priorities (at most five concrete actions, each naming its source), Today Schedule, Needs Reply, Waiting On, FYI. Add class "tag urgent" to anything due today. Never add a fact that is absent from the two digests, and write "Nothing to report" inside a card that has no content. Do not emit html, head, body or style tags, Markdown, or code fences.',
        },
    };

    @node({
        id: 'cff41429-4079-4324-9a66-c4ed08242fe7',
        name: 'Render Briefing Dashboard',
        type: 'n8n-nodes-base.html',
        version: 1.2,
        position: [1180, 300],
    })
    RenderBriefingDashboard = {
        operation: 'generateHtmlTemplate',
        html: `=<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Daily Briefing</title>
</head>
<body>
  <div class="page">
    <header class="masthead">
      <p class="eyebrow">Daily Briefing</p>
      <h1>{{ $now.toFormat('cccc d LLLL yyyy') }}</h1>
      <p class="sub">Assembled by the email and calendar agents at {{ $now.toFormat('HH:mm') }}.</p>
    </header>
    <main class="grid">
      {{ $json.output }}
    </main>
    <footer class="foot">Generated automatically. Verify anything time-critical in Gmail or Google Calendar.</footer>
  </div>
</body>
</html>
<style>
  body {
    margin: 0;
    background: #f4f5f7;
    color: #1f2430;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.55;
  }
  .page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 20px 48px;
  }
  .masthead {
    border-bottom: 3px solid #ff6d5a;
    padding-bottom: 16px;
    margin-bottom: 28px;
  }
  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 12px;
    font-weight: 700;
    color: #ff6d5a;
  }
  .masthead h1 {
    margin: 6px 0 4px;
    font-size: 30px;
    line-height: 1.2;
  }
  .sub {
    margin: 0;
    color: #6b7280;
    font-size: 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 18px;
    align-items: start;
  }
  .card {
    background: #ffffff;
    border: 1px solid #e3e6ec;
    border-radius: 10px;
    padding: 18px 20px;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
  }
  .card h2 {
    margin: 0 0 12px;
    font-size: 15px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #3d4453;
    border-bottom: 1px solid #eceef3;
    padding-bottom: 8px;
  }
  .card ul {
    margin: 0;
    padding-left: 18px;
  }
  .card li {
    margin-bottom: 8px;
  }
  .card p {
    margin: 0 0 8px;
  }
  .tag {
    display: inline-block;
    background: #eef1f6;
    color: #485061;
    border-radius: 999px;
    padding: 1px 9px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.03em;
  }
  .tag.urgent {
    background: #ffe2dd;
    color: #b3321c;
  }
  .foot {
    margin-top: 28px;
    color: #8b92a1;
    font-size: 12px;
    text-align: center;
  }
</style>`,
    };

    @node({
        id: 'bdb8834e-10bd-4be9-b952-335fd4155200',
        webhookId: '9dc2e3a1-b830-46a9-be28-eb6582832681',
        name: 'Send Daily Briefing',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [1420, 300],
    })
    SendDailyBriefing = {
        resource: 'message',
        operation: 'send',
        sendTo: 'etienne@etiennelescot.fr',
        subject: "=Daily Briefing - {{ $now.toFormat('cccc d LLLL') }}",
        emailType: 'html',
        message: '={{ $json.html }}',
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.DailyTrigger.out(0).to(this.EmailTriageAgent.in(0));
        this.EmailTriageAgent.out(0).to(this.CalendarAgent.in(0));
        this.CalendarAgent.out(0).to(this.BriefingEditorAgent.in(0));
        this.BriefingEditorAgent.out(0).to(this.RenderBriefingDashboard.in(0));
        this.RenderBriefingDashboard.out(0).to(this.SendDailyBriefing.in(0));

        this.EmailTriageAgent.uses({
            ai_languageModel: this.BriefingModel.output,
            ai_tool: [this.SearchInbox.output],
        });
        this.CalendarAgent.uses({
            ai_languageModel: this.BriefingModel.output,
            ai_tool: [this.ListUpcomingEvents.output],
        });
        this.BriefingEditorAgent.uses({
            ai_languageModel: this.BriefingModel.output,
        });
    }
}
