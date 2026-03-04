/**
 * OpenAI LLM Provider - 2-Pass Generation System
 * Pass 1: Extract facts-only JSON from transcript
 * Pass 2: Write professional report from facts
 * Self-check: Retry on headings/lists or hallucinated content
 */
const OpenAILLM = {
  name: 'openai',

  // ============================================================
  // PRESET LABELS (used in UI dropdown)
  // ============================================================
  PRESETS: {
    dagrapportage: { label: 'Dagrapportage' },
    contactmoment: { label: 'Contactmoment' },
    evaluatie: { label: 'Evaluatie' }
  },

  // ============================================================
  // WRITING STYLES
  // ============================================================
  WRITING_STYLES: {
    professional: 'Professioneel & volledig',
    literal: 'Letterlijk & compact'
  },

  // ============================================================
  // OUTPUT LANGUAGE MAP
  // ============================================================
  LANGUAGE_NAMES: {
    nl: 'Nederlands',
    en: 'Engels',
    tr: 'Turks',
    ar: 'Arabisch',
    pap: 'Papiaments'
  },

  // ============================================================
  // PASS 1 PROMPTS — Fact Extraction
  // ============================================================
  SYSTEM_PASS1_NL: `Je bent een feitenextractor voor zorgrapportages.

TAAK: Analyseer het transcript van een zorgverlener en extraheer UITSLUITEND letterlijk genoemde feiten.

STRIKTE REGELS:
- Extraheer ALLEEN wat er letterlijk staat of direct uit de tekst volgt.
- Voeg NIETS toe: geen diagnoses, geen oorzaken, geen tijden, geen namen die niet genoemd zijn.
- Als iets onduidelijk of tegenstrijdig is, vermeld dat bij "uncertainties".
- Interpreteer NIET. Vul NIET in. Raad NIET.

OUTPUT: Antwoord UITSLUITEND met geldig JSON in dit formaat:
{
  "facts": ["feit 1", "feit 2", ...],
  "uncertainties": ["onduidelijkheid 1", ...]
}

Als er geen feiten zijn: {"facts": [], "uncertainties": ["transcript bevat geen concrete informatie"]}`,

  USER_PASS1_NL: `Transcript van zorgverlener (kan rommelig/onvolledig zijn):
"""
{INPUT}
"""

Type rapportage: {PRESET}

Extraheer alle letterlijk genoemde feiten. Alleen JSON output.`,

  // ============================================================
  // PASS 2 PROMPTS — Professional Report Writing
  // ============================================================
  SYSTEM_PASS2_NL: `Je bent een professionele rapportageschrijver voor de zorg (ECD).

TAAK: Schrijf een professionele {PRESET} op basis van de aangeleverde feiten.

DOELGROEP CONTEXT: De zorgverlener kan laaggeletterd zijn of dyslexie hebben. Het transcript kan kort, rommelig of onvolledig zijn. Jij maakt er een nette rapportage van.

STRIKTE REGELS — OVERTREDING IS VERBODEN:
1. Gebruik UITSLUITEND de feiten uit de facts-lijst. Voeg GEEN nieuwe informatie toe.
2. Je mag WEL:
   - Zinnen grammaticaal corrigeren
   - Spreektaal omzetten naar professionele schrijftaal
   - Fragmenten logisch ordenen (zonder nieuwe inhoud)
   - "hij/zij" verduidelijken naar "de cliënt" als dat duidelijk is uit context
   - Verbindingswoorden toevoegen (vervolgens, daarnaast, etc.)
3. Je mag NIET:
   - Diagnoses toevoegen
   - Oorzaken invullen
   - Frequenties verzinnen
   - Namen, datums of tijden verzinnen
   - "waarschijnlijk", "vast", "zal wel" gebruiken tenzij letterlijk gezegd
   - Informatie uit de uncertainties als feit presenteren
4. Bij ontbrekende essentiële informatie, gebruik spaarzaam placeholders:
   [datum onbekend], [naam onbekend], [duur onbekend], [reden onbekend], [vervolgstap niet genoemd]
5. Bij tegenstrijdige informatie: laat beide staan ("Er werd zowel X als Y genoemd.")

OUTPUTVORM — STRIKT:
- Geen kopjes (geen #, geen vette titels)
- Geen opsommingstekens of lijstjes
- Eén doorlopende rapportage in maximaal 2-3 alinea's
- Professioneel, feitelijk, in de derde persoon
- Schrijf in het {LANGUAGE}`,

  USER_PASS2_NL: `Geëxtraheerde feiten (ENIGE BRON VAN WAARHEID):
{FACTS_JSON}

Origineel transcript (ter referentie voor toon/woordkeuze, NIET als bron voor nieuwe feiten):
"""
{INPUT}
"""

Schrijf nu een professionele {PRESET}. Alleen doorlopende tekst, geen kopjes, geen lijstjes.`,

  // ============================================================
  // PASS 2 PROMPTS — Literal/Compact style
  // ============================================================
  SYSTEM_PASS2_LITERAL_NL: `Je bent een rapportageschrijver voor de zorg (ECD).

TAAK: Schrijf een compacte rapportage die zo dicht mogelijk bij het origineel blijft.

REGELS:
1. Gebruik UITSLUITEND de feiten uit de facts-lijst.
2. Corrigeer alleen grove grammaticafouten.
3. Houd de tekst kort en dicht bij de originele bewoordingen.
4. Voeg GEEN nieuwe informatie, interpretaties of verbindingswoorden toe.
5. Geen kopjes, geen lijstjes. Korte doorlopende tekst.
6. Schrijf in het {LANGUAGE}, derde persoon.`,

  // ============================================================
  // SELF-CHECK PROMPTS
  // ============================================================
  SELFCHECK_HALLUCINATION_MARKERS: [
    'diagnose', 'gediagnosticeerd', 'reden was', 'de oorzaak',
    'volgens protocol', 'conform richtlijn', 'afgesproken op',
    'gepland op', 'verwacht wordt', 'zal waarschijnlijk',
    'hoogstwaarschijnlijk', 'vermoedelijk'
  ],

  // ============================================================
  // MAIN GENERATE METHOD
  // ============================================================
  /**
   * Generate text using 2-pass approach
   * @param {Object} params
   * @param {string} params.preset - 'dagrapportage' | 'contactmoment' | 'evaluatie'
   * @param {string} params.input - User transcript/text
   * @param {Object} params.context - { url, title }
   * @param {string} params.apiKey - OpenAI API key
   * @param {string} params.model - e.g. 'gpt-4o-mini'
   * @param {string} params.writingStyle - 'professional' | 'literal'
   * @returns {Promise<{output: string}>}
   */
  async generate({ preset, input, context, apiKey, model, writingStyle, outputLanguage, presetBlueprint }) {
    if (!apiKey) {
      throw new Error('Geen API key ingesteld. Ga naar extensie-instellingen.');
    }

    const presetConfig = this.PRESETS[preset];
    if (!presetConfig) {
      throw new Error(`Onbekende preset: ${preset}`);
    }

    const style = writingStyle || 'professional';
    const presetLabel = presetConfig.label;
    const langName = this.LANGUAGE_NAMES[outputLanguage] || 'Nederlands';

    // ---- PASS 1: Fact Extraction ----
    const factsJSON = await this._pass1Extract(input, presetLabel, apiKey, model);

    // ---- PASS 2: Report Writing ----
    let output = await this._pass2Write(input, factsJSON, presetLabel, style, langName, presetBlueprint, apiKey, model);

    // ---- SELF-CHECK ----
    output = await this._selfCheck(output, input, factsJSON, presetLabel, style, langName, presetBlueprint, apiKey, model);

    return { output };
  },

  // ============================================================
  // PASS 1: EXTRACT FACTS
  // ============================================================
  async _pass1Extract(input, presetLabel, apiKey, model) {
    const systemPrompt = this.SYSTEM_PASS1_NL;
    const userPrompt = this.USER_PASS1_NL
      .replace('{INPUT}', input)
      .replace('{PRESET}', presetLabel);

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      const raw = await this._callOpenAI(systemPrompt, userPrompt, apiKey, model, 0.1);

      try {
        // Strip markdown code fences if present
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);

        // Validate structure
        if (!Array.isArray(parsed.facts)) {
          parsed.facts = [];
        }
        if (!Array.isArray(parsed.uncertainties)) {
          parsed.uncertainties = [];
        }

        return parsed;
      } catch (e) {
        if (attempts >= maxAttempts) {
          // Fallback: treat entire input as single fact
          return {
            facts: [input.trim()],
            uncertainties: ['JSON parsing mislukt, origineel transcript als enkele feit gebruikt']
          };
        }
        // Retry
      }
    }
  },

  // ============================================================
  // PASS 2: WRITE REPORT
  // ============================================================
  async _pass2Write(input, factsJSON, presetLabel, style, langName, presetBlueprint, apiKey, model) {
    const isLiteral = style === 'literal';

    let systemPrompt = (isLiteral
      ? this.SYSTEM_PASS2_LITERAL_NL
      : this.SYSTEM_PASS2_NL.replace('{PRESET}', presetLabel)
    ).replace('{LANGUAGE}', langName);

    if (presetBlueprint) {
      systemPrompt += `\n\nSPECIFIEKE INSTRUCTIES VOOR DIT TYPE RAPPORTAGE:\n${presetBlueprint}`;
    }

    const userPrompt = this.USER_PASS2_NL
      .replace('{FACTS_JSON}', JSON.stringify(factsJSON, null, 2))
      .replace('{INPUT}', input)
      .replace('{PRESET}', presetLabel);

    return await this._callOpenAI(systemPrompt, userPrompt, apiKey, model, 0.3);
  },

  // ============================================================
  // SELF-CHECK + RETRY
  // ============================================================
  async _selfCheck(output, input, factsJSON, presetLabel, style, langName, presetBlueprint, apiKey, model) {
    let needsRetry = false;
    let retryInstructions = [];

    // Check 1: Contains headings or bullet lists?
    const hasHeadings = /^#{1,6}\s/m.test(output) || /^\*\*[^*]+\*\*\s*$/m.test(output);
    const hasBullets = /^[\s]*[-*•]\s/m.test(output) || /^\d+\.\s/m.test(output);

    if (hasHeadings || hasBullets) {
      needsRetry = true;
      retryInstructions.push('STRIKT: Schrijf ALLEEN doorlopende tekst. Gebruik GEEN kopjes (geen #, geen vette titels), GEEN opsommingstekens, GEEN genummerde lijsten. Alleen vloeiende alinea\'s.');
    }

    // Check 2: Hallucination markers not in facts?
    const factsText = factsJSON.facts.join(' ').toLowerCase();
    const outputLower = output.toLowerCase();

    const hallucinated = this.SELFCHECK_HALLUCINATION_MARKERS.filter(marker => {
      return outputLower.includes(marker) && !factsText.includes(marker);
    });

    if (hallucinated.length > 0) {
      needsRetry = true;
      retryInstructions.push(`STRIKT: De volgende termen komen NIET voor in de feiten en moeten verwijderd worden: ${hallucinated.join(', ')}. Gebruik UITSLUITEND facts[]; geen toevoegingen.`);
    }

    // Retry once if needed
    if (needsRetry) {
      const isLiteral = style === 'literal';
      let systemPrompt = ((isLiteral
        ? this.SYSTEM_PASS2_LITERAL_NL
        : this.SYSTEM_PASS2_NL.replace('{PRESET}', presetLabel)
      ).replace('{LANGUAGE}', langName));

      if (presetBlueprint) {
        systemPrompt += `\n\nSPECIFIEKE INSTRUCTIES VOOR DIT TYPE RAPPORTAGE:\n${presetBlueprint}`;
      }

      systemPrompt += '\n\nEXTRA INSTRUCTIES:\n' + retryInstructions.join('\n');

      const userPrompt = this.USER_PASS2_NL
        .replace('{FACTS_JSON}', JSON.stringify(factsJSON, null, 2))
        .replace('{INPUT}', input)
        .replace('{PRESET}', presetLabel);

      output = await this._callOpenAI(systemPrompt, userPrompt, apiKey, model, 0.2);
    }

    return output;
  },

  // ============================================================
  // OPENAI API CALL HELPER
  // ============================================================
  async _callOpenAI(systemPrompt, userPrompt, apiKey, model, temperature) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: temperature || 0.3,
          max_tokens: 1500
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `LLM fout: ${response.status}`);
      }

      const data = await response.json();
      const output = data.choices?.[0]?.message?.content || '';

      if (!output) {
        throw new Error('Geen output ontvangen van LLM.');
      }

      return output;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Generatie timeout (30s). Probeer opnieuw.');
      }
      throw err;
    }
  }
};
