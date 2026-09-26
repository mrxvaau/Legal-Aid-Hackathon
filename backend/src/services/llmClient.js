/**
 * Unified LLM Client for ADLASB
 * 
 * Supports external provider API (Gemini / OpenAI) when configured via env,
 * with deterministic fallback parsing for guaranteed reliability in test & offline modes.
 */
class LlmClient {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    this.openaiApiKey = process.env.OPENAI_API_KEY || null;
  }

  hasLiveProvider() {
    return Boolean(this.geminiApiKey || this.openaiApiKey);
  }

  getProviderName() {
    if (this.geminiApiKey) return 'Google Gemini API';
    if (this.openaiApiKey) return 'OpenAI API';
    return 'ADLASB Deterministic Legal Reasoning Engine';
  }

  async generateText({ prompt, systemInstruction = '', temperature = 0.2 }) {
    if (this.geminiApiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
            generationConfig: { temperature }
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { text, provider: 'gemini-1.5-flash', is_live_api: true };
        }
      } catch (err) {
        console.warn('Gemini live call failed, falling back to deterministic engine:', err.message);
      }
    }

    if (this.openaiApiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt }
            ],
            temperature
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text) return { text, provider: 'gpt-4o-mini', is_live_api: true };
        }
      } catch (err) {
        console.warn('OpenAI live call failed, falling back to deterministic engine:', err.message);
      }
    }

    // Deterministic fallback response
    return {
      text: null,
      provider: 'ADLASB-Rules-Engine-Local',
      is_live_api: false
    };
  }
}

module.exports = new LlmClient();
