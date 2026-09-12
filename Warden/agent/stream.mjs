// Assemble Anthropic's streamed content blocks while emitting complete sentences.
export async function readMessage(response, onSentence) {
  if (!response.body) throw new Error('Provider returned no response stream');
  const content = [], partial = new Map();
  let buffer = '', sentence = '';
  const decoder = new TextDecoder();
  function flush(final = false) {
    const pieces = sentence.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [];
    for (const piece of pieces) {
      onSentence(piece.trim());
      sentence = sentence.slice(piece.length);
    }
    if (final && sentence.trim()) { onSentence(sentence.trim()); sentence = ''; }
  }
  function packet(raw) {
    const data = raw.split('\n').filter(line => line.startsWith('data: ')).map(line => line.slice(6)).join('\n');
    if (!data) return;
    const event = JSON.parse(data);
    if (event.type === 'error') throw new Error(event.error?.message || 'Provider stream failed');
    if (event.type === 'content_block_start') content[event.index] = event.content_block;
    if (event.type === 'content_block_delta') {
      const block = content[event.index];
      if (event.delta.type === 'text_delta') {
        block.text += event.delta.text;
        sentence += event.delta.text;
        flush();
      }
      if (event.delta.type === 'input_json_delta') partial.set(event.index, (partial.get(event.index) || '') + event.delta.partial_json);
    }
    if (event.type === 'content_block_stop') {
      if (partial.has(event.index)) content[event.index].input = JSON.parse(partial.get(event.index));
      flush(true);
    }
  }
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, {stream:true});
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      packet(buffer.slice(0,end)); buffer = buffer.slice(end+2);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) packet(buffer);
  flush(true);
  if (!content.length) throw new Error('Provider returned no content');
  return {content};
}
