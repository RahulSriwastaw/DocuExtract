# DocuExtract 📄

AI-Powered Document Data Extraction tool with multi-provider support.

## ✨ Features

- **Multi-AI Provider Support**: Choose between OpenRouter, Google Gemini, and Groq
- **Easy Provider Switching**: Select AI provider and model from the frontend UI
- **Document Upload**: Upload text files or paste document content directly
- **Smart Extraction**: AI-powered data extraction with customizable prompts
- **Quick Templates**: Pre-built extraction prompt templates for common use cases
- **Export Results**: Copy or download extracted data as JSON

## 🤖 Supported AI Providers

| Provider | Description | API Key URL |
|----------|-------------|-------------|
| 🌐 **OpenRouter** | Access multiple AI models (GPT-4, Claude, Llama, etc.) through one API | [openrouter.ai/keys](https://openrouter.ai/keys) |
| ✨ **Google Gemini** | Google AI Gemini models directly via Google AI API | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| ⚡ **Groq** | Ultra-fast AI inference with Groq LPU | [console.groq.com](https://console.groq.com/keys) |

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/RahulSriwastaw/DocuExtract.git
cd DocuExtract
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure AI Providers

Copy the example environment file and add your API keys:

```bash
copy .env.example .env
```

Edit `.env` and add your API keys:

```env
# At least one provider must be configured

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_DEFAULT_MODEL=openai/gpt-3.5-turbo

# Google Gemini
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key_here
GOOGLE_GEMINI_DEFAULT_MODEL=gemini-1.5-flash

# Groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_DEFAULT_MODEL=llama-3.1-8b-instant

# Default provider (openrouter, gemini, groq)
DEFAULT_AI_PROVIDER=openrouter
```

### 4. Run the application

**Run both frontend and backend together:**

```bash
npm run dev:all
```

**Or run them separately:**

```bash
# Terminal 1 - Frontend (Vite dev server)
npm run dev

# Terminal 2 - Backend (Express API server)
npm run dev:server
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/ai/providers` | Get all available AI providers and models |
| POST | `/api/ai/extract` | Extract data from text using AI |
| POST | `/api/ai/extract-file` | Extract data from uploaded file using AI |

### POST /api/ai/extract

```json
{
  "provider": "openrouter",
  "model": "openai/gpt-3.5-turbo",
  "documentText": "Your document text here...",
  "extractionPrompt": "Extract invoice details as JSON"
}
```

### POST /api/ai/extract-file

Form-data with:
- `file`: The document file
- `provider`: AI provider name
- `model`: (optional) Specific model to use
- `extractionPrompt`: What to extract

## 🏗️ Project Structure

```
DocuExtract/
├── server.ts                    # Express backend server
├── .env.example                 # Environment variables template
├── vite.config.ts               # Vite config with API proxy
├── tsconfig.json                # Frontend TypeScript config
├── tsconfig.server.json         # Backend TypeScript config
├── src/
│   ├── App.tsx                  # Main React application
│   ├── index.css                # Global styles
│   ├── main.tsx                 # React entry point
│   ├── types.ts                 # TypeScript type definitions
│   ├── ai/
│   │   ├── providers.ts         # AI provider configs & models
│   │   └── aiService.ts         # AI API calls (OpenRouter, Gemini, Groq)
│   └── components/
│       ├── AIProviderSelector.tsx  # Provider/model selection UI
│       └── ExtractionResults.tsx   # Results display component
└── components/                  # Shared UI components
    └── ui/
```

## 🔧 Adding a New AI Provider

1. Add provider config in `src/ai/providers.ts`
2. Implement the API call function in `src/ai/aiService.ts`
3. Add the provider case in the `extractWithAI` switch
4. Add environment variables in `.env.example`
5. Update frontend types in `src/types.ts`

## 📝 License

MIT