import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : bench-9d6979da
// Nodes   : 11  |  Connections: 10
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// EveryMorningAt7                    scheduleTrigger
// GetLast24hEmails                   gmail                      [alwaysOutput]
// CollectEmails                      aggregate
// EmailTriageAgent                   agent                      [AI]
// GetTodayEvents                     googleCalendar             [alwaysOutput]
// CollectEvents                      aggregate
// CalendarAgent                      agent                      [AI]
// WaitForBothAgents                  merge
// BriefingEditorAgent                agent                      [AI]
// BriefingModel                      lmChatOpenAi               [ai_languageModel] [ai_languageModel] [ai_languageModel]
// EmailTheBriefing                   gmail
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// EveryMorningAt7
//    → GetLast24hEmails
//      → CollectEmails
//        → EmailTriageAgent
//          → WaitForBothAgents
//            → BriefingEditorAgent
//              → EmailTheBriefing
//    → GetTodayEvents
//      → CollectEvents
//        → CalendarAgent
//          → WaitForBothAgents.in(1) (↩ loop)
//
// AI CONNECTIONS
// EmailTriageAgent.uses({ ai_languageModel: BriefingModel })
// CalendarAgent.uses({ ai_languageModel: BriefingModel })
// BriefingEditorAgent.uses({ ai_languageModel: BriefingModel })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'Y2JEWHYGKsU9xhQ0',
    name: 'bench-9d6979da',
    active: false,
    isArchived: false,
    settings: { executionOrder: 'v1', availableInMCP: true },
})
export class Bench9d6979daWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '4c180e73-08a9-40db-b62e-9f8796fed448',
        name: 'Every Morning At 7',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.4,
        position: [-260, 0],
    })
    EveryMorningAt7 = {
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
        id: '97804706-0a75-46b1-9d53-33fa26b4cc13',
        webhookId: 'fcf23751-2ed7-4452-bd79-e359c21a56c0',
        name: 'Get Last 24h Emails',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [-40, -160],
        alwaysOutputData: true,
    })
    GetLast24hEmails = {
        resource: 'message',
        operation: 'getAll',
        returnAll: false,
        limit: 25,
        simple: true,
        filters: {
            receivedAfter: '={{ $now.minus({ hours: 24 }).toISO() }}',
            readStatus: 'both',
        },
    };

    @node({
        id: '96d03cbf-b9b8-4e58-b564-12adf32c64c2',
        name: 'Collect Emails',
        type: 'n8n-nodes-base.aggregate',
        version: 1,
        position: [180, -160],
    })
    CollectEmails = {
        aggregate: 'aggregateAllItemData',
        destinationFieldName: 'emails',
    };

    @node({
        id: 'afd80382-5ff8-4746-b42b-02a6be71a4de',
        name: 'Email Triage Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [400, -160],
    })
    EmailTriageAgent = {
        promptType: 'define',
        text: `=Emails received in the last 24 hours, raw JSON:

{{ JSON.stringify($json.emails) }}`,
        options: {
            systemMessage:
                'You are the Email Triage Agent of a daily briefing crew. You receive the raw JSON of the emails received in the last 24 hours. Sort every email into exactly one bucket: ACTION REQUIRED, WAITING ON REPLY, FYI, or NOISE. For each email output one line formatted as: BUCKET | sender | subject | short reason. Then output a final line starting with TOP3: followed by the three most urgent subjects, most urgent first. Be terse, no preamble. Never invent an email that is not in the input. If the input list is empty or contains no real message, output exactly: NO EMAILS.',
        },
    };

    @node({
        id: 'f9079e22-ab3f-43c0-9f95-1ac6da6e2be2',
        name: 'Get Today Events',
        type: 'n8n-nodes-base.googleCalendar',
        version: 1.3,
        position: [-40, 160],
        alwaysOutputData: true,
    })
    GetTodayEvents = {
        resource: 'event',
        operation: 'getAll',
        calendar: {
            __rl: true,
            value: 'primary',
            mode: 'id',
        },
        timeMin: '={{ $now.startOf("day").toISO() }}',
        timeMax: '={{ $now.endOf("day").toISO() }}',
        returnAll: false,
        limit: 50,
        options: {
            singleEvents: true,
            orderBy: 'startTime',
        },
    };

    @node({
        id: 'c47d0748-796e-4fcc-903c-e9f918149bb9',
        name: 'Collect Events',
        type: 'n8n-nodes-base.aggregate',
        version: 1,
        position: [180, 160],
    })
    CollectEvents = {
        aggregate: 'aggregateAllItemData',
        destinationFieldName: 'events',
    };

    @node({
        id: '4a81d281-f7d4-4c47-8132-793f825c22de',
        name: 'Calendar Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [400, 160],
    })
    CalendarAgent = {
        promptType: 'define',
        text: `=Google Calendar events for today, raw JSON:

{{ JSON.stringify($json.events) }}`,
        options: {
            systemMessage:
                'You are the Calendar Agent of a daily briefing crew. You receive the raw JSON of today Google Calendar events. Output a chronological timeline, one line per event formatted as: HH:mm-HH:mm | title | location or meeting link | number of attendees. Then output a line starting with OVERLAPS: listing any events that collide, a line starting with FREE: giving the largest free block between 08:00 and 19:00, and a line starting with PREP: listing events that need preparation. Be terse, no preamble. Never invent an event that is not in the input. If the input list is empty or contains no real event, output exactly: NO EVENTS TODAY.',
        },
    };

    @node({
        id: '9a0532c3-7381-4858-9539-723bd7524698',
        name: 'Wait For Both Agents',
        type: 'n8n-nodes-base.merge',
        version: 3.2,
        position: [660, 0],
    })
    WaitForBothAgents = {
        mode: 'chooseBranch',
        numberInputs: 2,
        chooseBranchMode: 'waitForAll',
        output: 'specifiedInput',
        useDataOfInput: 1,
    };

    @node({
        id: '58a77fd1-0962-4f54-be88-ee0baaf2e501',
        name: 'Briefing Editor Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [880, 0],
    })
    BriefingEditorAgent = {
        promptType: 'define',
        text: `=Date: {{ $now.toFormat("cccc d LLLL yyyy") }}

EMAIL TRIAGE REPORT:
{{ $("Email Triage Agent").first().json.output }}

CALENDAR REPORT:
{{ $("Calendar Agent").first().json.output }}`,
        options: {
            systemMessage:
                'You are the Briefing Editor Agent. You merge the Email Triage Agent report and the Calendar Agent report into one self contained HTML daily briefing dashboard. Output rules: return raw HTML only, starting with <!DOCTYPE html> and ending with </html>, no markdown, no code fences, no commentary before or after. Single file, inline CSS only, no external asset, no JavaScript. Layout: a header with the date, then a row of summary cards showing emails needing action, meetings today, first meeting time and largest free block, then two columns, left column Schedule as a vertical timeline, right column Inbox grouped by bucket with ACTION REQUIRED first, then a closing Top 3 Priorities section that merges both reports. Style: light neutral background, system font stack, rounded cards with soft borders, max width 900px centered, and a media query that stacks the two columns below 700px. Use colour only to mark priority, red for action required, amber for waiting on reply, grey for FYI and noise. Use only facts present in the two reports, never invent an email, an event or a number.',
        },
    };

    @node({
        id: '07df04bb-a9fb-4b0c-8a02-003066e0e873',
        name: 'Briefing Model',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1.3,
        position: [640, 320],
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
        id: '7dccba5c-4e9e-40cc-bfa1-541bd7cf18d7',
        webhookId: '12e2210d-58be-4d38-aeb9-78a014940264',
        name: 'Email The Briefing',
        type: 'n8n-nodes-base.gmail',
        version: 2.2,
        position: [1140, 0],
    })
    EmailTheBriefing = {
        resource: 'message',
        operation: 'send',
        sendTo: 'etienne@etiennelescot.fr',
        subject: '=Daily briefing - {{ $now.toFormat("dd LLL yyyy") }}',
        emailType: 'html',
        message: '={{ $json.output.replace(/```html/g, "").replace(/```/g, "").trim() }}',
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.EveryMorningAt7.out(0).to(this.GetLast24hEmails.in(0));
        this.EveryMorningAt7.out(0).to(this.GetTodayEvents.in(0));
        this.GetLast24hEmails.out(0).to(this.CollectEmails.in(0));
        this.CollectEmails.out(0).to(this.EmailTriageAgent.in(0));
        this.GetTodayEvents.out(0).to(this.CollectEvents.in(0));
        this.CollectEvents.out(0).to(this.CalendarAgent.in(0));
        this.EmailTriageAgent.out(0).to(this.WaitForBothAgents.in(0));
        this.CalendarAgent.out(0).to(this.WaitForBothAgents.in(1));
        this.WaitForBothAgents.out(0).to(this.BriefingEditorAgent.in(0));
        this.BriefingEditorAgent.out(0).to(this.EmailTheBriefing.in(0));

        this.EmailTriageAgent.uses({
            ai_languageModel: this.BriefingModel.output,
        });
        this.CalendarAgent.uses({
            ai_languageModel: this.BriefingModel.output,
        });
        this.BriefingEditorAgent.uses({
            ai_languageModel: this.BriefingModel.output,
        });
    }
}
