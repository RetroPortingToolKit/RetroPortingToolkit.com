import { describe, it, expect, vi } from 'vitest';
import { intentPrompt, parseIntent, classifyIntent, apiIntentCall, INTENT_MODEL } from './intent.mjs';

const fallback = (text) => (/^(nice|huh)$/i.test(text) ? 'chat' : 'request');

describe('reading what a message asks for', () => {
  it('puts the message, what it replies to, and the channel in front of the model', () => {
    const prompt = intentPrompt({ text: 'Please remove this for now', replyTo: '🎉 Mega Man X: new release v1.7.0-rc.1', channel: 'gamemaster: Ah shit. I didn\'t want to publicize that yet' });
    expect(prompt).toContain('Please remove this for now');
    expect(prompt).toContain('replies to this post by the bot');
    expect(prompt).toContain('v1.7.0-rc.1');
    expect(prompt).toContain('for context only');
    expect(prompt).toContain('publicize');
    expect(prompt).toMatch(/exactly one word: REQUEST or CHAT/);
    // Nothing in the prompt is an instruction to the model to act on the site.
    expect(intentPrompt({ text: 'hi' })).not.toContain('replies to this post');
  });

  it('accepts the one word in any dress, and nothing else', () => {
    expect(parseIntent('REQUEST')).toBe('request');
    expect(parseIntent('  chat\n')).toBe('chat');
    expect(parseIntent('Answer: CHAT.')).toBe('chat');
    expect(parseIntent('I would say this is a request to change the page')).toBe('request');
    expect(parseIntent('maybe')).toBeNull();
    expect(parseIntent('')).toBeNull();
    expect(parseIntent(undefined)).toBeNull();
  });

  it('takes the model\'s word when it gives one', async () => {
    const call = vi.fn(async () => 'REQUEST');
    expect(await classifyIntent({ text: 'It seems bomberman got updated' }, { call, fallback })).toBe('request');
    expect(call).toHaveBeenCalledOnce();
    expect(call.mock.calls[0][0]).toContain('It seems bomberman got updated');
  });

  it('falls back to the heuristic without a model, on an error, and on an off-list answer', async () => {
    const log = vi.fn();
    expect(await classifyIntent({ text: 'huh' }, { call: null, fallback, log })).toBe('chat');
    expect(log).toHaveBeenLastCalledWith(expect.stringMatching(/^heuristic: chat/));
    expect(await classifyIntent({ text: 'do it' }, { call: async () => { throw new Error('HTTP 529'); }, fallback, log })).toBe('request');
    expect(log).toHaveBeenLastCalledWith(expect.stringContaining('HTTP 529'));
    expect(await classifyIntent({ text: 'nice' }, { call: async () => 'I am not sure', fallback, log })).toBe('chat');
    expect(log).toHaveBeenLastCalledWith(expect.stringContaining('off-list'));
  });

  it('logs a short slice of the message, never the prompt', async () => {
    const log = vi.fn();
    const long = 'x'.repeat(500);
    await classifyIntent({ text: long, replyTo: 'SECRET-REPLY' }, { call: async () => 'CHAT', fallback, log });
    const line = log.mock.calls[0][0];
    expect(line.length).toBeLessThan(120);
    expect(line).not.toContain('SECRET-REPLY');
  });
});

describe('the model call', () => {
  it('asks the small model for one word, with the key in the header and nowhere else', async () => {
    const fetcher = vi.fn(async () => Response.json({ content: [{ type: 'text', text: 'CHAT' }] }));
    const call = apiIntentCall('sk-test-key', fetcher);
    expect(await call('the prompt')).toBe('CHAT');
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('sk-test-key');
    const body = JSON.parse(init.body);
    expect(body.model).toBe(INTENT_MODEL);
    expect(body.max_tokens).toBeLessThanOrEqual(10);
    expect(body.messages[0].content).toBe('the prompt');
    expect(init.body).not.toContain('sk-test-key');
  });

  it('is nothing without a key, and an error on a bad status', async () => {
    expect(apiIntentCall('')).toBeNull();
    expect(apiIntentCall(undefined)).toBeNull();
    const call = apiIntentCall('k', async () => new Response('', { status: 429 }));
    await expect(call('p')).rejects.toThrow('HTTP 429');
  });
});
