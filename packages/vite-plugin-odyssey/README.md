# @salesforce/vite-plugin-odyssey

A Vite plugin for Salesforce Odyssey integration with React Router v7 and React Server Components.

## Features

- 🚀 **React Server Components (RSC)** support with Vite v7
- 🛣️ **React Router v7** integration with React Router as the framework
- 🛒 **Commerce Cloud API** add proxying for development
- 📦 **Built-in entry files** for RSC, SSR, and browser environments
- ☁️ **Managed Runtime Optimization** for Salesforce Commerce Cloud deployment environment

## Installation

```bash
npm install @salesforce/vite-plugin-odyssey
```

## Usage

### Basic Setup

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import { odysseyPlugin } from '@salesforce/vite-plugin-odyssey'

export default defineConfig({
  plugins: [
    odysseyPlugin({
      // options
    }),
  ]
})
```
