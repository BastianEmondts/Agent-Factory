/* ════════════════════════════════════════════════════════════════
   Agent Factory – Application Logic
   ════════════════════════════════════════════════════════════════ */

'use strict';

// ── State ─────────────────────────────────────────────────────────
const state = {
  currentStep: 1,
  config: {
    apiEndpoint:    '',
    apiKey:         '',
    deploymentName: '',
    apiVersion:     '2024-02-15-preview',
  },
  form: {
    agentName:           '',
    useCaseDescription:  '',
    targetUsers:         '',
    businessContext:     '',
    mainGoals:           '',
    platform:            null,   // 'copilot' | 'foundry'
    tone:                '',
    languages:           ['de'],
    capabilities:        [],
    integrations:        '',
    constraints:         '',
    successMetrics:      '',
  },
  validation: {
    score:      0,
    canProceed: false,
    json:       null,
  },
  generatedCode: '',
};

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  bindConfigPanel();
  bindCharCounter();
});

// ── Config Persistence ────────────────────────────────────────────
function loadConfig () {
  try {
    const raw = localStorage.getItem('agentFactoryConfig');
    if (raw) {
      Object.assign(state.config, JSON.parse(raw));
      document.getElementById('apiEndpoint').value    = state.config.apiEndpoint    || '';
      document.getElementById('apiKey').value         = state.config.apiKey         || '';
      document.getElementById('deploymentName').value = state.config.deploymentName || '';
      document.getElementById('apiVersion').value     = state.config.apiVersion     || '2024-02-15-preview';
    }
  } catch (_) { /* ignore */ }
}

function bindConfigPanel () {
  document.getElementById('configToggle').addEventListener('click', () => {
    document.getElementById('configPanel').classList.toggle('hidden');
  });

  document.getElementById('saveConfig').addEventListener('click', () => {
    persistConfig();
    document.getElementById('configPanel').classList.add('hidden');
    toast('Konfiguration gespeichert ✓');
  });

  document.getElementById('testConnection').addEventListener('click', testConnection);
}

function persistConfig () {
  state.config.apiEndpoint    = document.getElementById('apiEndpoint').value.trim();
  state.config.apiKey         = document.getElementById('apiKey').value.trim();
  state.config.deploymentName = document.getElementById('deploymentName').value.trim();
  state.config.apiVersion     = document.getElementById('apiVersion').value.trim() || '2024-02-15-preview';
  try { localStorage.setItem('agentFactoryConfig', JSON.stringify(state.config)); } catch (_) { /* ignore */ }
}

async function testConnection () {
  persistConfig();
  const el = document.getElementById('connectionStatus');
  el.textContent = 'Verbinde …';
  el.style.color = '#94a3b8';

  try {
    await callAzureOpenAI([
      { role: 'user', content: 'Reply with the single word: OK' },
    ]);
    el.textContent = '✅ Verbindung erfolgreich!';
    el.style.color = '#34d399';
  } catch (err) {
    el.textContent = `❌ Fehler: ${err.message}`;
    el.style.color = '#f87171';
  }
}

// ── Char counter for textarea ─────────────────────────────────────
function bindCharCounter () {
  const ta    = document.getElementById('useCaseDescription');
  const count = document.getElementById('charCount');
  const hint  = document.getElementById('charHint');
  ta.addEventListener('input', () => {
    const len = ta.value.length;
    count.textContent = len;
    if (len === 0) {
      hint.textContent = '';
      hint.className   = 'char-hint-msg';
    } else if (len < 150) {
      hint.textContent = '– bitte mehr Details angeben (min. 150 Zeichen empfohlen)';
      hint.className   = 'char-hint-msg bad';
    } else {
      hint.textContent = '– ausreichend ✓';
      hint.className   = 'char-hint-msg ok';
    }
  });
}

// ── Wizard Navigation ─────────────────────────────────────────────
function nextStep (current) {
  if (!validateStep(current)) return;

  const next = current + 1;
  switchStep(current, next);

  // Auto-trigger code generation when entering step 5
  if (next === 5) generateCode();
}

function prevStep (current) {
  switchStep(current, current - 1);
}

