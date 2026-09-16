# 🧠 Zeno AI Assistant

> **Think less. Build more.**  
> Zeno is an AI-powered development assistant designed to understand what you're working on and help you solve problems faster.

Zeno is a modern AI assistant built for developers who don't want to constantly switch between their code editor, browser, documentation, and AI tools.

Instead of simply answering questions, Zeno is designed around **context** — giving the assistant access to what you're currently working with through text, screenshots, and clipboard content.

---

## ✨ What Makes Zeno Different?

Most AI coding assistants wait for you to explain the problem.

**Zeno starts with the context.**

You can give Zeno:

- 💻 Code you're currently working on
- 📋 Content from your clipboard
- 📸 Screenshots of errors or interfaces
- 💬 Natural-language questions
- 🤖 Agent-based tasks

Zeno then analyzes the provided context and helps you understand, debug, and improve your work.

---

## 🚀 Core Features

### 💬 AI Chat

Ask Zeno anything related to programming, debugging, concepts, or development.

```text
"Why am I getting this NullPointerException?"
"Explain this SQL query."
"Convert this Java code to Python."
"How can I optimize this function?"
```

---

### 🧩 Context-Aware Analysis

Zeno can work with information beyond manually typed prompts.

**Clipboard Analysis**

Copy code, errors, logs, or text and let Zeno analyze it.

**Screenshot Analysis**

Capture an error message, code, UI, or development screen and ask Zeno to understand it.

---

### 🤖 Agent Mode

Zeno includes an **Agent Mode** designed for more task-oriented interactions.

Instead of treating every interaction as a simple question-and-answer conversation, Agent Mode can analyze the supplied context and help break a problem into actionable steps.

> **Normal Mode → Ask & Understand**  
> **Agent Mode → Analyze & Act**

---

### 🌐 Zeno Browser Extension

Zeno can also work alongside your browser through its companion extension.

The extension provides a lightweight floating Zeno interface so developers can access assistance without constantly leaving the page they're working on.

---

### 🎨 Modern Developer UI

Zeno is designed as a focused desktop-style AI workspace rather than a traditional chatbot.

Features include:

- Dark professional interface
- Glass-style UI elements
- Animated Zeno branding
- Minimal distraction
- Chat history
- Pinned conversations
- Responsive layout
- Customizable appearance

---

## 🧠 How Zeno Works

```text
             ┌──────────────────┐
             │      USER        │
             └────────┬─────────┘
                      │
             Question / Context
                      │
                      ▼
             ┌──────────────────┐
             │      ZENO        │
             │   AI Interface   │
             └────────┬─────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Text Input   Clipboard   Screenshot
          │           │           │
          └───────────┼───────────┘
                      ▼
             ┌──────────────────┐
             │  Context Analysis│
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │    AI Engine     │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │  Zeno Response   │
             └──────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
- React
- JavaScript
- HTML5
- CSS3
- Modern component-based UI

### Backend
- Java
- Spring Boot
- REST APIs

### AI
- Google Gemini API

### Browser Integration
- Browser Extension APIs
- JavaScript

### Deployment
- Vercel — Frontend
- Render — Backend

---

## 🔐 Privacy & API Key Model

Zeno is designed with user-controlled AI access in mind.

Instead of embedding a shared API key inside the public application, users can configure their own provider credentials through the application's settings.

This approach helps:

- Avoid exposing a developer's API key
- Give users control over their AI usage
- Reduce dependency on a shared quota
- Make the application easier to customize

> **Never commit API keys, secrets, or environment variables to GitHub.**

---

## ⚡ Example Workflow

### Debugging an Error

```text
1. Copy the error
        ↓
2. Open Zeno
        ↓
3. Analyze Clipboard
        ↓
4. Zeno identifies the problem
        ↓
5. Explanation + suggested solution
        ↓
6. Developer applies the fix
```

### Screenshot-Based Analysis

```text
Screenshot
    ↓
Zeno Agent
    ↓
Visual Context
    ↓
Problem Identification
    ↓
Explanation
    ↓
Suggested Solution
```

---

## 📂 Project Structure

```text
Zeno/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── ...
│
├── backend/
│   ├── src/
│   ├── controller/
│   ├── service/
│   └── ...
│
├── extension/
│   ├── manifest.json
│   ├── scripts/
│   └── ...
│
├── README.md
└── .gitignore
```

> Project structure may change as Zeno continues to evolve.

---

## 🧪 Current Development

Zeno is an actively evolving project.

Current development areas include:

- [x] AI chat interface
- [x] Context-based analysis
- [x] Clipboard analysis
- [x] Screenshot analysis
- [x] Agent Mode concept
- [x] Browser extension integration
- [x] Chat history
- [x] Pinned conversations
- [x] User-controlled API configuration
- [x] Frontend deployment
- [x] Backend API deployment
- [ ] More autonomous agent workflows
- [ ] Expanded developer tools
- [ ] Additional AI provider support

---

## 🎯 Vision

Zeno isn't meant to be another chatbot sitting in a browser tab.

The goal is to build an AI companion that **stays close to the developer's workflow**.

Whether you're debugging an error, understanding unfamiliar code, analyzing a screenshot, or trying to figure out what to do next, Zeno aims to reduce the distance between:

**Problem → Understanding → Solution**

---

## 🔮 Future Roadmap

Potential future improvements include:

- 🧠 More advanced agent workflows
- 🔍 Deeper codebase understanding
- 🖥️ Better desktop integration
- 🌐 More browser capabilities
- 🧰 Developer productivity tools
- 🔌 Multiple AI provider support
- ⚙️ Custom AI workflows
- 📚 Project-aware knowledge
- 🎙️ Voice interaction
- 🔐 Enhanced privacy controls

---

## 🤝 Contributing

Zeno is currently a personal development project, but contributions, ideas, and constructive feedback are welcome.

If you find a bug or have an idea for improving Zeno:

1. Open an issue
2. Describe the problem or idea
3. Include relevant screenshots/logs when possible
4. Submit a pull request for improvements

---

## ⚠️ Disclaimer

Zeno is an independent developer project and is not affiliated with or endorsed by Google or any other AI provider.

AI-generated responses may contain errors. Always review generated code and suggestions before using them in production systems.

---
