---
name: setup-e2e-workflow
description: Set up a new E2E CI driver workflow for your feature with GitHub configuration templates
---

You are helping a developer set up a new E2E CI driver workflow for their feature.

# Overview

This skill helps create:
1. E2E CI driver workflow file (`.github/workflows/e2e-<feature>-pr.yml`)
2. GitHub variable configuration instructions with MRT settings templates
3. (Optional) GitHub secret configuration instructions with env overrides templates
4. Setup checklist and validation commands

**Important constraints:**
- Focus ONLY on CI setup (assume tests with the tag already exist)
- Cannot create GitHub variables/secrets directly (provide instructions for manual setup)
- Workflows run on EVERY PR - configuration must include all necessary settings

---

# Step 1: Collect Inputs

Ask the developer for:

**1. Feature name:**
- Prompt: "What is your feature name? (e.g., checkout, search, cart)"
- Validate: kebab-case, lowercase, no spaces
- This will be used for: workflow filename, variable names, test tag

**2. Test tag pattern:**
- Prompt: "What CodeceptJS tag pattern should this workflow use? (default: @<feature>)"
- Default: `@<feature>` where `<feature>` is the feature name from step 1
- Example: For "checkout" feature → default tag is `@checkout`

**3. Validation:**
- Check if `.github/workflows/e2e-<feature>-pr.yml` already exists
- If exists: Ask developer if they want to overwrite (warn about losing changes)
- If no: Proceed with creation

---

# Step 2: Create Workflow File

Create `.github/workflows/e2e-<feature>-pr.yml` with this content:

```yaml
name: Run E2E <Feature> Tests on PR
description: 'Runs E2E <Feature> Tests on every PR against main or release-* branches using a shared MRT target pool'

# WARNING: When triggered by a PR, this workflow runs against MRT target acquired from the shared target pool.
# If this workflow runs longer than the configured cleanup TTL (default: 60 minutes),
# the acquired MRT target may be automatically released back to the pool by the
# cleanup workflow, potentially causing unexpected outcomes.
# Monitor workflow execution time and cancel/re-run the workflow with issues resolved to acquire a new MRT target.

on:
  workflow_dispatch:
    # Manually deploy e2e test setup to your own MRT Target for debugging tests.
    inputs:
      mrt_project_slug:
        type: string
        description: 'MRT Project ID'
        required: true
      mrt_target_slug:
        type: string
        description: 'MRT Environment ID'
        required: true
      mrt_target_external_hostname:
        type: string
        description: 'MRT Target External Hostname'
        required: true
      mrt_admin_cloud_origin:
        type: string
        description: 'MRT Org hostname for your project'
        required: false
        default: 'https://cloud.mobify.com'
      mrt_admin_user:
        type: string
        description: 'MRT Admin Username'
        required: true
      mrt_admin_api_key:
        type: string
        description: 'MRT Admin API key'
        required: true
      skip_tests:
        type: boolean
        description: 'Skip Tests - Uncheck if you want to run the tests as a part of this deployment'
        required: false
        default: true
  pull_request: # Default: opened, reopened, synchronize (head branch updated)
  merge_group: # Trigger workflow when a pull request is added to a merge queue.
  push:
    branches:
      - main
      - 'release-*'

permissions:
  id-token: write
  contents: read

jobs:
  call_runner:
    uses: ./.github/workflows/e2e-pr-runner.yml
    secrets:
      inherit: true
      # Remap caller secret to reusable workflow's expected name (secrets not available in with:)
      env_override_secret: ${{ secrets.STOREFRONT_NEXT_E2E_<FEATURE_UPPER>_CONFIG_OVERRIDES }}
    with:
      # <Feature> feature test configuration
      codecept_grep: '@<feature>'

      # MRT target settings - JSON payload sent directly to MRT Admin API
      # Resolves variable from GitHub and passes as JSON string
      mrt_target_settings_payload: ${{ vars.STOREFRONT_NEXT_E2E_<FEATURE_UPPER>_TARGET_SETTINGS_PAYLOAD }}

      # MRT inputs - empty string when not workflow_dispatch
      mrt_project_slug: ${{ inputs.mrt_project_slug || '' }}
      mrt_target_slug: ${{ inputs.mrt_target_slug || '' }}
      mrt_target_external_hostname: ${{ inputs.mrt_target_external_hostname || '' }}
      mrt_admin_api_key: ${{ inputs.mrt_admin_api_key || '' }}
      mrt_admin_user: ${{ inputs.mrt_admin_user || '' }}
      mrt_admin_cloud_origin: ${{ inputs.mrt_admin_cloud_origin || 'https://cloud-staging.mrt-staging.com' }}

      skip_tests: ${{ inputs.skip_tests || false }}
```

