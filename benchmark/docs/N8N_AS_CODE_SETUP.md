# Installation & Preparation Guide: n8n-as-code (`n8nac`)

This guide provides the official, step-by-step procedure to install and configure `n8n-as-code` on your system and link it to your n8n instance.

---

## 1. Prerequisites

- **Node.js**: `v18.0.0` or later (`node -v`).
- **npm**: `v9.0.0` or later (`npm -v`).
- **n8n Instance**: Running locally or on the cloud with API access enabled.

---

## 2. Installation Options

### Option A: Direct CLI Usage via `npx` (Zero Global Install)
You do not need to install anything globally. You can invoke the CLI on demand:
```bash
npx --yes n8nac --version
```

### Option B: Local / Project Installation
```bash
npm install -g n8nac
# Or inside your workspace:
npm install --save-dev n8nac
```

### Option C: AI Agent Skill (Claude / Cursor / Antigravity)
Install the `n8n-architect` skill into your agent workspace:
```bash
# Claude Code plugin
/plugin marketplace add https://github.com/EtienneLescot/n8n-as-code
/plugin install n8n-as-code@n8nac-marketplace
```
Or reference the repository skill:
`skills/n8n-architect/SKILL.md`

---

## 3. Preparing Your n8n Instance

1. Open your n8n instance (e.g. `http://localhost:5678`).
2. Navigate to **Settings > n8n API**.
3. Click **Create API Key**.
4. Copy your API Key (e.g. `n8n_api_...`).

---

## 4. Configuring a Workspace Environment

Run the following commands inside your project root or sandbox directory:

```bash
# 1. Add your n8n environment
npx --yes n8nac env add Production --base-url http://localhost:5678 --workflows-path workflows/prod

# 2. Provide the API key securely via stdin
echo "your_n8n_api_key_here" | npx --yes n8nac env auth set Production --api-key-stdin

# 3. Select the environment as active
npx --yes n8nac env use Production

# 4. Generate/refresh agent context and schemas
npx --yes n8nac update-ai
```

---

## 5. Verification Check

Verify workspace readiness with:
```bash
npx --yes n8nac env status --json
```

Expected output:
```json
{
  "activeEnvironment": "Production",
  "configured": true,
  "baseUrl": "http://localhost:5678",
  "workflowsPath": "workflows/prod",
  "ready": true
}
```

---

## 6. How Workflows are Authored & Deployed

1. **Authoring**: Workflows are authored as clean `.json` or `.workflow.ts` files inside `workflows/prod/`.
2. **Offline Validation**:
   ```bash
   npx --yes n8nac validate workflows/prod/daily_briefing.json
   ```
3. **Deployment / Push**:
   ```bash
   npx --yes n8nac push
   ```
