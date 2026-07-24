const fs = require('fs');
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  if (!line.trim() || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx > -1) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
}
const { createOpenAI } = require('@ai-sdk/openai');
const { streamText, convertToModelMessages } = require('ai');
const client = createOpenAI({
  apiKey: env.CLOUDFLARE_API_TOKEN,
  baseURL: 'https://api.cloudflare.com/client/v4/accounts/' + env.CLOUDFLARE_ACCOUNT_ID + '/ai/v1',
  name: 'cloudflare',
});
(async () => {
  const uiMessages = [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }];
  const modelMessages = await convertToModelMessages(uiMessages);
  console.log(JSON.stringify(modelMessages, null, 2));
  const result = streamText({
    model: client.chat(env.CLOUDFLARE_CHAT_MODEL || '@cf/meta/llama-3.1-8b-instruct-fp8-fast'),
    messages: modelMessages,
  });
  const reader = result.textStream.getReader();
  let out = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += value;
  }
  console.log('OUTPUT', out);
})();
