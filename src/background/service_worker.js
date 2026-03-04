/**
 * Background Service Worker (MV3)
 * Routes messages from content script to appropriate providers.
 * Handles: transcribe, generate, getSettings, saveSettings
 */

// Import providers
importScripts(
  '../shared/messaging.js',
  '../shared/storage.js',
  'providers/openai_stt.js',
  'providers/openai_llm.js',
  'providers/custom_stt_stub.js',
  'providers/custom_llm_stub.js'
);

/**
 * Conditional logger - only logs when logging is enabled in settings
 */
async function conditionalLog(...args) {
  const enabled = await StorageHelper.get(StorageHelper.KEYS.LOGGING_ENABLED);
  if (enabled) {
    // Never log API keys even when logging is enabled
    const sanitized = args.map(arg => {
      if (typeof arg === 'string' && arg.startsWith('sk-')) return '[REDACTED]';
      if (typeof arg === 'object' && arg !== null) {
        const clone = { ...arg };
        if (clone.apiKey) clone.apiKey = '[REDACTED]';
        return clone;
      }
      return arg;
    });
    console.log('[Rapido]', ...sanitized);
  }
}

/**
 * Get the appropriate STT provider based on settings
 */
function getSTTProvider(providerName) {
  switch (providerName) {
    case 'custom': return CustomSTT;
    case 'openai':
    default: return OpenAISTT;
  }
}

/**
 * Get the appropriate LLM provider based on settings
 */
function getLLMProvider(providerName) {
  switch (providerName) {
    case 'custom': return CustomLLM;
    case 'openai':
    default: return OpenAILLM;
  }
}

/**
 * Handle transcription requests
 */
async function handleTranscribe(data) {
  const settings = await StorageHelper.getAll();
  const provider = getSTTProvider(settings.sttProvider);

  await conditionalLog('Transcribe request via provider:', provider.name);

  const params = {
    audioBase64: data.audioBase64,
    mimeType: data.mimeType || 'audio/webm',
    language: settings.sttLanguage || 'nl'
  };

  if (provider.name === 'openai') {
    params.apiKey = settings.apiKey;
    params.model = settings.sttModel || 'whisper-1';
  } else {
    params.baseUrl = settings.customSttUrl;
  }

  const result = await provider.transcribe(params);
  await conditionalLog('Transcribe result length:', result.transcript?.length);
  return { success: true, transcript: result.transcript };
}

/**
 * Handle generation requests
 */
async function handleGenerate(data) {
  const settings = await StorageHelper.getAll();
  const provider = getLLMProvider(settings.llmProvider);

  await conditionalLog('Generate request via provider:', provider.name, 'preset:', data.preset);

  const params = {
    preset: data.preset,
    input: data.input,
    context: data.context || {},
    writingStyle: data.writingStyle || settings.writingStyle || 'professional',
    outputLanguage: settings.outputLanguage || 'nl',
    presetBlueprint: (settings.presetBlueprints || StorageHelper.DEFAULT_BLUEPRINTS)[data.preset] || ''
  };

  if (provider.name === 'openai') {
    params.apiKey = settings.apiKey;
    params.model = settings.llmModel || 'gpt-4o-mini';
  } else {
    params.baseUrl = settings.customLlmUrl;
  }

  const result = await provider.generate(params);
  await conditionalLog('Generate result length:', result.output?.length);
  return { success: true, output: result.output };
}

/**
 * Handle getSettings requests
 */
async function handleGetSettings() {
  const settings = await StorageHelper.getAll();
  // Never send API key to content script - only confirm it exists
  return {
    success: true,
    hasApiKey: !!settings.apiKey,
    sttProvider: settings.sttProvider,
    llmProvider: settings.llmProvider,
    loggingEnabled: settings.loggingEnabled
  };
}

/**
 * Message listener
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, ...data } = message;

  const handle = async () => {
    try {
      switch (action) {
        case MSG.TRANSCRIBE:
          return await handleTranscribe(data);
        case MSG.GENERATE:
          return await handleGenerate(data);
        case MSG.GET_SETTINGS:
          return await handleGetSettings();
        case 'openOptions':
          chrome.runtime.openOptionsPage();
          return { success: true };
        default:
          return { success: false, error: `Onbekende actie: ${action}` };
      }
    } catch (err) {
      await conditionalLog('Error:', err.message);
      return { success: false, error: err.message };
    }
  };

  handle().then(sendResponse);
  return true; // Keep message channel open for async response
});

// Log startup
conditionalLog('Rapido service worker gestart.');
