import { describe, expect, it } from 'vitest';
import { createThread } from './threads';
import { getMessagesByThread, insertMessages } from './messages';

describe('messages queries', () => {
  it('inserts user + assistant messages and returns them in insertion order', async () => {
    const thread = await createThread({ title: 'Chat' });

    await insertMessages([
      { threadId: thread.id, role: 'user', parts: '{"text":"hi"}' },
      {
        threadId: thread.id,
        role: 'assistant',
        parts: '{"text":"hello"}',
        model: 'gpt-4o',
        inputTokens: 10,
        outputTokens: 20,
      },
    ]);

    const found = await getMessagesByThread(thread.id);

    expect(found).toHaveLength(2);
    expect(found[0]).toMatchObject({
      role: 'user',
      parts: '{"text":"hi"}',
      model: null,
      inputTokens: null,
      outputTokens: null,
    });
    expect(found[1]).toMatchObject({
      role: 'assistant',
      parts: '{"text":"hello"}',
      model: 'gpt-4o',
      inputTokens: 10,
      outputTokens: 20,
    });
  });
});
