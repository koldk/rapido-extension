# Rapido - Browser Extensie

Chrome/Edge browser extensie (Manifest V3) voor AI-gestuurde zorgrapportages.

## Functionaliteit

- **Spraak-naar-tekst**: Neem audio op via de microfoon, automatisch getranscribeerd via OpenAI Whisper
- **Tekst genereren**: Kies een preset (Dagrapportage/Contactmoment/Evaluatie) en genereer professionele rapportages
- **Overal plakken**: Plak gegenereerde tekst in elk webformulier (compatibel met React/Angular/Vue)
- **Floating UI**: Draggable FAB-knop met panel, werkt op alle websites

## Installatie

1. Open Chrome/Edge
2. Ga naar `chrome://extensions/`
3. Schakel "Ontwikkelaarsmodus" in (rechtsboven)
4. Klik "Uitgepakte extensie laden"
5. Selecteer de `src/` map van dit project
6. De extensie is nu actief

## Configuratie

1. Klik op het extensie-icoon of ga naar de instellingen
2. Voer je OpenAI API key in
3. Kies optioneel een ander model of provider
4. Sla op

## Gebruik

1. **FAB-knop**: Verschijnt rechtsonder op elke pagina (versleepbaar)
2. **Panel openen**: Klik op de FAB
3. **Opnemen**: Klik "Opnemen" en spreek in
4. **Transcript bewerken**: Pas de tekst aan indien nodig
5. **Preset kiezen**: Dagrapportage, Contactmoment, of Evaluatie
6. **Genereren**: Klik "Genereer rapportage"
7. **Plakken**: Klik in een veld of gebruik "Kies veld", dan "Plakken"

## Architectuur

```
src/
  manifest.json              # MV3 manifest
  background/
    service_worker.js        # Message routing, provider orchestration
    providers/
      openai_stt.js          # OpenAI Whisper STT
      openai_llm.js          # OpenAI Chat Completions
      custom_stt_stub.js     # Custom STT endpoint (stub)
      custom_llm_stub.js     # Custom LLM endpoint (stub)
  content/
    content.js               # Entry point, injects UI
    ui.js                    # Shadow DOM UI (FAB + Panel)
    ui.css                   # Styling (bron)
  options/
    options.html             # Settings page
    options.js               # Settings logic
    options.css              # Settings styling
  shared/
    storage.js               # chrome.storage.local helpers
    messaging.js             # Message action constants
    dom.js                   # Field targeting + paste helpers
  icons/
    icon16/48/128.png        # Extension icons
```

## Privacy

- Geen data wordt opgeslagen of verstuurd tenzij de gebruiker expliciet opneemt/genereert
- API keys worden lokaal opgeslagen (chrome.storage.local)
- Logging staat standaard UIT
- Keys worden nooit gelogd, ook niet met logging aan

## Provider Abstraction

De extensie ondersteunt uitwisselbare providers:

- **STT**: OpenAI Whisper (default) of Custom endpoint
- **LLM**: OpenAI Chat Completions (default) of Custom endpoint

Custom endpoints verwachten:
- STT: `POST {baseUrl}/transcribe` (multipart/form-data met `file`)
- LLM: `POST {baseUrl}/generate` (JSON met `preset`, `input`, `context`)
