/**
 * OpenAI Speech-to-Text Provider
 * Uses OpenAI audio transcriptions endpoint (multipart/form-data)
 */
const OpenAISTT = {
  name: 'openai',

  /**
   * Transcribe audio blob to text
   * @param {Object} params
   * @param {string} params.audioBase64 - Base64 encoded audio
   * @param {string} params.mimeType - e.g. 'audio/webm'
   * @param {string} params.apiKey - OpenAI API key
   * @param {string} params.model - e.g. 'whisper-1'
   * @param {string} params.language - e.g. 'nl'
   * @returns {Promise<{transcript: string}>}
   */
  async transcribe({ audioBase64, mimeType, apiKey, model, language }) {
    if (!apiKey) {
      throw new Error('Geen API key ingesteld. Ga naar extensie-instellingen.');
    }

    // Convert base64 to blob
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: mimeType });

    // Build multipart form data
    const formData = new FormData();
    const ext = mimeType.includes('webm') ? 'webm' : 'wav';
    formData.append('file', audioBlob, `audio.${ext}`);
    formData.append('model', model || 'whisper-1');
    if (language) {
      formData.append('language', language);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `STT fout: ${response.status}`);
      }

      const data = await response.json();
      return { transcript: data.text || '' };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Transcriptie timeout (30s). Probeer opnieuw.');
      }
      throw err;
    }
  }
};
