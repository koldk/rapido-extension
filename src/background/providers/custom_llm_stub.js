/**
 * Custom LLM Provider Stub
 * POST {baseUrl}/generate (json)
 * For future integration with custom LLM endpoints
 */
const CustomLLM = {
  name: 'custom',

  /**
   * Generate text via custom endpoint
   * @param {Object} params
   * @param {string} params.preset - 'dagrapportage' | 'contactmoment' | 'evaluatie'
   * @param {string} params.input - User transcript/text
   * @param {Object} params.context - { url, title }
   * @param {string} params.baseUrl - Custom endpoint base URL
   * @returns {Promise<{output: string}>}
   */
  async generate({ preset, input, context, baseUrl }) {
    if (!baseUrl) {
      throw new Error('Geen custom LLM URL ingesteld. Ga naar extensie-instellingen.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const url = baseUrl.replace(/\/+$/, '') + '/generate';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preset,
          input,
          context
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Custom LLM fout: ${response.status}`);
      }

      const data = await response.json();
      return { output: data.output || data.text || '' };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Custom LLM timeout (30s). Probeer opnieuw.');
      }
      throw err;
    }
  }
};
