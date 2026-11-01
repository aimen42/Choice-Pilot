# ChoicePilot — AI Choice Picker

A full-stack starter for a multi-model choice assistant. The web dashboard accepts a question and options, queries configured AI providers, and displays model votes and consensus. It is designed so a Chrome extension can later call the same backend API.

## Requirements

- Node.js 20 or later recommended
- npm
- Optional API keys from OpenAI, Google AI Studio (Gemini), and Anthropic (Claude)

## Run locally

1. Open this folder in VS Code.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`.
4. Add at least one provider API key to `.env` for real AI responses. Without keys, the app uses clearly labelled demo votes.
5. Start the frontend and backend:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:5173`.

The API runs at `http://localhost:8787`. Check `http://localhost:8787/api/health`.

## Configure providers

Set any of these in `.env`:

- `OPENAI_API_KEY` and optionally `OPENAI_MODEL`
- `GEMINI_API_KEY` and optionally `GEMINI_MODEL`
- `ANTHROPIC_API_KEY` and optionally `ANTHROPIC_MODEL`

Use model names currently available to your account. Provider pricing, model availability, and rate limits can change. The app only calls providers for which a key is configured.

**Security:** Never commit `.env`, put keys in `src/`, or ship provider keys inside a browser extension. Keep keys on a protected backend. For production, add authentication, per-user rate limits, request quotas, logging without sensitive question contents, and stricter CORS settings.

## API

`POST /api/choose`

Request:

```json
{
  "question": "Which data structure follows LIFO?",
  "options": [
    { "id": "A", "text": "Queue" },
    { "id": "B", "text": "Tree" },
    { "id": "C", "text": "Stack" },
    { "id": "D", "text": "Graph" }
  ]
}
```

The response contains `winner`, `votes`, `counts`, `voteShare`, `tied`, `needsReview`, and `demo`.

`GET /api/health` reports whether any live providers are configured.

## Build for deployment

```bash
npm run build
```

The static frontend is built to `dist/`. Deploy the frontend and API separately or configure your hosting platform to serve the static build and proxy `/api` to the Node server. Set `CLIENT_ORIGIN` to the deployed frontend origin.

## Extension roadmap

This repo currently contains the website and backend only. The intended next step is a separate `extension/` folder using Chrome Manifest V3. It should call `/api/choose`, request only necessary host permissions, and use a side-panel/manual-input fallback when page access or interaction is unavailable. Do not attempt to bypass CAPTCHA, browser policy, or a website's explicit automation restrictions.

## Known limitations

- Demo mode is not an AI answer and should never be represented as one.
- A majority vote is not a calibrated probability of correctness.
- Some providers can fail or return invalid JSON; those responses are marked as errors.
- This is a starter, not a production-ready service. Add authentication, quotas, validation, monitoring, and provider-specific retries before public launch.
- Personal-preference questions should be answered using user-provided information rather than fabricated facts.

# ChoicePilot – AI-Powered Consensus Platform

**ChoicePilot** is a multi-model AI decision-making platform that helps users find reliable answers to multiple-choice questions by consulting multiple AI models simultaneously.

Instead of relying on a single AI model, ChoicePilot collects responses from **Groq, Mistral AI, and Google Gemini**, compares their answers, and identifies the option with the strongest agreement.

## ✨ Features

- **Multi-model AI comparison:** Get answers from three different AI providers.
- **Parallel processing:** Query AI models simultaneously.
- **Consensus detection:** Compare model responses and identify the most popular answer.
- **Transparent results:** View individual model responses.
- **Review-needed state:** Highlights situations where models disagree or responses are unavailable.
- **Responsive interface:** Clean dashboard designed for desktop and mobile screens.
- **Secure API handling:** API keys are stored on the backend using environment variables.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, JavaScript, JSX |
| Build Tool | Vite |
| Styling | CSS3 |
| Icons | Lucide React |
| Backend | Node.js, Express.js |
| AI Providers | Groq, Mistral AI, Google Gemini |
| API Configuration | REST APIs, dotenv |
| Development Tools | npm, concurrently |

## ⚙️ How It Works

1. The user enters a multiple-choice question and its options.
2. ChoicePilot sends the question to Groq, Mistral, and Gemini.
3. The backend collects the responses from the AI models.
4. It extracts and validates the selected options.
5. The system compares the votes and calculates the consensus.
6. The dashboard displays individual responses and the final result.

## 📁 Project Structure

```text
ChoicePilot/
│
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
│
├── server/
│   └── index.js
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── vite.config.js
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
```

### 2. Navigate to the project directory

```bash
cd ChoicePilot
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the root directory and add your API keys:

```env
GROQ_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b

MISTRAL_KEY=your_mistral_api_key
MISTRAL_MODEL=mistral-small-latest

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=your_gemini_model
```

Get your API keys from:

- [Groq Console](https://console.groq.com/)
- [Mistral AI](https://console.mistral.ai/)
- [Google AI Studio](https://aistudio.google.com/)

**Important:** Never upload your `.env` file or expose your API keys publicly.

### 5. Start the application

```bash
npm run dev
```

The frontend and backend will start using the development script.

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8787`

## 🔮 Future Enhancements

- Chrome extension integration.
- Automatic detection of multiple-choice questions on supported webpages.
- Browser side-panel integration.
- More AI model integrations.
- Improved consensus scoring and confidence analysis.
- Question history and saved results.

## 🎯 Project Goal

The goal of ChoicePilot is to make AI-assisted decision-making more reliable by combining the perspectives of multiple AI models rather than depending on a single response.

---

**Built with React, Node.js, and multiple AI models.**
