import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : bench-93c4f277
// Nodes   : 11  |  Connections: 9
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// DailyTrigger                       scheduleTrigger
// FetchGmailMessages                 gmail
// AggregateEmails                    aggregate                  [alwaysOutput]
// EmailTriageAgent                   agent                      [AI]
// FetchCalendarEvents                googleCalendar
// AggregateEvents                    aggregate                  [alwaysOutput]
// CalendarAgent                      agent                      [AI]
// DailyBriefingAgent                 agent                      [AI]
// BriefingModel                      lmChatOpenAi               [ai_languageModel] [ai_languageModel] [ai_languageModel]
// RenderDashboardHtml                html
// SaveBriefingDraft                  gmail
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// DailyTrigger
//    → FetchGmailMessages
//      → AggregateEmails
//        → EmailTriageAgent
//          → FetchCalendarEvents
//            → AggregateEvents
//              → CalendarAgent
//                → DailyBriefingAgent
//                  → RenderDashboardHtml
//                    → SaveBriefingDraft
//
// AI CONNECTIONS
// EmailTriageAgent.uses({ ai_languageModel: BriefingModel })
// CalendarAgent.uses({ ai_languageModel: BriefingModel })
// DailyBriefingAgent.uses({ ai_languageModel: BriefingModel })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'fJldX1rWitaWW2J6',
    name: 'bench-93c4f277',
    active: false,
    isArchived: false,
    settings: { executionOrder: 'v1', availableInMCP: true },
})
export class Bench93c4f277Workflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '846d2780-5495-44a2-a556-336f5a67b783',
        name: 'Daily Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.4,
        position: [-220, 300],
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
        id: '2551ccae-0a35-4ecc-adb0-98fc12443282',
        webhookId: '9408b02a-dbbc-42d9-8002-41964aa4d8af',
        name: 'Fetch Gmail Messages',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [0, 300],
        notes: 'Credential slot left empty on purpose - pick a Gmail OAuth2 credential before activating.',
    })
    FetchGmailMessages = {
        resource: 'message',
        operation: 'getAll',
        returnAll: false,
        limit: 30,
        simple: true,
        filters: {
            q: 'newer_than:1d -in:chats',
        },
    };

    @node({
        id: 'a383a67d-d89c-44a2-bf25-39dfbcf4fc2f',
        name: 'Aggregate Emails',
        type: 'n8n-nodes-base.aggregate',
        version: 1,
        position: [220, 300],
        alwaysOutputData: true,
    })
    AggregateEmails = {
        aggregate: 'aggregateAllItemData',
        destinationFieldName: 'emails',
        include: 'allFieldsExcept',
        fieldsToExclude: 'html, textAsHtml, headers, attachments, payload, raw',
    };

    @node({
        id: '2161bc0b-b783-4eb3-a284-360004c5038b',
        name: 'Email Triage Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [440, 300],
    })
    EmailTriageAgent = {
        promptType: 'define',
        text: `=Triage these emails from the last 24 hours.

EMAILS:
{{ JSON.stringify($json.emails ?? []) }}`,
        options: {
            systemMessage: `You are the Email Triage Agent in a daily-briefing crew. Sort the inbox and return STRICT JSON only: no markdown fences, no prose.

Shape:
{"counts":{"total":0,"urgent":0,"actionRequired":0},"urgent":[{"from":"","subject":"","why":"","suggestedAction":""}],"actionRequired":[{"from":"","subject":"","suggestedAction":"","deadline":""}],"fyi":[{"from":"","subject":"","summary":""}],"noise":[{"from":"","subject":""}]}

Rules: an email is urgent only if it names a deadline inside 48h, an outage, money at risk, or a direct question from a human. Newsletters, notifications and automated receipts go to noise. Never invent senders or subjects. If the email list is empty, return the shape with empty arrays and zero counts.`,
        },
    };

    @node({
        id: '6e6fea85-b58e-46f2-87d1-4f132f80100b',
        name: 'Fetch Calendar Events',
        type: 'n8n-nodes-base.googleCalendar',
        version: 1.3,
        position: [660, 300],
        notes: 'Credential slot left empty on purpose - pick a Google Calendar OAuth2 credential before activating.',
    })
    FetchCalendarEvents = {
        resource: 'event',
        operation: 'getAll',
        calendar: {
            __rl: true,
            value: 'primary',
            mode: 'id',
        },
        returnAll: false,
        limit: 50,
        options: {
            timeMin: "={{ $now.startOf('day').toISO() }}",
            timeMax: "={{ $now.plus(2, 'days').endOf('day').toISO() }}",
            singleEvents: true,
            orderBy: 'startTime',
        },
    };

    @node({
        id: 'fbb88801-57d8-47e2-9c63-4e0b0243686f',
        name: 'Aggregate Events',
        type: 'n8n-nodes-base.aggregate',
        version: 1,
        position: [880, 300],
        alwaysOutputData: true,
    })
    AggregateEvents = {
        aggregate: 'aggregateAllItemData',
        destinationFieldName: 'events',
        include: 'allFieldsExcept',
        fieldsToExclude: 'etag, kind, htmlLink, iCalUID, reminders, conferenceData, attachments, creator, organizer',
    };

    @node({
        id: '745d3b23-9041-4e59-ac90-46e977c9c563',
        name: 'Calendar Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [1100, 300],
    })
    CalendarAgent = {
        promptType: 'define',
        text: `=Analyse the schedule. Now is {{ $now.toISO() }}.

EVENTS:
{{ JSON.stringify($json.events ?? []) }}`,
        options: {
            systemMessage: `You are the Calendar Agent in a daily-briefing crew. Return STRICT JSON only: no markdown fences, no prose.

Shape:
{"today":[{"time":"","title":"","location":"","attendees":0,"prep":""}],"tomorrow":[{"time":"","title":""}],"conflicts":[{"time":"","titles":[""]}],"freeBlocks":[{"from":"","to":""}],"firstCommitment":""}

Rules: times in the local timezone as HH:mm, sorted ascending. A conflict is any pair of events whose intervals overlap. Free blocks are gaps of 45 minutes or more between 09:00 and 18:00 today. Never invent events. If the event list is empty, return the shape with empty arrays.`,
        },
    };

    @node({
        id: '20acb5c6-0699-4596-9817-ddab607c566f',
        name: 'Daily Briefing Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [1320, 300],
    })
    DailyBriefingAgent = {
        promptType: 'define',
        text: `=Compose the briefing body for {{ $now.toFormat('cccc d LLLL yyyy') }}.

EMAIL TRIAGE JSON:
{{ $('Email Triage Agent').item.json.output }}

CALENDAR JSON:
{{ $json.output }}`,
        options: {
            systemMessage: `You are the Briefing Editor in a daily-briefing crew. You receive the Email Triage Agent JSON and the Calendar Agent JSON and you write the body of an HTML dashboard.

Output raw HTML only: no markdown fences, no html/head/body/style tags, no commentary before or after.

Emit exactly these four sections, in order, each wrapped in <section class="card">:
1. <h2>Focus</h2> then one <p class="lede"> with the single most important thing today, then a <ul> of at most three bullets.
2. <h2>Schedule</h2> then <table><tbody> with rows <tr><td class="t">HH:mm</td><td>title - location</td></tr>. Add a <p class="warn"> line per conflict. Add one <p class="muted"> naming the longest free block.
3. <h2>Needs a reply</h2> then a <ul> of <li><strong>sender</strong> - subject <span class="tag urgent">action</span></li> for urgent mail and <span class="tag"> for action-required mail.
4. <h2>For information</h2> then a short <ul> of fyi items.

Escape any ampersand or angle bracket coming from mail subjects. If a section has no data, still emit the section with <p class="muted">Nothing today.</p>. Be terse: this is a dashboard, not an essay.`,
        },
    };

    @node({
        id: 'bb9083f7-f762-4c27-b54c-c52d40add3c0',
        name: 'Briefing Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [880, 540],
        notes: 'Credential slot left empty on purpose - pick an OpenAI credential before activating.',
    })
    BriefingModel = {
        model: {
            __rl: true,
            value: 'gpt-4.1-mini',
            mode: 'list',
        },
        options: {
            temperature: 0.2,
        },
    };

    @node({
        id: 'fa23dc28-3f61-4163-b094-1b4cb0c23e0f',
        name: 'Render Dashboard HTML',
        type: 'n8n-nodes-base.html',
        version: 1.2,
        position: [1540, 300],
    })
    RenderDashboardHtml = {
        operation: 'generateHtmlTemplate',
        html: `=<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Daily briefing - {{ $now.toFormat('dd LLL yyyy') }}</title>
<style>
:root { color-scheme: light dark; }
body { margin:0; padding:24px; background:#f4f5f7; color:#1f2328; font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; }
.wrap { max-width:900px; margin:0 auto; }
header { margin-bottom:20px; }
header h1 { margin:0; font-size:24px; letter-spacing:-0.01em; }
header p { margin:4px 0 0; color:#6b7280; font-size:13px; }
.grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); }
.card { background:#fff; border:1px solid #e3e6ea; border-radius:10px; padding:16px 18px; }
.card h2 { margin:0 0 10px; font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:#6b7280; }
.lede { margin:0 0 10px; font-size:16px; font-weight:600; }
.card ul { margin:0; padding-left:18px; }
.card li { margin-bottom:6px; }
.card table { width:100%; border-collapse:collapse; }
.card td { padding:5px 0; border-bottom:1px solid #f0f1f3; vertical-align:top; }
.card td.t { width:62px; font-variant-numeric:tabular-nums; color:#6b7280; }
.tag { display:inline-block; margin-left:6px; padding:1px 7px; border-radius:999px; background:#eef2ff; color:#3538cd; font-size:11px; }
.tag.urgent { background:#fee4e2; color:#b42318; }
.warn { margin:8px 0 0; color:#b42318; font-size:13px; }
.muted { margin:8px 0 0; color:#6b7280; font-size:13px; }
footer { margin-top:20px; color:#9aa1ab; font-size:12px; text-align:center; }
</style>
</head>
<body>
<div class="wrap">
<header>
<h1>Daily briefing</h1>
<p>{{ $now.toFormat('cccc d LLLL yyyy') }} &middot; inbox and calendar, sorted by three agents</p>
</header>
<div class="grid">
{{ $json.output }}
</div>
<footer>Generated by bench-93c4f277 at {{ $now.toFormat('HH:mm') }}</footer>
</div>
</body>
</html>`,
    };

    @node({
        id: '0446fda0-6e75-408f-a2a3-442c0edbbcdb',
        webhookId: 'c443dcba-ece2-4566-8e54-a595bdf2b177',
        name: 'Save Briefing Draft',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [1760, 300],
        notes: 'Credential slot left empty on purpose. Writes a Gmail draft so the dashboard is never auto-sent.',
    })
    SaveBriefingDraft = {
        resource: 'draft',
        operation: 'create',
        subject: "=Daily briefing - {{ $now.toFormat('cccc d LLLL yyyy') }}",
        emailType: 'html',
        message: '={{ $json.html }}',
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.DailyTrigger.out(0).to(this.FetchGmailMessages.in(0));
        this.FetchGmailMessages.out(0).to(this.AggregateEmails.in(0));
        this.AggregateEmails.out(0).to(this.EmailTriageAgent.in(0));
        this.EmailTriageAgent.out(0).to(this.FetchCalendarEvents.in(0));
        this.FetchCalendarEvents.out(0).to(this.AggregateEvents.in(0));
        this.AggregateEvents.out(0).to(this.CalendarAgent.in(0));
        this.CalendarAgent.out(0).to(this.DailyBriefingAgent.in(0));
        this.DailyBriefingAgent.out(0).to(this.RenderDashboardHtml.in(0));
        this.RenderDashboardHtml.out(0).to(this.SaveBriefingDraft.in(0));

        this.EmailTriageAgent.uses({
            ai_languageModel: this.BriefingModel.output,
        });
        this.CalendarAgent.uses({
            ai_languageModel: this.BriefingModel.output,
        });
        this.DailyBriefingAgent.uses({
            ai_languageModel: this.BriefingModel.output,
        });
    }
}
