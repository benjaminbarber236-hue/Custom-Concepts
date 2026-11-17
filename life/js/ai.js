// AI tidy-up: Claude turns rough voice dictation (often whispered, half-asleep) into the story
// the person meant. Uses the person's own Claude API key, saved only on this device (never in
// backups). The SDK is loaded only when it's first used.
(function () {
  const KEY = 'life-ai-key';
  const MODEL = 'claude-opus-5-5';
  let sdk = null;

  const getKey = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  const setKey = (k) => { try { if (k) localStorage.setItem(KEY, k); else localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } };

  async function loadSDK() {
    if (!sdk) sdk = (await import(new URL('js/vendor/anthropic-sdk-1.4.0.mjs', document.baseURI).href)).default;
    return sdk;
  }

  function systemPrompt(kind) {
    const what = kind === 'dream'
      ? 'a dream journal entry. The person dictated it right after waking up, often whispering, so the speech recognition may have misheard a lot.'
      : 'a personal journal entry.';
    return `You turn rough voice dictation into ${what}

The text came from speech-to-text. Expect misheard words, words that sound alike but are wrong, missing punctuation, run-on sentences, filler ("um", "like", "you know"), false starts and repeated phrases.

Rewrite it as the person meant it:
- Fix words that were clearly misheard, using the rest of the story to work out what they said.
- Add punctuation, and paragraph breaks where the scene or topic changes.
- Drop filler words and false starts.
- Keep their voice and first person, and keep every detail they mentioned, even strange ones. In a dream, odd details are real content, not mistakes.
- Don't add events, feelings, explanations, interpretations or a title.
- If a word can't be worked out, give your best guess followed by [?].

Reply with the cleaned-up text only.`;
  }

  // Returns the tidied text, or throws an Error with a message meant for the person.
  async function tidy(text, kind) {
    const apiKey = getKey();
    if (!apiKey) throw new Error('Add your Claude API key in Settings first.');
    if (!navigator.onLine) throw new Error('You’re offline. Your words are saved as they are; tidy them up later.');
    const Anthropic = await loadSDK();
    // The key belongs to the person using this phone and stays on it, so calling from the browser is fine here.
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    let res;
    try {
      res = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        // A quick, faithful rewrite doesn't need deep thinking; low effort keeps it fast.
        output_config: { effort: 'low' },
        // If a safety check declines, the API retries on a suitable model instead of failing.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: systemPrompt(kind),
        messages: [{ role: 'user', content: text }],
      });
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new Error('Your Claude API key wasn’t accepted. Check it in Settings.');
      if (e instanceof Anthropic.PermissionDeniedError) throw new Error('That API key can’t use Claude yet. Check billing in the Claude Console.');
      if (e instanceof Anthropic.RateLimitError) throw new Error('Too many requests right now. Try again in a minute.');
      if (e instanceof Anthropic.APIConnectionError) throw new Error('Couldn’t reach Claude. Check your internet and try again.');
      if (e instanceof Anthropic.APIError) throw new Error(`Claude had a problem (${e.status || 'error'}). Try again in a moment.`);
      throw new Error('Something went wrong tidying this up. Your words are unchanged.');
    }
    if (res.stop_reason === 'refusal') throw new Error('Claude couldn’t tidy this one. Your words are unchanged.');
    const out = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    if (!out) throw new Error('Claude sent back nothing. Your words are unchanged.');
    return out;
  }

  // Settings: a tiny request to check the key works.
  async function test() { return tidy('um so this is a test of the the voice typing', 'journal'); }

  L.ai = { getKey, setKey, tidy, test, available: () => !L.DEMO };
})();
