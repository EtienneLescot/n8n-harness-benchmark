import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : bench-12b7c1db
// Nodes   : 8  |  Connections: 2
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// DailyTrigger                       scheduleTrigger
// BriefingOrchestrator               agent                      [AI]
// EmailTriageAgent                   agentTool                  [AI] [ai_tool]
// CalendarAgent                      agentTool                  [AI] [ai_tool]
// BriefingModel                      lmChatOpenAi               [ai_languageModel] [ai_languageModel] [ai_languageModel]
// SearchGmailMessages                gmailTool                  [ai_tool]
// ListCalendarEvents                 googleCalendarTool         [ai_tool]
// SendBriefingEmail                  gmail
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// DailyTrigger
//    → BriefingOrchestrator
//      → SendBriefingEmail
//
// AI CONNECTIONS
// BriefingOrchestrator.uses({ ai_languageModel: BriefingModel, ai_tool: [EmailTriageAgent, CalendarAgent] })
// EmailTriageAgent.uses({ ai_languageModel: BriefingModel, ai_tool: [SearchGmailMessages] })
// CalendarAgent.uses({ ai_languageModel: BriefingModel, ai_tool: [ListCalendarEvents] })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'Ebe8l6xnMxBIky6H',
    name: 'bench-12b7c1db',
    active: false,
    isArchived: false,
    settings: { executionOrder: 'v1', availableInMCP: true },
})
export class Bench12b7c1dbWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '66b0f4c7-310c-448a-a79d-8d5fbcd4dfc3',
        name: 'Daily Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.4,
        position: [-220, 0],
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
        id: '4a871727-2f4c-4831-b808-524d0cb1c230',
        name: 'Briefing Orchestrator',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [40, 0],
    })
    BriefingOrchestrator = {
        promptType: 'define',
        text: "=Build today's briefing for {{ $now.toFormat('cccc d LLLL yyyy') }}. Ask the Email Triage Agent for the last 24 hours of mail and the Calendar Agent for today's schedule, then merge both into the HTML dashboard.",
        options: {
            systemMessage: `You orchestrate a daily briefing. You have two specialist agents as tools:
- "Email Triage Agent": summarises and ranks the last 24 hours of Gmail.
- "Calendar Agent": reports today's Google Calendar schedule.

Call BOTH tools before answering. Then sort the information into: urgent items needing a reply today, meetings and their prep, FYI items, and everything safely ignorable.

Output ONE complete HTML document and nothing else. No markdown, no code fences, no commentary.
Requirements for the document:
- Inline CSS only (mail clients strip linked stylesheets), system font stack, max-width 720px, centred.
- A header with the date, then dashboard cards: "Needs You Today", "Schedule", "Inbox Digest", "FYI".
- Each email item shows sender, subject and a one-line summary. Each event shows time, title and attendees.
- Empty sections say so explicitly instead of being dropped.
- Never invent emails or events. If a tool returns nothing, report the section as empty.`,
            maxIterations: 12,
        },
    };

    @node({
        id: '4fec52ba-4989-4195-a883-04e1098aa151',
        name: 'Email Triage Agent',
        type: '@n8n/n8n-nodes-langchain.agentTool',
        version: 3,
        position: [-40, 260],
    })
    EmailTriageAgent = {
        toolDescription:
            'Reads and triages the Gmail inbox for the last 24 hours. Ask it for a ranked summary of incoming mail. Returns sender, subject, a one-line summary and an urgency rating per message.',
        text: "={{ $fromAI('request', 'What the email triage agent should report on', 'string') }}",
        options: {
            systemMessage: `You are an email triage specialist. Use the Gmail tool to read the last 24 hours of messages.
For every message return: sender, subject, a one-line summary, and an urgency rating of high, medium or low.
High means it asks the user a direct question, has a deadline today, or comes from a person rather than a system.
Group newsletters, notifications and automated mail under low and summarise them as a single count per category.
Never invent messages. If the tool returns nothing, say the inbox is empty for the window.`,
            maxIterations: 8,
        },
    };

    @node({
        id: 'ab05a4d4-5f6e-4a63-ad79-c052cd4090b8',
        name: 'Calendar Agent',
        type: '@n8n/n8n-nodes-langchain.agentTool',
        version: 3,
        position: [200, 260],
    })
    CalendarAgent = {
        toolDescription:
            "Reads today's Google Calendar. Ask it for the day's schedule. Returns start time, end time, title, location and attendees per event, plus the free blocks.",
        text: "={{ $fromAI('request', 'What the calendar agent should report on', 'string') }}",
        options: {
            systemMessage: `You are a calendar specialist. Use the Google Calendar tool to list today's events.
For every event return: start time, end time, title, location and attendees.
Order events chronologically, flag back-to-back meetings, and name the longest free block of the day.
Never invent events. If the tool returns nothing, say the day is clear.`,
            maxIterations: 8,
        },
    };

    @node({
        id: '1d0c31e3-3712-4c5a-bf88-3762e65b7b37',
        name: 'Briefing Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [-220, 480],
    })
    BriefingModel = {
        model: {
            __rl: true,
            value: 'gpt-4.1-mini',
            mode: 'list',
            cachedResultName: 'gpt-4.1-mini',
        },
        options: {},
    };

    @node({
        id: '4f0febe2-a541-4351-9244-120c78892d7a',
        webhookId: 'cfac6d4e-d5cc-4776-9f15-17a26065c58d',
        name: 'Search Gmail Messages',
        type: 'n8n-nodes-base.gmailTool',
        version: 2.2,
        position: [-40, 480],
    })
    SearchGmailMessages = {
        resource: 'message',
        operation: 'getAll',
        returnAll: false,
        limit: 40,
        simple: true,
        filters: {
            receivedAfter: '={{ $now.minus({ days: 1 }).toISO() }}',
            includeSpamTrash: false,
        },
        descriptionType: 'manual',
        toolDescription: 'Returns Gmail messages received in the last 24 hours, with sender, subject and snippet.',
    };

    @node({
        id: '35b80d74-7562-4990-87a2-d390f205fdf5',
        name: 'List Calendar Events',
        type: 'n8n-nodes-base.googleCalendarTool',
        version: 1.3,
        position: [200, 480],
    })
    ListCalendarEvents = {
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
        toolDescription: "Returns today's Google Calendar events with start, end, summary, location and attendees.",
    };

    @node({
        id: '23297316-5a9e-43e2-8ffc-a31de7c3f2a1',
        webhookId: '66fc4501-8111-424d-b026-4cb8509a8a50',
        name: 'Send Briefing Email',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [400, 0],
    })
    SendBriefingEmail = {
        resource: 'message',
        operation: 'send',
        sendTo: 'etienne@etiennelescot.fr',
        subject: "=Daily Briefing - {{ $now.toFormat('cccc d LLLL yyyy') }}",
        emailType: 'html',
        message: '={{ $json.output }}',
        options: {
            appendAttribution: false,
        },
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.DailyTrigger.out(0).to(this.BriefingOrchestrator.in(0));
        this.BriefingOrchestrator.out(0).to(this.SendBriefingEmail.in(0));

        this.BriefingOrchestrator.uses({
            ai_languageModel: this.BriefingModel.output,
            ai_tool: [this.EmailTriageAgent.output, this.CalendarAgent.output],
        });
        this.EmailTriageAgent.uses({
            ai_languageModel: this.BriefingModel.output,
            ai_tool: [this.SearchGmailMessages.output],
        });
        this.CalendarAgent.uses({
            ai_languageModel: this.BriefingModel.output,
            ai_tool: [this.ListCalendarEvents.output],
        });
    }
}
