# Storefront Next Template

A production-ready React storefront template for Salesforce Commerce Cloud, built with React Server Components and React Router 7.

> [!IMPORTANT]
> Storefront Next is a pilot or beta service that is subject to the Beta Services Terms at [Agreements - Salesforce.com](https://www.salesforce.com/company/legal/agreements/) or a written Unified Pilot Agreement if executed by Customer, and applicable terms in the [Product Terms Directory](https://ptd.salesforce.com/). Use of this pilot or beta service is at the Customer's sole discretion.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 22+** — [Download](https://nodejs.org/)
- **pnpm** — Install via `npm install -g pnpm` or see [pnpm.io](https://pnpm.io/installation)

## Quick Start

```bash
# 1. Clone or use this template
git clone https://github.com/SalesforceCommerceCloud/storefront-next-template my-storefront
cd my-storefront

# 2. Set up environment
cp .env.default .env
# Edit .env with your Commerce Cloud credentials

# 3. Install and run
pnpm install
pnpm dev
```

Visit [http://localhost:5173](http://localhost:5173) to see your storefront.

## Getting Your Starting Point

### Option A: Use This Template (Recommended)

Click **"Use this template"** button → **"Create a new repository"** at the top of this page.

- ✅ Fresh repo with latest stable code
- ✅ Clean Git history
- ✅ Ready to customize

### Option B: Clone a Specific Version

Use a tagged release for version pinning:

```bash
# View available versions
git tag -l

# Clone specific version
git clone --branch v1.0.0 --depth 1 \
  https://github.com/SalesforceCommerceCloud/storefront-next-template my-storefront
```

Check **[Releases](../../releases)** for all versions.

## Configuration

All settings are defined in `config.server.ts` and can be configured via environment variables—no code changes required.

### Setup

```bash
cp .env.default .env
# Edit .env with your Commerce Cloud credentials
```

### Required Variables

```bash
PUBLIC__app__commerce__api__clientId=your-client-id
PUBLIC__app__commerce__api__organizationId=your-org-id
PUBLIC__app__commerce__api__shortCode=your-short-code
PUBLIC__app__commerce__api__siteId=your-site-id
```

### How It Works

Use the `PUBLIC__` prefix with double underscores (`__`) to set any config path:

```bash
# Environment variable         →  Config path
PUBLIC__app__site__locale=en-US   →  config.app.site.locale
PUBLIC__app__site__currency=EUR   →  config.app.site.currency
```

Values are automatically parsed (numbers, booleans, JSON arrays/objects).

See [Configuration Guide](./src/config/README.md) for complete documentation.

## Deployment

Deploy your storefront to Salesforce Commerce Cloud's Managed Runtime:

```bash
pnpm build
pnpm push
```

See the [Deployment Guide](https://www.npmjs.com/package/@salesforce/storefront-next-dev?activeTab=readme) for all options and configuration.

## Available Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Run production build

# Testing & Quality
pnpm test             # Run tests
pnpm lint             # Lint code
pnpm typecheck        # Check TypeScript

# Storybook
pnpm storybook        # Component explorer
```

## Project Structure

```
src/
├── components/       # React components
├── routes/           # Page routes (file-based routing)
├── hooks/            # Custom React hooks
├── lib/              # Utilities and helpers
└── providers/        # React context providers
```

## Features

- ⚡ **React Server Components** — Server-side rendering with React 19
- 🛤️ **React Router 7** — File-based routing
- 🛒 **Commerce Cloud** — Full SCAPI integration
- 🎨 **Tailwind CSS 4** — Utility-first styling
- 🧪 **Vitest** — Fast unit testing
- 📚 **Storybook** — Component development
- 🌍 **i18n** — Multi-language support
- 🔍 **TypeScript** — Full type safety

## Documentation

- 📊 [Data Retrieval](./README-DATA.md)
- 🔐 [Authentication & Session Management](./README-AUTH.md)
- 🌍 [Internationalization (i18n)](./README-I18N.md)
- 🧪 [Tests & Coverage](./README-TESTS.md)
- 🔍 [ESLint Configuration & TypeScript Enforcement](./README-ESLINT.md)
- ⚡ [Performance](./docs/README-PERFORMANCE.md)
- 🔌 [Adapter Pattern Implementation Guide](./docs/README-ADAPTER-PATTERN-GUIDE.md)
- 📖 [Story Coverage & Code Quality Enforcement](./docs/README-STORY-COVERAGE.md)

## Contributing

This is a **mirror repository** synced from the [storefront-next monorepo](https://github.com/SalesforceCommerceCloud/storefront-next).

**To contribute:**
1. Visit the [monorepo](https://github.com/SalesforceCommerceCloud/storefront-next)
2. Submit issues or PRs there
3. Changes sync automatically to this repo

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## Support

- 📖 [Documentation (Pilot)](https://d1ahe7q2dhpmux.cloudfront.net/docs/commerce/storefront-next/overview)
  - Use the username and password that were shared with you in the pilot Slack channel
- 🐛 [Report Issues](https://github.com/SalesforceCommerceCloud/storefront-next/issues)

## License

See [LICENSE](./LICENSE) for details.