**Replacements to make:**
- `<Feature>` → Capitalize first letter of feature name (e.g., "Checkout")
- `<feature>` → Lowercase feature name (e.g., "checkout")
- `<FEATURE_UPPER>` → Uppercase feature name (e.g., "CHECKOUT")

**After creating the file:**
✅ Confirm creation with full path
✅ Show git status to indicate new file

---

# Step 3: Generate MRT Settings Configuration

**First, ask the developer:**
"Please manually check if this GitHub variable already exists:
- Go to: GitHub repo → Settings → Secrets and variables → Actions → Variables
- Look for: `STOREFRONT_NEXT_E2E_<FEATURE_UPPER>_TARGET_SETTINGS_PAYLOAD`
- Does it exist? (yes/no)"

If yes: Ask if they want to update it or use existing
If no or update: Proceed with template generation

**Provide common templates** and let developer choose:

## Template Options

### 1. Standard Storefront (Recommended)
**Use this for most features - single Commerce Cloud backend**

```json
{
  "ssr_proxy_configs": [
    {
      "host": "kv7kzm78.api.commercecloud.salesforce.com",
      "path": "api"
    }
  ],
  "allow_cookies": true
}
```

### 2. Multi-Backend
**Use this if your feature needs multiple backend services**

```json
{
  "ssr_proxy_configs": [
    {
      "host": "kv7kzm78.api.commercecloud.salesforce.com",
      "path": "api"
    },
    {
      "host": "cms.example.com",
      "path": "cms"
    },
    {
      "host": "analytics.example.com",
      "path": "analytics"
    }
  ],
  "allow_cookies": true
}
```

### 3. Debugging
**Use this for troubleshooting with verbose logging and source maps**

```json
{
  "ssr_proxy_configs": [
    {
      "host": "kv7kzm78.api.commercecloud.salesforce.com",
      "path": "api"
    }
  ],
  "allow_cookies": true,
  "enable_source_maps": true,
  "log_level": "DEBUG"
}
```

**Ask developer to choose:** "Which template fits your feature best? (1/2/3)"

**Then provide GitHub UI instructions:**

---

## GitHub Variable Setup Instructions

**Follow these steps to create the GitHub variable:**

1. **Navigate to GitHub repo settings:**
   - Go to: `https://github.com/<org>/<repo>/settings/variables/actions`
   - Or: Repository → Settings → Secrets and variables → Actions → **Variables** tab

2. **Create new variable:**
   - Click: **"New repository variable"**

3. **Copy and paste these values:**

   **Name (copy this exactly):**
   ```
   STOREFRONT_NEXT_E2E_<FEATURE_UPPER>_TARGET_SETTINGS_PAYLOAD
   ```

   **Value (copy this JSON):**
   ```json
   <SELECTED_TEMPLATE_JSON>
   ```

4. **Save:**
   - Click: **"Add variable"**

5. **Verify:**
   - You should see the variable in the list with the correct name

---

**Note:** Replace `<FEATURE_UPPER>` with the actual uppercase feature name (e.g., `CHECKOUT`).

**Important:** This configuration applies to ALL PRs. Make sure it includes everything your feature needs to run correctly.

---

# Step 4: Environment Overrides (Optional)

**Ask the developer:**
"Does your feature need environment variable overrides? (yes/no)

Examples of when you need this:
- Commerce API credentials (SLAS secrets)
- Feature flags
- Custom API endpoints
- Site ID overrides"

**If NO:**
- Skip this step
- Note in checklist: "Environment overrides marked as optional (not configured)"

**If YES:**
Ask: "What type of overrides do you need?"
- Commerce API credentials (SLAS private client)
- Feature flags
- Custom configuration
- Other (let developer describe)

**Generate template based on response:**

## Common Override Templates

### Commerce API Credentials
```bash
# Enable private client auth for E2E tests
PUBLIC__app__commerce__api__privateKeyEnabled=true
COMMERCE_API_SLAS_SECRET=your-slas-secret-here

# Override Commerce API settings
PUBLIC__COMMERCE_API__PROXY_PATH=/api
```

### Feature Flags
```bash
# Enable specific features
PUBLIC__FEATURE_FLAGS__CHECKOUT_V2=true
PUBLIC__FEATURE_FLAGS__NEW_PAYMENT_FLOW=true
```

### Custom Configuration
```bash
# Override site ID
PUBLIC__SITE_ID=RefArchGlobal

# Override API endpoints
PUBLIC__COMMERCE_API__BASE_URL=https://custom-api.example.com
```

**Then provide GitHub UI instructions:**

---

## GitHub Secret Setup Instructions

