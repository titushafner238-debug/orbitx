# Orbit X AI

This folder is intended for the separate Orbit X AI site and must not change the existing streaming or Hollowveil projects.

## Design direction
- Black background with Lunar Purple accents
- Responsive desktop sidebar and compact mobile header
- Chat interface with idea, writing, coding, and learning prompts
- AI requests go through a server-side endpoint; never expose provider credentials in browser code

## Deployment status
Not deployed yet. Before launch, configure an AI provider or Cloudflare Workers AI binding, deploy the worker, open its `workers.dev` URL, and test a real conversation.