function switchStep (from, to) {
  document.getElementById(`step${from}`).classList.remove('active');
  document.getElementById(`step${to}`).classList.add('active');
  state.currentStep = to;
  updateProgressBar(to);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgressBar (active) {
  const steps = document.querySelectorAll('.step');
  const lines  = document.querySelectorAll('.step-line');

  steps.forEach((el) => {
    const n = parseInt(el.dataset.step, 10);
    el.classList.toggle('active', n === active);
    el.classList.toggle('done',   n < active);
  });
  lines.forEach((el, i) => {
    el.classList.toggle('done', i + 1 < active);
  });
}

// ── Per-step validation ───────────────────────────────────────────
function validateStep (step) {
  switch (step) {
    case 1: return validateStep1();
    case 2: return validateStep2();
    case 3: return validateStep3();
    case 4: return validateStep4();
    default: return true;
  }
}

function validateStep1 () {
  const name = document.getElementById('agentName').value.trim();
  const desc = document.getElementById('useCaseDescription').value.trim();
  const users = document.getElementById('targetUsers').value.trim();

  let ok = true;

  if (!name) {
    highlight('agentName', true);
    toast('Bitte geben Sie einen Namen für den Agenten ein.');
    ok = false;
  } else { highlight('agentName', false); }

  if (!desc || desc.length < 30) {
    highlight('useCaseDescription', true);
    if (ok) toast('Bitte beschreiben Sie den Use-Case (mind. 30 Zeichen).');
    ok = false;
  } else { highlight('useCaseDescription', false); }

  if (!users) {
    highlight('targetUsers', true);
    if (ok) toast('Bitte geben Sie die Zielgruppe an.');
    ok = false;
  } else { highlight('targetUsers', false); }

  if (ok) {
    state.form.agentName          = name;
    state.form.useCaseDescription = desc;
    state.form.targetUsers        = users;
    state.form.businessContext    = document.getElementById('businessContext').value.trim();
    state.form.mainGoals          = document.getElementById('mainGoals').value.trim();
  }
  return ok;
}

function validateStep2 () {
  if (!state.form.platform) {
    toast('Bitte wählen Sie eine Zielplattform.');
    return false;
  }
  return true;
}

function validateStep3 () {
  const tone = document.querySelector('input[name="tone"]:checked');
  if (!tone) {
    toast('Bitte wählen Sie einen Kommunikationsstil.');
    return false;
  }
  state.form.tone          = tone.value;
  state.form.languages     = [...document.querySelectorAll('input[name="language"]:checked')]
                                  .map(cb => cb.value);
  state.form.capabilities  = [...document.querySelectorAll('input[name="capability"]:checked')]
                                  .map(cb => cb.value);
  state.form.integrations   = document.getElementById('integrations').value.trim();
  state.form.constraints    = document.getElementById('constraints').value.trim();
  state.form.successMetrics = document.getElementById('successMetrics').value.trim();

  // Reset validation whenever details change
  state.validation.canProceed = false;
  document.getElementById('btnGenerate').disabled = true;
  document.getElementById('valIdle').classList.remove('hidden');
  document.getElementById('valLoading').classList.add('hidden');
  document.getElementById('valResults').classList.add('hidden');

  return true;
}

function validateStep4 () {
  if (!state.validation.canProceed) {
    toast('Bitte führen Sie die Validierung durch und verbessern ggf. die Beschreibung.');
    return false;
  }
  return true;
}

// ── Platform Selection ────────────────────────────────────────────
function selectPlatform (platform) {
  state.form.platform = platform;
  document.getElementById('card-copilot').classList.toggle('selected', platform === 'copilot');
  document.getElementById('card-foundry').classList.toggle('selected', platform === 'foundry');
}

// ── Azure OpenAI Call ─────────────────────────────────────────────
async function callAzureOpenAI (messages, jsonMode = false) {
  const { apiEndpoint, apiKey, deploymentName, apiVersion } = state.config;
  if (!apiEndpoint || !apiKey || !deploymentName) {
    throw new Error(
      'Azure OpenAI ist nicht konfiguriert. Bitte öffnen Sie die Konfiguration (⚙️) ' +
      'und geben Sie Endpoint, API Key und Deployment Name ein.'
    );
  }

  const url = `${apiEndpoint.replace(/\/$/, '')}/openai/deployments/${deploymentName}` +
              `/chat/completions?api-version=${apiVersion}`;

  const body = {
    messages,
    temperature: 0.5,
    max_tokens: 4000,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      if (err?.error?.message) msg += ` – ${err.error.message}`;
    } catch (_) { /* ignore */ }
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ── Validation ────────────────────────────────────────────────────
async function startValidation () {
  document.getElementById('valIdle').classList.add('hidden');
  document.getElementById('valResults').classList.add('hidden');
  document.getElementById('valLoading').classList.remove('hidden');

  const f = state.form;
  const capLabels = {
    faq: 'FAQ Beantwortung', search: 'Dokumentensuche', ticketing: 'Ticket-Erstellung',
    calendar: 'Kalender/Terminverwaltung', data: 'Datenbankabfragen',
    email: 'E-Mail Verarbeitung', escalation: 'Eskalation zu Mitarbeiter',
    analytics: 'Reporting & Analytics',
  };
  const toneLabel = {
    professional: 'Professionell & Formell', friendly: 'Freundlich & Locker',
    technical: 'Technisch & Präzise', empathetic: 'Einfühlsam & Unterstützend',
  };
  const platformLabel = f.platform === 'copilot' ? 'Microsoft Copilot Studio' : 'Azure AI Foundry';

  const systemPrompt = `Du bist ein erfahrener KI-Berater und Use-Case Analyst. 
Deine Aufgabe ist es, einen beschriebenen Agenten-Use-Case zu analysieren und strukturiertes JSON-Feedback zu geben.
Antworte ausschließlich mit einem validen JSON-Objekt ohne Markdown-Codeblöcke.`;

  const userPrompt = `Analysiere folgenden Agenten-Use-Case und gib Feedback:

Agent-Name: ${f.agentName}
Problemstellung/Ziel: ${f.useCaseDescription}
Zielgruppe: ${f.targetUsers}
Geschäftlicher Kontext: ${f.businessContext || '(nicht angegeben)'}
Hauptziele: ${f.mainGoals || '(nicht angegeben)'}
Zielplattform: ${platformLabel}
Kommunikationsstil: ${toneLabel[f.tone] || f.tone}
Sprachen: ${f.languages.join(', ')}
Fähigkeiten: ${f.capabilities.map(c => capLabels[c] || c).join(', ') || '(keine ausgewählt)'}
Integrationen: ${f.integrations || '(nicht angegeben)'}
Einschränkungen: ${f.constraints || '(nicht angegeben)'}
Erfolgskriterien: ${f.successMetrics || '(nicht angegeben)'}

Antworte mit folgendem JSON-Format (alle Texte auf Deutsch):
{
  "completenessScore": <Zahl 1-10>,
  "scoreDescription": "<kurze Begründung für den Score>",
  "impactAnalysis": "<Analyse des geschäftlichen Mehrwerts und potenziellen Impacts>",
  "strengths": ["<Stärke 1>", "<Stärke 2>"],
  "missingInformation": ["<Fehlendes Element 1>"] oder [],
  "improvements": ["<konkreter Verbesserungsvorschlag 1>", "<Vorschlag 2>"],
  "canProceed": <true wenn Score >= 6, sonst false>,
  "proceedMessage": "<Nachricht ob sie fortfahren können oder was sie verbessern sollen>"
}`;

  try {
    const raw = await callAzureOpenAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      true
    );

    const json = JSON.parse(raw);
    state.validation.json       = json;
    state.validation.score      = json.completenessScore || 0;
    state.validation.canProceed = json.canProceed === true;

    renderValidationResults(json);
  } catch (err) {
    document.getElementById('valLoading').classList.add('hidden');
    document.getElementById('valIdle').classList.remove('hidden');
    toast(`Fehler bei der Validierung: ${err.message}`, 5000);
  }
}

function renderValidationResults (json) {
  document.getElementById('valLoading').classList.add('hidden');
  document.getElementById('valResults').classList.remove('hidden');

  // Score circle
  const sc = document.getElementById('scoreCircle');
  document.getElementById('scoreValue').textContent = json.completenessScore;
  sc.classList.remove('high', 'mid', 'low');
  if (json.completenessScore >= 7)       sc.classList.add('high');
  else if (json.completenessScore >= 5)  sc.classList.add('mid');
  else                                   sc.classList.add('low');

  document.getElementById('scoreDesc').textContent = json.scoreDescription || '';

  // Impact (plain text from JSON — use textContent to avoid XSS)
  const impactEl = document.getElementById('fbImpact');
  const impactP  = document.createElement('p');
  impactP.textContent = json.impactAnalysis || '';
  impactEl.replaceChildren(impactP);

  // Strengths
  renderList('fbStrengths', json.strengths);

  // Missing
  const missingWrap = document.getElementById('fbMissingWrap');
  if (json.missingInformation && json.missingInformation.length > 0) {
    renderList('fbMissing', json.missingInformation);
    missingWrap.classList.remove('hidden');
  } else {
    missingWrap.classList.add('hidden');
  }

  // Improvements
  renderList('fbImprovements', json.improvements);

  // Proceed message
  const msgEl = document.getElementById('proceedMsg');
  msgEl.textContent = json.proceedMessage || '';
  msgEl.className   = `proceed-msg ${json.canProceed ? 'ok' : 'bad'}`;

  // Enable/disable generate button
  document.getElementById('btnGenerate').disabled = !json.canProceed;
}

function renderList (elId, items) {
  const ul = document.getElementById(elId);
  ul.innerHTML = '';
  if (!Array.isArray(items) || items.length === 0) {
    ul.innerHTML = '<li>(keine)</li>';
    return;
  }
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
}

// ── Code Generation ───────────────────────────────────────────────
async function generateCode () {
  document.getElementById('genLoading').classList.remove('hidden');
  document.getElementById('genResults').classList.add('hidden');

  const f = state.form;
  const isFoundry = f.platform === 'foundry';

  const systemPrompt = isFoundry
    ? `Du bist ein erfahrener Python-Entwickler und Azure AI Experte.
Generiere vollständigen, produktionsfertigen Python-Code für einen Azure AI Foundry Agent.
Der Code soll alle Konfigurationen, Instructions, Tools und einen vollständigen Starter-Flow enthalten.
Nutze die azure-ai-projects Bibliothek. Kommentiere den Code ausführlich auf Deutsch.`
    : `Du bist ein erfahrener Microsoft Copilot Studio / Power Platform Entwickler.
Generiere eine vollständige YAML-Konfiguration für einen Microsoft Copilot Studio Bot.
Die Konfiguration soll Topics, Entities, globale Variablen und Einstellungen enthalten.
Kommentiere ausführlich auf Deutsch.`;

  const capLabels = {
    faq: 'FAQ Beantwortung', search: 'Dokumentensuche', ticketing: 'Ticket-Erstellung',
    calendar: 'Kalender/Terminverwaltung', data: 'Datenbankabfragen',
    email: 'E-Mail Verarbeitung', escalation: 'Eskalation zu Mitarbeiter',
    analytics: 'Reporting & Analytics',
  };
  const toneMap = {
    professional: 'professionell und formell', friendly: 'freundlich und locker',
    technical: 'technisch und präzise', empathetic: 'einfühlsam und unterstützend',
  };

  const userPrompt = `Erstelle ${isFoundry ? 'Python-Code' : 'eine YAML-Konfiguration'} für folgenden Agenten:

Agent-Name: ${f.agentName}
Problemstellung: ${f.useCaseDescription}
Zielgruppe: ${f.targetUsers}
Geschäftlicher Kontext: ${f.businessContext || '–'}
Hauptziele: ${f.mainGoals || '–'}
Kommunikationsstil: ${toneMap[f.tone] || f.tone}
Sprachen: ${f.languages.join(', ')}
Fähigkeiten: ${f.capabilities.map(c => capLabels[c] || c).join(', ') || '(allgemein)'}
Integrationen: ${f.integrations || '–'}
Einschränkungen: ${f.constraints || '–'}
Erfolgskriterien: ${f.successMetrics || '–'}

${isFoundry
  ? `Erstelle vollständigen Python-Code mit:
- Imports und Installation-Kommentar (pip install azure-ai-projects azure-identity)
- Konfigurationsvariablen (Endpoint, Connection String, Deployment Name als Umgebungsvariablen)
- Vollständige Agent-Instructions (system prompt) basierend auf dem Use-Case
- Tool-Definitionen passend zu den Fähigkeiten (FunctionTool Beispiele)
- create_agent() Funktion
- Vollständigen Thread/Run Workflow als Beispiel
- Fehlerbehandlung
- __main__ Block`
  : `Erstelle vollständige YAML-Konfiguration mit:
- Bot-Metadaten (Name, Beschreibung, Locale)
- Begrüßungs-Topic (mit sample trigger phrases)
- Mindestens 3 Use-Case-spezifische Topics mit trigger phrases und responses
- Eskalations-Topic (falls zutreffend)
- Globale Variablen
- Entities-Definitionen
- Einstellungen (Sprache, Timeout, etc.)
- Import-Kommentare mit Anleitung`}

Gib NUR den Code zurück, keine Erklärungen davor oder danach.`;

  try {
    const code = await callAzureOpenAI([
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ]);

    state.generatedCode = code.trim();

    // Clean potential markdown code fences (handles optional surrounding whitespace)
    let cleanCode = state.generatedCode;
    const fenceMatch = cleanCode.match(/```[\w]*\s*([\s\S]*?)\s*```/);
    if (fenceMatch) cleanCode = fenceMatch[1].trim();
    state.generatedCode = cleanCode;

    document.getElementById('generatedCode').textContent = cleanCode;
    document.getElementById('codeLang').textContent = isFoundry ? 'Python' : 'YAML';

    // Generate summary + instructions
    await Promise.all([
      generateSummary(),
      generateInstructions(),
    ]);

    document.getElementById('genLoading').classList.add('hidden');
    document.getElementById('genResults').classList.remove('hidden');
  } catch (err) {
    document.getElementById('genLoading').classList.add('hidden');
    document.getElementById('genResults').classList.remove('hidden');
    document.getElementById('generatedCode').textContent = `// Fehler beim Generieren:\n// ${err.message}\n\n// Bitte prüfen Sie Ihre Azure OpenAI Konfiguration.`;
    document.getElementById('codeLang').textContent = 'Error';
    document.getElementById('agentSummary').innerHTML = `<p style="color:var(--danger)">Fehler: ${escapeHtml(err.message)}</p>`;
    document.getElementById('deployInstructions').innerHTML = '';
  }
}

async function generateSummary () {
  const f = state.form;
  const platform = f.platform === 'copilot' ? 'Microsoft Copilot Studio' : 'Azure AI Foundry';
  const prompt = `Schreibe eine kompakte HTML-Zusammenfassung (nur <h4>, <p>, <ul>, <li> Tags) für folgenden Agent:
Agent: ${f.agentName}
Plattform: ${platform}
Use-Case: ${f.useCaseDescription}
Zielgruppe: ${f.targetUsers}
Fähigkeiten: ${f.capabilities.join(', ')}

Struktur: Kurze Beschreibung, Hauptfähigkeiten (Liste), Nutzen für die Zielgruppe, erwartete Ergebnisse.
Nur HTML-Inhalt, kein <html>/<body>.`;

  try {
    const html = await callAzureOpenAI([{ role: 'user', content: prompt }]);
    document.getElementById('agentSummary').innerHTML = sanitizeHtml(html);
  } catch (_) {
    document.getElementById('agentSummary').innerHTML = '<p>Zusammenfassung konnte nicht generiert werden.</p>';
  }
}

async function generateInstructions () {
  const isFoundry = state.form.platform === 'foundry';
  const prompt = `Schreibe eine Schritt-für-Schritt Deployment-Anleitung (nur <h4>, <p>, <ul>, <ol>, <li>, <code> Tags) für:
Plattform: ${isFoundry ? 'Azure AI Foundry' : 'Microsoft Copilot Studio'}
Agent: ${state.form.agentName}

Beschreibe konkrete Schritte: Voraussetzungen, Setup, Deployment, Testen, Monitoring.
Nur HTML-Inhalt, kein <html>/<body>.`;

  try {
    const html = await callAzureOpenAI([{ role: 'user', content: prompt }]);
    document.getElementById('deployInstructions').innerHTML = sanitizeHtml(html);
  } catch (_) {
    document.getElementById('deployInstructions').innerHTML = '<p>Anleitung konnte nicht generiert werden.</p>';
  }
}

// ── Tabs ──────────────────────────────────────────────────────────
function showTab (name, btn) {
  ['code', 'summary', 'instructions'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('hidden', t !== name);
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── Copy / Download ───────────────────────────────────────────────
function copyCode () {
  if (!state.generatedCode) return;
  navigator.clipboard.writeText(state.generatedCode)
    .then(() => toast('Code in die Zwischenablage kopiert ✓'))
    .catch(() => toast('Kopieren fehlgeschlagen – bitte manuell kopieren.'));
}

function downloadCode () {
  if (!state.generatedCode) return;
  const ext  = state.form.platform === 'copilot' ? 'yaml' : 'py';
  const name = (state.form.agentName || 'agent').replace(/\s+/g, '-').toLowerCase();
  const blob = new Blob([state.generatedCode], { type: 'text/plain' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `${name}-agent.${ext}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Restart ───────────────────────────────────────────────────────
function startOver () {
  // Reset form fields
  document.getElementById('agentName').value           = '';
  document.getElementById('useCaseDescription').value  = '';
  document.getElementById('targetUsers').value         = '';
  document.getElementById('businessContext').value     = '';
  document.getElementById('mainGoals').value           = '';
  document.getElementById('integrations').value        = '';
  document.getElementById('constraints').value         = '';
  document.getElementById('successMetrics').value      = '';
  document.getElementById('charCount').textContent     = '0';
  document.getElementById('charHint').textContent      = '';
  document.getElementById('charHint').className        = 'char-hint-msg';
  document.querySelectorAll('input[type="radio"]').forEach(r => { r.checked = false; });
  document.querySelectorAll('input[name="capability"]').forEach(cb => { cb.checked = false; });
  document.querySelectorAll('input[name="language"]').forEach(cb => {
    cb.checked = cb.value === 'de';
  });

  // Reset platform
  state.form.platform = null;
  document.getElementById('card-copilot').classList.remove('selected');
  document.getElementById('card-foundry').classList.remove('selected');

  // Reset validation UI
  document.getElementById('valIdle').classList.remove('hidden');
  document.getElementById('valLoading').classList.add('hidden');
  document.getElementById('valResults').classList.add('hidden');
  document.getElementById('btnGenerate').disabled = true;

  // Reset generation UI
  document.getElementById('genLoading').classList.remove('hidden');
  document.getElementById('genResults').classList.add('hidden');

  // Reset state
  Object.assign(state.form,       { agentName:'', useCaseDescription:'', targetUsers:'',
    businessContext:'', mainGoals:'', platform:null, tone:'', languages:['de'],
    capabilities:[], integrations:'', constraints:'', successMetrics:'' });
  Object.assign(state.validation, { score:0, canProceed:false, json:null });
  state.generatedCode = '';

  switchStep(state.currentStep, 1);
}

// ── Helpers ───────────────────────────────────────────────────────
function highlight (id, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('error', isError);
}

function escapeHtml (str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Allow only a safe subset of HTML tags from AI responses.
 *  Processes elements in reverse (deepest-first) so that when a disallowed
 *  ancestor is unwrapped its children are already safe and fully processed.
 */
function sanitizeHtml (html) {
  const allowed = new Set(['h4', 'p', 'ul', 'ol', 'li', 'code', 'strong', 'em', 'br']);
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  // Reverse order ensures children are handled before parents
  const elements = [...tmp.querySelectorAll('*')].reverse();
  elements.forEach(el => {
    if (!allowed.has(el.tagName.toLowerCase())) {
      // Move children out, then remove the disallowed wrapper
      const frag = document.createDocumentFragment();
      while (el.firstChild) frag.appendChild(el.firstChild);
      el.replaceWith(frag);
    } else {
      // Strip every attribute from allowed elements (no event handlers, no href, etc.)
      [...el.attributes].forEach(a => el.removeAttribute(a.name));
    }
  });
  return tmp.innerHTML;
}

let toastTimer;
function toast (msg, duration = 3000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}
