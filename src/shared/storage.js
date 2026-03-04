/**
 * Storage helpers for chrome.storage.local
 * Keys are NEVER logged.
 */
const StorageHelper = {
  KEYS: {
    API_KEY: 'apiKey',
    STT_PROVIDER: 'sttProvider',
    LLM_PROVIDER: 'llmProvider',
    STT_MODEL: 'sttModel',
    LLM_MODEL: 'llmModel',
    CUSTOM_STT_URL: 'customSttUrl',
    CUSTOM_LLM_URL: 'customLlmUrl',
    LOGGING_ENABLED: 'loggingEnabled',
    FAB_POSITION: 'fabPosition',
    STT_LANGUAGE: 'sttLanguage',
    OUTPUT_LANGUAGE: 'outputLanguage',
    WRITING_STYLE: 'writingStyle',
    PANEL_LAYOUT: 'panelLayout',
    PRESET_BLUEPRINTS: 'presetBlueprints'
  },

  DEFAULT_BLUEPRINTS: {
    dagrapportage: 'Beschrijf de dagelijkse observaties en activiteiten van de cliënt. Focus op: wat er is waargenomen, welke activiteiten zijn uitgevoerd, hoe de cliënt zich gedroeg en voelde, en eventuele bijzonderheden.',
    contactmoment: 'Beschrijf een specifieke interactie met de cliënt of diens naasten. Focus op: het doel van het contact, wat er besproken is, de reactie van de cliënt, en eventuele afspraken of vervolgacties.',
    evaluatie: 'Beschrijf de voortgang van de cliënt ten opzichte van de zorgdoelen. Focus op: wat goed gaat, wat verbeterpunten zijn, en eventuele aanpassingen in het zorgplan.'
  },

  DEFAULTS: {
    sttProvider: 'openai',
    llmProvider: 'openai',
    sttModel: 'whisper-1',
    llmModel: 'gpt-4o-mini',
    customSttUrl: '',
    customLlmUrl: '',
    loggingEnabled: false,
    sttLanguage: 'nl',
    outputLanguage: 'nl',
    writingStyle: 'professional',
    panelLayout: 'compact',
    fabPosition: { x: null, y: null, side: 'right' },
    presetBlueprints: null  // Uses DEFAULT_BLUEPRINTS when null
  },

  async get(key) {
    const result = await chrome.storage.local.get(key);
    if (typeof key === 'string') {
      return result[key] !== undefined ? result[key] : this.DEFAULTS[key];
    }
    // Array of keys
    const out = {};
    for (const k of key) {
      out[k] = result[k] !== undefined ? result[k] : this.DEFAULTS[k];
    }
    return out;
  },

  async set(obj) {
    await chrome.storage.local.set(obj);
  },

  async getAll() {
    const keys = Object.values(this.KEYS);
    return this.get(keys);
  },

  async getFabPosition() {
    return this.get(this.KEYS.FAB_POSITION) || this.DEFAULTS.fabPosition;
  },

  async setFabPosition(pos) {
    await this.set({ [this.KEYS.FAB_POSITION]: pos });
  }
};
