/**
 * Rapido - Options Page Logic
 */
document.addEventListener('DOMContentLoaded', async () => {
  const fields = {
    apiKey: document.getElementById('apiKey'),
    sttProvider: document.getElementById('sttProvider'),
    llmProvider: document.getElementById('llmProvider'),
    sttModel: document.getElementById('sttModel'),
    llmModel: document.getElementById('llmModel'),
    customSttUrl: document.getElementById('customSttUrl'),
    customLlmUrl: document.getElementById('customLlmUrl'),
    writingStyle: document.getElementById('writingStyle'),
    sttLanguage: document.getElementById('sttLanguage'),
    outputLanguage: document.getElementById('outputLanguage'),
    loggingEnabled: document.getElementById('loggingEnabled'),
    blueprintDagrapportage: document.getElementById('blueprintDagrapportage'),
    blueprintContactmoment: document.getElementById('blueprintContactmoment'),
    blueprintEvaluatie: document.getElementById('blueprintEvaluatie')
  };

  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');
  const resetBlueprintsBtn = document.getElementById('resetBlueprintsBtn');
  const resetStatus = document.getElementById('resetStatus');

  // Load current settings
  async function loadSettings() {
    const settings = await StorageHelper.getAll();

    fields.apiKey.value = settings.apiKey || '';
    fields.sttProvider.value = settings.sttProvider || 'openai';
    fields.llmProvider.value = settings.llmProvider || 'openai';
    fields.sttModel.value = settings.sttModel || 'whisper-1';
    fields.llmModel.value = settings.llmModel || 'gpt-4o-mini';
    fields.customSttUrl.value = settings.customSttUrl || '';
    fields.customLlmUrl.value = settings.customLlmUrl || '';
    fields.writingStyle.value = settings.writingStyle || 'professional';
    fields.sttLanguage.value = settings.sttLanguage || 'nl';
    fields.outputLanguage.value = settings.outputLanguage || 'nl';
    fields.loggingEnabled.checked = !!settings.loggingEnabled;

    // Load preset blueprints (use defaults if not customized)
    const blueprints = settings.presetBlueprints || StorageHelper.DEFAULT_BLUEPRINTS;
    fields.blueprintDagrapportage.value = blueprints.dagrapportage || '';
    fields.blueprintContactmoment.value = blueprints.contactmoment || '';
    fields.blueprintEvaluatie.value = blueprints.evaluatie || '';

    toggleCustomFields();
  }

  // Toggle custom URL fields visibility
  function toggleCustomFields() {
    const sttCustom = document.querySelector('.custom-stt-field');
    const llmCustom = document.querySelector('.custom-llm-field');

    sttCustom.style.display = fields.sttProvider.value === 'custom' ? '' : 'none';
    llmCustom.style.display = fields.llmProvider.value === 'custom' ? '' : 'none';
  }

  fields.sttProvider.addEventListener('change', toggleCustomFields);
  fields.llmProvider.addEventListener('change', toggleCustomFields);

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const settings = {
      [StorageHelper.KEYS.API_KEY]: fields.apiKey.value.trim(),
      [StorageHelper.KEYS.STT_PROVIDER]: fields.sttProvider.value,
      [StorageHelper.KEYS.LLM_PROVIDER]: fields.llmProvider.value,
      [StorageHelper.KEYS.STT_MODEL]: fields.sttModel.value.trim() || 'whisper-1',
      [StorageHelper.KEYS.LLM_MODEL]: fields.llmModel.value.trim() || 'gpt-4o-mini',
      [StorageHelper.KEYS.CUSTOM_STT_URL]: fields.customSttUrl.value.trim(),
      [StorageHelper.KEYS.CUSTOM_LLM_URL]: fields.customLlmUrl.value.trim(),
      [StorageHelper.KEYS.WRITING_STYLE]: fields.writingStyle.value,
      [StorageHelper.KEYS.STT_LANGUAGE]: fields.sttLanguage.value,
      [StorageHelper.KEYS.OUTPUT_LANGUAGE]: fields.outputLanguage.value,
      [StorageHelper.KEYS.LOGGING_ENABLED]: fields.loggingEnabled.checked,
      [StorageHelper.KEYS.PRESET_BLUEPRINTS]: {
        dagrapportage: fields.blueprintDagrapportage.value.trim(),
        contactmoment: fields.blueprintContactmoment.value.trim(),
        evaluatie: fields.blueprintEvaluatie.value.trim()
      }
    };

    await StorageHelper.set(settings);

    saveStatus.textContent = 'Opgeslagen!';
    setTimeout(() => {
      saveStatus.textContent = '';
    }, 2000);
  });

  // Reset blueprints to defaults
  resetBlueprintsBtn.addEventListener('click', async () => {
    const defaults = StorageHelper.DEFAULT_BLUEPRINTS;
    fields.blueprintDagrapportage.value = defaults.dagrapportage;
    fields.blueprintContactmoment.value = defaults.contactmoment;
    fields.blueprintEvaluatie.value = defaults.evaluatie;

    await StorageHelper.set({ [StorageHelper.KEYS.PRESET_BLUEPRINTS]: null });

    resetStatus.textContent = 'Standaardinstellingen hersteld!';
    setTimeout(() => { resetStatus.textContent = ''; }, 2000);
  });

  // Init
  await loadSettings();
});
