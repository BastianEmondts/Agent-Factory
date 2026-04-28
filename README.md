# Agent Factory 🏭

Ein webbasierter Konfigurations-Assistent, der Sie Schritt für Schritt durch die Erstellung einer KI-Agenten-Implementierung führt – powered by **Azure OpenAI**.

## 🚀 Live-Demo

➡️ **[Zur Anwendung auf GitHub Pages](https://bastianemondts.github.io/Agent-Factory/)**

## ✨ Funktionen

- **5-Schritt-Wizard** für die strukturierte Agenten-Konfiguration
- **Azure OpenAI Validierung**: Vollständigkeitsbewertung (Score 1–10), Impact-Analyse, Stärken und Verbesserungsvorschläge
- **Zielplattform-Auswahl**:
  - 🤖 **Microsoft Copilot Studio** → generiert YAML-Konfiguration
  - ⚡ **Azure AI Foundry** → generiert Python SDK-Code
- **Code herunterladen oder kopieren** mit einem Klick
- **Deployment-Anleitung** automatisch generiert
- Konfiguration per Azure OpenAI Endpoint, API Key und Deployment Name
- Rein statisch – **GitHub Pages kompatibel**, kein Server nötig

## 📋 Wizard-Schritte

| Schritt | Inhalt |
|---------|--------|
| 1 – Use-Case | Agent-Name, Problemstellung, Zielgruppe, Hauptziele |
| 2 – Plattform | Microsoft Copilot Studio oder Azure AI Foundry wählen |
| 3 – Details | Kommunikationsstil, Sprachen, Fähigkeiten, Integrationen |
| 4 – Validierung | KI-gestützte Analyse & Feedback über Azure OpenAI |
| 5 – Ergebnis | Generierten Code anzeigen, kopieren oder herunterladen |

## ⚙️ Konfiguration

1. Klicken Sie auf **⚙️ Konfiguration** oben rechts
2. Tragen Sie ein:
   - **API Endpoint**: `https://your-resource.openai.azure.com/`
   - **API Key**: Ihr Azure OpenAI API-Schlüssel
   - **Deployment Name**: z. B. `gpt-4o`
   - **API Version**: z. B. `2024-02-15-preview`
3. Klicken Sie **Speichern & Schließen**

Die Einstellungen werden im Browser (localStorage) gespeichert.

## 🌐 GitHub Pages Deployment

1. Repository-Einstellungen → **Pages**
2. Source: **Deploy from a branch** → Branch: `main` → Ordner: `/ (root)`
3. Speichern → Die App ist unter `https://<username>.github.io/<repo>/` erreichbar

## 🛠️ Lokale Entwicklung

```bash
# Einfacher HTTP-Server (Python)
python3 -m http.server 8080

# Dann öffnen:
# http://localhost:8080
```

## 📄 Lizenz

MIT
