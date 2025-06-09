<div align="center">

![Cyrus Logo](assets/logo.svg)

# 👑 CYRUS
### The Code Empire Analyzer

**AI-Powered Code Analysis, Debugging & Language Detection CLI for Modern Developers**

[![npm version](https://img.shields.io/npm/v/@usex/cyrus?style=for-the-badge&color=6366f1)](https://www.npmjs.com/package/@usex/cyrus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AI Powered](https://img.shields.io/badge/AI-Powered-6366f1?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)

[🚀 Quick Start](#-quick-start) • [📖 Documentation](#-documentation) • [🤖 AI Providers](#-ai-providers) • [🔍 Language Detection](#-language-detection) • [⚙️ Configuration](#%EF%B8%8F-configuration)

</div>

---

## ✨ What Makes Cyrus Special?

Cyrus isn't just another code analysis tool, it's your AI-powered code empire command center. Built for the modern developer workflow, it combines cutting-edge language detection, multiple AI provider support, and comprehensive code analysis in one elegant CLI.

### 🏆 Key Highlights

- **🎯 High-Precision Language Detection** - 95%+ accuracy with confidence scoring
- **🤖 Multiple AI Providers** - OpenAI, Anthropic, Google, X.AI + Local AI support  
- **🌐 10+ Programming Languages** - From JavaScript to Rust, we've got you covered
- **🏠 Local AI Support** - Ollama, LM Studio, and custom OpenAI-compatible APIs
- **📊 Framework Detection** - React, Vue, Django, Spring, and 20+ more
- **⚡ Lightning Fast** - Built with Bun for maximum performance
- **🎨 Beautiful CLI** - Claude Code-inspired UX with progress indicators

---

## 🌟 Features

<details>
<summary><strong>🔍 Advanced Language Detection</strong></summary>

- **Multi-layered Detection**: File extensions + content analysis + pattern matching
- **Framework Recognition**: Automatically detects React, Vue, Django, Flask, Spring, etc.
- **Build Tool Detection**: npm, yarn, pnpm, bun, pip, poetry, cargo, maven, gradle
- **Test Framework Identification**: Jest, pytest, JUnit, Mocha, RSpec, and more
- **Confidence Scoring**: Get percentage confidence for each detection
- **Project-wide Analysis**: Scan entire codebases with language distribution

```bash
# Detect languages in current project
cyrus detect .

# Analyze a specific file with detailed info
cyrus detect src/components/App.tsx --detailed

# Export project language analysis
cyrus detect . --json -o project-analysis.json
```

</details>

<details>
<summary><strong>🤖 Multi-AI Provider Support</strong></summary>

**Cloud Providers:**
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku  
- **Google**: Gemini 1.5 Pro, Gemini 1.5 Flash
- **X.AI**: Grok Beta

**Local AI Providers:**
- **Ollama**: Auto-detection of installed models
- **LM Studio**: Seamless integration with local models
- **Custom APIs**: Any OpenAI-compatible local server

```bash
# Setup with local AI (no API key required!)
cyrus config init
# ✓ Found local AI models:
#   Ollama: llama3.2, codellama, mistral
#   LM Studio: deepseek-coder, code-llama-13b

# Switch between providers easily
cyrus config set provider ollama
cyrus config set model llama3.2
```

</details>

<details>
<summary><strong>📊 Comprehensive Code Analysis</strong></summary>

- **Static Analysis**: Syntax errors, code quality, complexity metrics
- **Security Scanning**: OWASP vulnerability detection with severity levels
- **Performance Analysis**: Bottleneck identification and optimization suggestions
- **AI-Powered Insights**: Contextual explanations and improvement recommendations
- **Multiple Output Formats**: Text, JSON, Markdown for any workflow

```bash
# Full analysis suite
cyrus analyze src/app.ts --security --metrics --explain

# Quick fix for critical issues
cyrus fix src/problematic-file.js

# Comprehensive code review
cyrus review src/components/UserAuth.tsx
```

</details>

<details>
<summary><strong>🎓 AI-Powered Mentoring</strong></summary>

- **Adaptive Learning**: Personalized guidance based on your skill level
- **Interactive Sessions**: Ask questions, get explanations, learn patterns  
- **Context-Aware Teaching**: Focused learning areas and customization
- **Best Practices**: Industry standards and coding conventions
- **Code Walkthroughes**: Line-by-line explanations with educational context

```bash
# Get personalized mentoring
cyrus mentor src/algorithm.js --interactive

# Learning mode with detailed explanations
cyrus learn src/complex-component.tsx
```

</details>

<details>
<summary><strong>⚡ Smart Code Generation</strong></summary>

- **Test Generation**: Comprehensive unit tests with edge cases and mocking
- **Documentation**: JSDoc, docstrings, README generation
- **Refactoring Suggestions**: Before/after examples with detailed explanations
- **Project Scaffolding**: Complete project structures from descriptions
- **Component Generation**: Framework-specific components (React, Vue, Angular)

```bash
# Generate comprehensive tests
cyrus generate tests src/utils/validator.js

# Create documentation
cyrus generate docs src/api/

# Get refactoring suggestions
cyrus generate refactor src/legacy-code.js --interactive

# Generate entire project
cyrus generate project "REST API with TypeScript and Prisma"
```

</details>

<details>
<summary><strong>🏥 Proactive Health Monitoring</strong></summary>

- **Codebase Health Reports**: Overall score with actionable insights
- **Technical Debt Tracking**: Quantified debt with time estimates
- **Maintainability Index**: Industry-standard metrics and trends
- **Historical Analysis**: Track improvements over time
- **Team Reporting**: Export reports for team reviews

```bash
# Scan entire codebase health
cyrus health

# Detailed health report with trends
cyrus health --detailed --save

# Parallel processing for large codebases
cyrus health --parallel --output health-report.json
```

</details>

<details>
<summary><strong>🎯 Code Quality Scoring</strong></summary>

- **Comprehensive Quality Score**: Overall grade (A+ to F) based on multiple factors
- **Weighted Metrics**: Code health, maintainability, complexity, test coverage, documentation, security
- **AI-Powered Recommendations**: Specific, actionable improvement suggestions
- **File-Level Analysis**: Identify files needing the most attention
- **Progress Tracking**: Monitor quality improvements over time

```bash
# Calculate quality score for entire project
cyrus quality .

# Quality score for specific file
cyrus quality src/components/UserAuth.tsx

# Analyze with custom limits
cyrus quality . --max-files 100

# Export quality report
cyrus quality . --json > quality-report.json
```

**Sample Output:**
```bash
🎯 Code Quality Report
═══════════════════════════════════════════════════════════

Overall Quality Score: 87/100 (A)
████████████████████░

📊 Detailed Metrics:
  Code Health      92/100 ██████████
  Maintainability  85/100 ████████▌░
  Complexity       78/100 ███████▌░░
  Test Coverage    95/100 █████████▌
  Documentation    72/100 ███████▍░░
  Security         94/100 █████████▍

🚀 Improvement Recommendations:
• Reduce complexity in high-complexity functions (complexity.js:45-67)
• Add inline documentation for public APIs
• Consider extracting utility functions for better maintainability
• Review security practices in authentication modules
```

</details>

---

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install -g @usex/cyrus

# Using bun (recommended)
bun install -g @usex/cyrus

# Using yarn
yarn global add @usex/cyrus

# Using pnpm
pnpm add -g @usex/cyrus

# Verify installation
cyrus --version
```

### Setup

```bash
# Interactive setup with local AI detection
cyrus config init

# ✓ Found local AI models:
#   Ollama: llama3.2, codellama, mistral
# ✓ Configuration saved successfully!
```

### Your First Analysis

```bash
# Detect project languages and frameworks
cyrus detect .

# Analyze a file for issues
cyrus analyze src/app.ts

# Get AI mentoring
cyrus mentor src/complex-logic.js --interactive

# Generate tests for your code
cyrus generate tests src/utils.js
```

---

## 📖 Documentation

### Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `cyrus detect <path>` | Language & framework detection | `cyrus detect . --detailed` |
| `cyrus analyze <file>` | Code analysis & debugging | `cyrus analyze src/app.js --security` |
| `cyrus mentor <file>` | AI-powered code mentoring | `cyrus mentor src/algo.py --interactive` |
| `cyrus generate <type>` | Code generation utilities | `cyrus generate tests src/utils.js` |
| `cyrus quality <target>` | Comprehensive quality scoring | `cyrus quality . --max-files 50` |
| `cyrus health` | Codebase health analysis | `cyrus health --detailed --save` |
| `cyrus config` | Configuration management | `cyrus config init` |

### Quick Commands

| Command | Description |
|---------|-------------|
| `cyrus fix <file>` | Quick fix critical issues |
| `cyrus review <file>` | Comprehensive code review |
| `cyrus learn <file>` | Interactive learning mode |

### Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |
| `--quiet, -q` | Suppress banner output |
| `--help, -h` | Show help information |
| `--version, -V` | Show version number |

---

## 🔍 Language Detection

Cyrus features industry-leading language detection with **95%+ accuracy**:

### Supported Languages

| Language | Extensions | Frameworks Detected |
|----------|------------|---------------------|
| **JavaScript** | `.js`, `.mjs`, `.cjs` | React, Vue, Express, Next.js |
| **TypeScript** | `.ts`, `.tsx` | React, Angular, NestJS, Next.js |
| **Python** | `.py`, `.pyw`, `.pyi` | Django, Flask, FastAPI, pytest |
| **Java** | `.java` | Spring, Spring Boot, JUnit |
| **Go** | `.go` | Gin, Echo, built-in testing |
| **Rust** | `.rs` | Actix, Rocket, cargo test |
| **C#** | `.cs` | .NET, ASP.NET, xUnit |
| **PHP** | `.php` | Laravel, Symfony, PHPUnit |
| **Ruby** | `.rb`, `.rake` | Rails, RSpec, Minitest |

### Detection Features

```bash
# Project-wide language analysis
cyrus detect .
# 📊 Project Analysis
# ─────────────────────────────
# Total Files: 247
# Primary Language: TypeScript
#
# Language Distribution:
# TypeScript        ████████████████████████████████  156 files (63.2%)
# JavaScript        █████████████░░░░░░░░░░░░░░░░░░░░   78 files (31.6%)
# JSON              ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   13 files (5.3%)
#
# 🎯 Detected Frameworks:
# • React + TypeScript
# • Next.js
# • Tailwind CSS
# • Jest (testing)
#
# 📦 Package Managers:
# • bun
# • npm (fallback)

# File-specific analysis with confidence
cyrus detect src/components/UserAuth.tsx --detailed
# 📄 File Analysis
# ─────────────────────────────
# File: UserAuth.tsx
# Language: TypeScript
# Confidence: ████████████████████████████████ 98.7%
# Frameworks: React, TypeScript
# Test Frameworks: Jest, Testing Library
#
# Language Features:
# Extensions: .tsx
# Static Analysis: ✓
# Security Rules: ✓
# Test Frameworks: Jest, Testing Library
```

---

## 🤖 AI Providers

### Cloud Providers

<table>
  <tr>
    <td align="center">
      <img src="https://cdn.brandfetch.io/idR3duQxYl/theme/light/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B" width="120" alt="OpenAI">
      <br /><br/>
      <strong>OpenAI</strong>
      <br>GPT-4, GPT-4 Turbo
    </td>
    <td align="center">
      <img src="https://cdn.brandfetch.io/idW5s392j1/theme/light/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B" width="60" alt="Anthropic">
      <br /><br/>
      <strong>Anthropic</strong>
      <br>Claude 3.5 Sonnet, Opus
    </td>
    <td align="center">
      <img src="https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B" width="60" alt="Google Gemini">
      <br />
      <strong>Google</strong>
      <br>Gemini 1.5 Pro, Flash
    </td>
    <td align="center">
      <img src="https://cdn.brandfetch.io/iddjpnb3_W/theme/light/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B" width="60" alt="X.AI Grok">
      <br /><br/>
      <strong>X.AI</strong>
    </td>
  </tr>
</table>

### Local AI Support 🏠

**Why Local AI?**
- ✅ **No API costs** - Run unlimited analysis
- ✅ **Privacy-first** - Your code never leaves your machine  
- ✅ **Offline capable** - Work without internet
- ✅ **Custom models** - Use specialized coding models

**Supported Platforms:**

| Platform | Auto-Detection | Models |
|----------|---------------|---------|
| **Ollama** | ✅ | llama3.2, codellama, deepseek-coder, starcoder |
| **LM Studio** | ✅ | Any GGUF model from HuggingFace |
| **Custom API** | ⚙️ | Any OpenAI-compatible server |

```bash
# Setup with Ollama (example)
# 1. Install Ollama: https://ollama.ai
# 2. Pull a coding model
ollama pull codellama

# 3. Initialize Cyrus (auto-detects Ollama)
cyrus config init
# ✓ Found local AI models:
#   Ollama: codellama, llama3.2, deepseek-coder

# 4. Start analyzing with local AI!
cyrus analyze src/app.py
# 🤖 Using Ollama (codellama) - No API key required!
```

---

## ⚙️ Configuration

### Flexible Configuration with Cosmiconfig

Cyrus uses [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) for flexible configuration management:

**Supported Configuration Files:**
- `package.json` (in `cyrus` field)
- `.cyrusrc` (JSON or YAML)
- `.cyrusrc.json`
- `.cyrusrc.yaml` / `.cyrusrc.yml`
- `.cyrusrc.js` / `.cyrusrc.cjs` / `.cyrusrc.mjs`
- `.cyrusrc.ts`
- `cyrus.config.js` / `cyrus.config.cjs` / `cyrus.config.mjs`
- `cyrus.config.ts`

### Configuration Examples

<details>
<summary><strong>Cloud Provider Setup (.cyrusrc.json)</strong></summary>

```json
{
  "$schema": "https://cyrus.dev/schema.json",
  "aiProvider": {
    "name": "openai",
    "model": "gpt-4-turbo-preview",
    "apiKey": "sk-...",
    "temperature": 0.7,
    "maxTokens": 4096
  },
  "features": {
    "securityScan": true,
    "performanceAnalysis": true,
    "codeGeneration": true,
    "refactorSuggestions": true,
    "mentorMode": true
  },
  "languages": ["javascript", "typescript", "python"],
  "outputFormat": "text",
  "detectLanguage": {
    "enabled": true,
    "confidence": 0.7
  }
}
```
</details>

<details>
<summary><strong>Local AI Setup (.cyrusrc.json)</strong></summary>

```json
{
  "$schema": "https://cyrus.dev/schema.json",
  "aiProvider": {
    "name": "ollama",
    "model": "codellama",
    "baseURL": "http://localhost:11434/v1"
  },
  "features": {
    "securityScan": true,
    "performanceAnalysis": true,
    "codeGeneration": true,
    "refactorSuggestions": true,
    "mentorMode": true
  },
  "localModels": {
    "ollama": {
      "models": ["codellama", "llama3.2", "deepseek-coder"],
      "defaultModel": "codellama"
    }
  }
}
```
</details>

<details>
<summary><strong>TypeScript Configuration (cyrus.config.ts)</strong></summary>

```typescript
import type { Config } from '@usex/cyrus';

const config: Config = {
  aiProvider: {
    name: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY!,
    temperature: 0.3,
  },
  features: {
    securityScan: true,
    performanceAnalysis: true,
    codeGeneration: true,
    refactorSuggestions: true,
    mentorMode: true,
  },
  languages: ['typescript', 'javascript', 'python', 'rust'],
  outputFormat: 'json',
  detectLanguage: {
    enabled: true,
    confidence: 0.8,
  },
};

export default config;
```
</details>

### Environment Variables

```bash
# API Keys
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="AIza..."
export XAI_API_KEY="xai-..."

# Default Settings
export CYRUS_PROVIDER="openai"
export CYRUS_MODEL="gpt-4-turbo-preview"
export CYRUS_OUTPUT_FORMAT="text"
```

### Configuration Commands

```bash
# Interactive setup
cyrus config init

# View current configuration
cyrus config show

# Set individual values
cyrus config set provider anthropic
cyrus config set model claude-3-5-sonnet-20241022
cyrus config set apikey sk-ant-...
cyrus config set baseurl http://localhost:11434/v1  # For local AI

# Get specific values
cyrus config get provider
cyrus config get model

# Reset configuration
cyrus config delete
```

---

## 🎬 Examples & Use Cases

### Real-World Scenarios

<details>
<summary><strong>🔍 Project Onboarding</strong></summary>

```bash
# You've just cloned a new repository
git clone https://github.com/company/mystery-project
cd mystery-project

# Understand the project structure instantly
cyrus detect .
# 📊 Project Analysis
# ─────────────────────────────
# Primary Language: TypeScript (React)
# Frameworks: Next.js, Tailwind CSS, Prisma
# Package Manager: pnpm
# Test Framework: Jest + Testing Library
# Total Files: 247

# Get a health overview
cyrus health
# 🏥 Codebase Health: 8.7/10
# ✅ Strong type safety
# ⚠️  Some duplicate code detected
# 📈 Excellent test coverage (94%)
```
</details>

<details>
<summary><strong>🐛 Debugging Session</strong></summary>

```bash
# Found a problematic file
cyrus analyze src/utils/dateParser.js --explain --security
# 🔍 Analysis Results
# ─────────────────────────────
# Issues Found:
# 1. Line 15: Potential null pointer exception
# 2. Line 23: Inefficient regex pattern
# 3. Line 31: Missing input validation (Security Risk)
#
# 🤖 AI Explanation:
# The function doesn't handle edge cases where...
# [Detailed explanation with fix suggestions]

# Get mentoring on the complex parts
cyrus mentor src/utils/dateParser.js --interactive
# 🎓 Mentoring Session
# Let's walk through this code together...
# [Interactive Q&A session]
```
</details>

<details>
<summary><strong>⚡ Test Generation</strong></summary>

```bash
# Generate comprehensive tests
cyrus generate tests src/api/userController.js
# 🧪 Generated 47 test cases covering:
# ✅ Happy path scenarios (12 tests)
# ✅ Edge cases (18 tests)  
# ✅ Error conditions (12 tests)
# ✅ Security scenarios (5 tests)
#
# Tests saved to: src/api/__tests__/userController.test.js

# Generate tests for the entire module
cyrus generate tests src/utils/ --recursive
```
</details>

<details>
<summary><strong>📚 Documentation Generation</strong></summary>

```bash
# Generate comprehensive documentation
cyrus generate docs src/api/
# 📖 Generated documentation:
# • API.md - Complete API documentation
# • src/api/README.md - Module overview
# • Inline JSDoc comments added
# • Type definitions documented

# Generate project documentation
cyrus generate docs . --type=project
# Creates: README.md, CONTRIBUTING.md, API.md
```
</details>

<details>
<summary><strong>🔄 Refactoring Assistance</strong></summary>

```bash
# Get refactoring suggestions
cyrus generate refactor src/legacy/oldCode.js --interactive
# 🔧 Refactoring Suggestions (5 found)
# ─────────────────────────────
# 1. Extract utility function (Line 45-67)
#    Impact: High | Confidence: 94%
#    Before: [long complex function]
#    After:  [clean, modular code]
#
# Apply this suggestion? (y/N) y
# ✅ Refactoring applied successfully!
```
</details>

### Integration Examples

<details>
<summary><strong>🔄 CI/CD Integration</strong></summary>

```yaml
# .github/workflows/code-analysis.yml
name: Code Analysis with Cyrus

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      
      - name: Install Cyrus
        run: bun install -g @usex/cyrus
        
      - name: Setup Cyrus
        run: |
          cyrus config set provider openai
          cyrus config set model gpt-3.5-turbo
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          
      - name: Analyze Code Health
        run: cyrus health --json > health-report.json
        
      - name: Upload Health Report
        uses: actions/upload-artifact@v4
        with:
          name: health-report
          path: health-report.json
```
</details>

<details>
<summary><strong>📝 Pre-commit Hook</strong></summary>

```bash
# .husky/pre-commit
#!/usr/bin/env sh

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|jsx|tsx|py|java|go|rs)$')

if [ ${#STAGED_FILES[@]} -gt 0 ]; then
  echo "🔍 Running Cyrus analysis on staged files..."
  
  for FILE in $STAGED_FILES; do
    echo "Analyzing $FILE..."
    cyrus analyze "$FILE" --security --quiet
    
    if [ $? -ne 0 ]; then
      echo "❌ Analysis failed for $FILE"
      exit 1
    fi
  done
  
  echo "✅ All files passed analysis!"
fi
```
</details>

---

## 🛠️ Advanced Usage

### Custom Workflows

<details>
<summary><strong>📊 Team Health Dashboard</strong></summary>

```bash
# Generate team health report
cyrus health --detailed --trends --save
# Creates comprehensive report with:
# • Overall health metrics
# • Language distribution changes
# • Technical debt trends
# • Security vulnerability tracking
# • Test coverage evolution

# Export for team dashboard
cyrus health --json | jq '.summary' > team-dashboard.json
```
</details>

<details>
<summary><strong>🏗️ Project Scaffolding</strong></summary>

```bash
# Generate complete project from description
cyrus generate project "REST API with TypeScript, Prisma, and Redis"
# 🏗️  Generating project structure...
# ✅ Created TypeScript configuration
# ✅ Set up Prisma with PostgreSQL
# ✅ Configured Redis connection
# ✅ Added Express.js server
# ✅ Generated API routes
# ✅ Created test suite
# ✅ Added Docker configuration
# ✅ Generated documentation

# Generate component with tests
cyrus generate component UserProfileCard --framework=react --tests
```
</details>

### Power User Tips

<details>
<summary><strong>⚡ Performance Optimization</strong></summary>

```bash
# Parallel processing for large codebases
cyrus health --parallel --workers=8

# Use local AI for unlimited analysis
cyrus config set provider ollama
cyrus analyze src/ --recursive  # No API costs!

# Cache analysis results
export CYRUS_CACHE_TTL=3600  # 1 hour cache
cyrus analyze src/  # Subsequent runs use cache
```
</details>

<details>
<summary><strong>🎯 Targeted Analysis</strong></summary>

```bash
# Language-specific analysis
cyrus analyze src/ --language=typescript --framework=react

# Security-focused scanning
cyrus analyze src/ --security --owasp --severity=high

# Performance-focused analysis
cyrus analyze src/ --performance --metrics --bottlenecks
```
</details>

---

## 🤝 Contributing

We love contributions! Cyrus is built by developers, for developers.

### Quick Contribution Guide

1. **Fork & Clone**
   ```bash
   git clone https://github.com/ali-master/cyrus.git
   cd cyrus
   ```

2. **Setup Development Environment**
   ```bash
   bun install
   bun run start:cli:dev
   ```

3. **Make Your Changes**
   - Add features, fix bugs, improve docs
   - Follow our [Contributing Guidelines](CONTRIBUTING.md)
   - Write tests and ensure they pass

4. **Submit Pull Request**
   ```bash
   git checkout -b feature/amazing-feature
   git commit -m 'Add amazing feature'
   git push origin feature/amazing-feature
   ```

### Development Commands

```bash
# Development
bun run start:dev           # Run main in dev mode
bun run start:cli:dev       # Run CLI in dev mode

# Building
bun run build              # Build for production
bun run test:types         # Type checking

# Quality
bun run format             # Format code with Prettier
bun run lint               # Lint with ESLint
bun run lint:fix           # Auto-fix linting issues
```

### Areas We Need Help

- 🌍 **Language Support**: Add more programming languages
- 🤖 **AI Providers**: Integrate additional AI services
- 🧪 **Test Coverage**: Expand our test suite
- 📖 **Documentation**: Improve guides and examples
- 🎨 **UI/UX**: Enhance the CLI experience
- 🔌 **Integrations**: VS Code extension, GitHub Actions

[See open issues →](https://github.com/ali-master/cyrus/issues)

---

## 📈 Roadmap

### 🎯 v1.1 - Enhanced Detection
- [ ] **Language Support**: C++, Kotlin, Swift, Dart
- [ ] **Framework Detection**: Flutter, Laravel, Ruby on Rails
- [ ] **IDE Integration**: VS Code extension
- [ ] **Package Ecosystem**: Detect package vulnerabilities

### 🎯 v1.2 - Team Features  
- [ ] **Team Dashboard**: Web interface for team analytics
- [ ] **Historical Tracking**: Code health trends over time
- [ ] **Integration APIs**: Slack, Discord, Microsoft Teams
- [ ] **Custom Rules**: Team-specific analysis rules

### 🎯 v1.3 - Advanced AI
- [ ] **Code Similarity**: Duplicate code detection across repos
- [ ] **Smart Refactoring**: AI-powered code transformation
- [ ] **Learning Mode**: Personalized improvement suggestions
- [ ] **Code Review**: AI-powered PR reviews

### 🎯 v2.0 - Enterprise Ready
- [ ] **Self-hosted**: On-premise deployment options
- [ ] **RBAC**: Role-based access control
- [ ] **Audit Logs**: Compliance and security tracking
- [ ] **Custom Models**: Fine-tuned AI models for specific domains

[View full roadmap →](https://github.com/ali-master/cyrus/projects)

---

## 🐛 Troubleshooting

<details>
<summary><strong>❓ Common Issues</strong></summary>

**No API key found**
```bash
# Check your configuration
cyrus config show

# Set your API key
cyrus config set apikey sk-your-key-here

# Or use environment variables
export OPENAI_API_KEY="sk-your-key-here"
```

**Local AI not detected**
```bash
# Ensure Ollama is running
ollama serve

# Check if models are installed
ollama list

# Re-run configuration
cyrus config init
```

**Analysis fails**
```bash
# Use verbose mode for debugging
cyrus analyze src/app.js --verbose

# Check file permissions
ls -la src/app.js

# Try with a different AI provider
cyrus config set provider anthropic
```

**Performance issues**
```bash
# Use parallel processing
cyrus health --parallel

# Increase timeout
export CYRUS_TIMEOUT=60000

# Use local AI to avoid rate limits
cyrus config set provider ollama
```
</details>

<details>
<summary><strong>🔧 Advanced Debugging</strong></summary>

```bash
# Enable debug logging
export DEBUG=cyrus:*
cyrus analyze src/app.js

# Check configuration resolution
cyrus config show --debug

# Validate file detection
cyrus detect src/app.js --verbose

# Test AI connectivity
cyrus config test-connection
```
</details>

---

## 📄 License

MIT © [Ali Torki](https://github.com/ali-master)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Cyrus stands on the shoulders of giants. Special thanks to:

- **[Vercel AI SDK](https://sdk.vercel.ai/)** - Seamless AI model integration
- **[Bun](https://bun.sh/)** - Lightning-fast JavaScript runtime  
- **[Commander.js](https://github.com/tj/commander.js/)** - Elegant CLI framework
- **[Cosmiconfig](https://github.com/davidtheclark/cosmiconfig)** - Flexible configuration
- **[Chalk](https://github.com/chalk/chalk)** - Beautiful terminal styling
- **[Ora](https://github.com/sindresorhus/ora)** - Elegant terminal spinners

### AI Provider Partners

<div align="center">

| OpenAI | Anthropic | Google | X.AI | Ollama |
|--------|-----------|--------|------|--------|
| ![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white) | ![Anthropic](https://img.shields.io/badge/Anthropic-C5A572?style=for-the-badge) | ![Google](https://img.shields.io/badge/Google-4285F4?style=for-the-badge&logo=google&logoColor=white) | ![X.AI](https://img.shields.io/badge/X.AI-000000?style=for-the-badge&logo=x&logoColor=white) | ![Ollama](https://img.shields.io/badge/Ollama-000000?style=for-the-badge) |

</div>

---

<div align="center">

### 🌟 Star us on GitHub!

If Cyrus has helped you build better code, please give us a star. It helps us understand that we're building something valuable for the developer community.

[![GitHub stars](https://img.shields.io/github/stars/ali-master/cyrus?style=for-the-badge&color=6366f1)](https://github.com/ali-master/cyrus/stargazers)

**Built with ❤️ by [Ali Torki](https://github.com/ali-master) for developers who demand excellence**

[🚀 Get Started](https://www.npmjs.com/package/@usex/cyrus) • [📖 Documentation](https://github.com/ali-master/cyrus/blob/main/README.md) • [🐦 Linkedin](https://linkedin.com/in/alitorki)

</div>
