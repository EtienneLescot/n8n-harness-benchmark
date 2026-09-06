# Guide: n8n-as-code Setup & Workflow Authoring

## 1. Installation
Install the CLI globally or use via npx:
```bash
npm install -g n8nac
# Or verify version
n8nac --version
```

## 2. Environment Linking
```bash
# 1. Add workspace environment
n8nac env add Production --base-url <n8n_url> --workflows-path workflows/prod

# 2. Store API key securely via stdin
echo "<API_KEY>" | n8nac env auth set Production --api-key-stdin

# 3. Select active environment
n8nac env use Production

# 4. Refresh AI context and schemas
n8nac update-ai
```

## 3. Workflow Authoring & Local Validation
1. Author workflows in `workflows/prod/<name>.json` or `<name>.workflow.ts`.
2. Validate locally using the bundled schema validator:
   ```bash
   n8nac skills validate workflows/prod/<name>.json
   ```
3. Convert to TypeScript workflow if needed:
   ```bash
   n8nac convert workflows/prod/<name>.json
   ```
4. Push to n8n instance:
   ```bash
   n8nac push workflows/prod/<name>.workflow.ts
   ```
