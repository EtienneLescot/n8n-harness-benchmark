/**
 * Call one tool on n8n's native MCP server. Node only, so it runs wherever the harness does.
 *
 *   node mcp_call.mjs                          list the tools
 *   node mcp_call.mjs <tool> '<json args>'     call one
 *
 * Reads N8N_NATIVE_MCP_URL and N8N_NATIVE_MCP_TOKEN from the .env sitting beside this file.
 * Self-contained on purpose: a sandbox may not import anything from the harness.
 *
 * The transport is JSON-RPC over Streamable HTTP. Responses arrive either as plain JSON or as
 * SSE frames, and the server picks; both are handled. The protocol version is negotiated by
 * trying the known ones newest first, which is what the PowerShell helper beside this does.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const TIMEOUT_MS = 60000;

function loadDotEnv(file) {
    const out = {};
    if (!fs.existsSync(file)) return out;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i < 1) continue;
        let v = t.slice(i + 1).trim();
        if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
            v = v.slice(1, -1);
        }
        out[t.slice(0, i).trim().replace(/^﻿/, '')] = v;
    }
    return out;
}

/** A body is either one JSON document or a stream of SSE frames. Prefer a frame carrying a result. */
function parseBody(raw) {
    if (!raw || !raw.trim()) return null;
    if (/^data:/m.test(raw)) {
        const found = [];
        for (const m of raw.matchAll(/^data:[ \t]*(.+)$/gm)) {
            const d = m[1].trim();
            if (d === '[DONE]') continue;
            try { found.push(JSON.parse(d)); } catch { /* a partial frame is not an error */ }
        }
        return found.find((o) => o && o.result) ?? found[0] ?? null;
    }
    try { return JSON.parse(raw); } catch { return null; }
}

async function post(url, token, body, sessionId, protocolVersion) {
    const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: 'Bearer ' + token,
    };
    if (sessionId) headers['Mcp-Session-Id'] = sessionId;
    if (protocolVersion) headers['MCP-Protocol-Version'] = protocolVersion;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
        const raw = await res.text().catch(() => '');
        return {
            status: res.status,
            raw,
            parsed: parseBody(raw),
            sessionId: res.headers.get('Mcp-Session-Id') || res.headers.get('mcp-session-id') || null,
        };
    } finally {
        clearTimeout(timer);
    }
}

const [, , toolName = '__list', argumentsJson = '{}'] = process.argv;
const env = loadDotEnv(path.join(HERE, '.env'));
const url = env.N8N_NATIVE_MCP_URL;
const token = env.N8N_NATIVE_MCP_TOKEN;
if (!url || !token) {
    console.log(JSON.stringify({ error: 'missing env', need: ['N8N_NATIVE_MCP_URL', 'N8N_NATIVE_MCP_TOKEN'] }));
    process.exit(1);
}

let negotiated = null;
let sessionId = null;
for (const pv of PROTOCOL_VERSIONS) {
    const r = await post(url, token, {
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: pv, capabilities: {}, clientInfo: { name: 'native-mcp-helper', version: '1.0.0' } },
    });
    if (r.status >= 200 && r.status < 300 && r.parsed && r.parsed.result) {
        negotiated = r.parsed.result.protocolVersion || pv;
        sessionId = r.sessionId;
        break;
    }
}
if (!negotiated) {
    console.log(JSON.stringify({ error: 'initialize failed', triedProtocolVersions: PROTOCOL_VERSIONS }));
    process.exit(1);
}

await post(url, token, { jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, sessionId, negotiated);

let args;
try {
    args = JSON.parse(argumentsJson);
} catch (e) {
    console.log(JSON.stringify({ error: 'arguments must be JSON', got: argumentsJson, detail: e.message }));
    process.exit(2);
}

const call = toolName === '__list'
    ? { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }
    : { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: toolName, arguments: args } };

const out = await post(url, token, call, sessionId, negotiated);
if (!out.parsed) {
    console.log(JSON.stringify({ error: 'unparseable response', status: out.status, raw: out.raw.slice(0, 400) }));
    process.exit(1);
}
console.log(JSON.stringify(out.parsed, null, 2));