**Follow these steps to create the GitHub secret:**

1. **Navigate to GitHub repo settings:**
   - Go to: `https://github.com/<org>/<repo>/settings/secrets/actions`
   - Or: Repository → Settings → Secrets and variables → Actions → **Secrets** tab

2. **Create new secret:**
   - Click: **"New repository secret"**

3. **Copy and paste these values:**

   **Name (copy this exactly):**
   ```
   STOREFRONT_NEXT_E2E_<FEATURE_UPPER>_CONFIG_OVERRIDES
   ```

   **Value (copy this, then customize with your actual values):**
   ```bash
   <GENERATED_TEMPLATE>
   ```

4. **Important:** Replace placeholder values with your actual credentials/settings:
   - `your-slas-secret-here` → Your actual SLAS secret
   - Adjust any other values as needed

5. **Save:**
   - Click: **"Add secret"**

6. **Verify:**
   - You should see the secret in the list (value will be hidden)

---

**Note:** Replace `<FEATURE_UPPER>` with the actual uppercase feature name (e.g., `CHECKOUT`).

**Important:** These overrides apply to ALL PRs. Only include settings your feature needs.

---

# Step 5: Output Setup Checklist

Provide a summary and checklist:

---

## ✅ Setup Complete!

**Created:**
- ✅ Workflow file: `.github/workflows/e2e-<feature>-pr.yml`

**Manual steps remaining:**

### 1. Create GitHub Variable (Required)
- [ ] Go to: GitHub repo → Settings → Secrets and variables → Actions → Variables
- [ ] Create: `STOREFRONT_NEXT_E2E_<FEATURE_UPPER>_TARGET_SETTINGS_PAYLOAD`
- [ ] Value: *(see template above)*

### 2. Create GitHub Secret (Optional - only if env overrides needed)
- [ ] Go to: GitHub repo → Settings → Secrets and variables → Actions → Secrets
- [ ] Create: `STOREFRONT_NEXT_E2E_<FEATURE_UPPER>_CONFIG_OVERRIDES`
- [ ] Value: *(see template above)*

### 3. Commit and Push Workflow
```bash
git add .github/workflows/e2e-<feature>-pr.yml
git commit -m "Add E2E CI workflow for <feature>"
git push
```

### 4. Validate Setup
Create a test PR to verify the workflow:
```bash
git checkout -b test-<feature>-e2e-ci
git commit --allow-empty -m "Test <feature> E2E CI workflow"
git push origin test-<feature>-e2e-ci
```

Then verify:
- [ ] Workflow triggers automatically
- [ ] "Mode: POOL" appears in logs
- [ ] MRT settings update succeeds
- [ ] Tests run with `@<feature>` tag
- [ ] Target released back to pool

### 5. Test Locally
Before pushing, test your configuration locally:
```bash
cd packages/storefront-next-e2e
pnpm e2e --grep "@<feature>"
```

---

## 📚 Additional Resources

- **Full setup guide:** `packages/storefront-next-e2e/docs/ci-workflows.md`
- **Troubleshooting:** `packages/storefront-next-e2e/docs/ci-workflows.md#troubleshooting`
- **MRT Admin API docs:** https://developer.salesforce.com/docs/commerce/pwa-kit-managed-runtime/references/mrt-admin

---

## ⚠️ Important Reminders

1. **Secrets must use the `secrets:` block** - GitHub Actions does not allow `secrets.XXX` in `with:` inputs when calling reusable workflows. Pass env overrides via `secrets.env_override_secret`, not as a `with:` input.

2. **Your workflow runs on EVERY PR** - ensure your configuration includes all necessary settings
3. **Pool targets are shared** - workflow has 60 minutes before automatic cleanup
4. **Test locally first** - validate your feature works with the configured settings
5. **Tag your tests** - make sure your E2E tests use the `@<feature>` tag

---

Need help? Check the troubleshooting section in `docs/ci-workflows.md` or ask in your team's channel.

---

# Execution Notes

**DO:**
- ✅ Replace all template placeholders (<Feature>, <feature>, <FEATURE_UPPER>)
- ✅ Validate JSON syntax before providing templates
- ✅ Ask for manual confirmation of GitHub variable/secret existence
- ✅ Provide exact copy-paste values
- ✅ Show clear numbered steps for GitHub UI
- ✅ Assume tests with the tag already exist

**DON'T:**
- ❌ Try to create GitHub variables/secrets directly
- ❌ Check if tests exist (assume they do)
- ❌ Skip asking about env overrides
- ❌ Provide incomplete instructions
- ❌ Forget to customize templates for the specific feature

**After completion:**
Show git status and remind developer to commit the workflow file.
