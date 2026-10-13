# Orbit X AI

Orbit X AI is a separate site in the Orbit X ecosystem. It does not modify the existing Orbit X streaming Worker or Hollowveil.

## Live site

https://orbit-x-ai.titushafner238.workers.dev/

Health endpoint: https://orbit-x-ai.titushafner238.workers.dev/health

## Design and features
- Black background with Lunar Purple accents
- Responsive layout for desktop and mobile
- New conversation button and workspace modes (AI Assistant, Explore ideas, Writing studio, Coding help)
- Starter prompts for brainstorming, writing, learning, and coding
- Server-side chat endpoint at `/api/chat`; provider calls are not exposed in browser JavaScript
- Basic health endpoint reports whether the Workers AI binding is attached

## Deployment and test status
- Deployed as the isolated Cloudflare Worker `orbit-x-ai`.
- The Worker has its own `workers.dev` subdomain enabled.
- Cloudflare deployment metadata confirms the AI binding named `AI` is attached.
- A direct Cloudflare Workers AI inference test using the configured Llama 3.3 model returned a successful response.
- The public URL was not independently fetched by the available web-fetch tools in this session, so browser-level reachability and an end-to-end chat from the live page still need a real browser test.

## Architecture
The page is embedded in the Worker module for a simple first deployment. Chat requests go to the Worker and use Cloudflare Workers AI. Cloudflare documents the `@cf/meta/llama-3.3-70b-instruct-fp8-fast` model and its usage pricing here:
https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/

AI usage can incur charges according to the Cloudflare account's plan and usage.