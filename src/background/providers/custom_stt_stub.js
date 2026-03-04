/**
 * Custom STT Provider Stub
 * POST {baseUrl}/transcribe (multipart file)
 * For future integration with custom speech-to-text endpoints
 */
const CustomSTT = {
  name: 'custom',

  /**
   * Transcribe audio via custom endpoint
   * @param {Object} params
   * @param {string} params.audioBase64 - Base64 encoded audio
   * @param {string} params.mimeType - e.g. 'audio/webm'
   * @param {string} params.baseUrl - Custom endpoint base URL
   * @param {string} params.language - e.g. 'nl'
   * @returns {Promise<{transcript: string}>}
   */
  async transcribe({ audioBase64, mimeType, baseUrl, language }) {
    if (!baseUrl) {
      throw new Error('Geen custom STT URL ingesteld. Ga naar extensie-instellingen.');
    }

    // Convert base64 to blob
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: mimeType });

    const formData = new FormData();
    const ext = mimeType.includes('webm') ? 'webm' : 'wav';
    formData.append('file', audioBlob, `audio.${ext}`);
    if (language) {
      formData.append('language', language);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const url = baseUrl.replace(/\/+$/, '') + '/transcribe';
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Custom STT fout: ${response.status}`);
      }

      const data = await response.json();
      return { transcript: data.transcript || data.text || '' };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Custom STT timeout (30s). Probeer opnieuw.');
      }
      throw err;
    }
  }
};
