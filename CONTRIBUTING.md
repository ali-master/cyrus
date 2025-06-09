# Contributing to Cyrus

First off, thank you for considering contributing to Cyrus! It's people like you that make Cyrus such a great tool for AI-powered code analysis and debugging.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* Use a clear and descriptive title
* Describe the exact steps which reproduce the problem
* Provide specific examples to demonstrate the steps
* Describe the behavior you observed after following the steps
* Explain which behavior you expected to see instead and why
* Include your system details (OS, Node.js/Bun version, AI provider, etc.)
* Include configuration details (run `cyrus config show` to get current config)
* If it's an AI-related error, include the provider and model you're using

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* Use a clear and descriptive title
* Provide a step-by-step description of the suggested enhancement
* Provide specific examples to demonstrate the steps
* Describe the current behavior and explain which behavior you expected to see instead
* Explain why this enhancement would be useful
* Consider if the enhancement fits with Cyrus's focus on AI-powered code analysis

### Pull Requests

* Fork the repo and create your branch from `main`
* If you've added code that should be tested, add tests
* Ensure the test suite passes
* Make sure your code lints
* Update documentation as needed
* Follow the error handling patterns established in the codebase
* Issue that pull request!

## Development Process

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/cyrus.git
   cd cyrus
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up development environment**
   ```bash
   # Initialize configuration for development
   bun run start:cli:dev config init
   
   # You can use local AI models for development (no API keys needed)
   # Or set up with your preferred AI provider
   ```

4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. **Make your changes**
   * Write or update tests as needed
   * Follow the existing code style and patterns
   * Use the established error handling system
   * Update documentation as needed

6. **Test your changes**
   ```bash
   # Type checking
   bun run test:types
   
   # Linting and formatting
   bun run lint
   bun run format
   
   # Test CLI commands manually
   bun run start:cli:dev --help
   bun run start:cli:dev detect src/
   bun run start:cli:dev analyze src/cli.ts
   ```

7. **Commit your changes**
   ```bash
   git commit -m "feat: add some amazing feature"
   ```
   
   We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:
   * `feat:` new feature
   * `fix:` bug fix
   * `docs:` documentation changes
   * `style:` formatting, missing semi colons, etc
   * `refactor:` code change that neither fixes a bug nor adds a feature
   * `test:` adding missing tests
   * `chore:` maintenance

8. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

9. **Open a Pull Request**

## Architecture Overview

### Core Components

- **CLI (`src/cli.ts`)**: Main entry point and command routing
- **Commands (`src/commands/`)**: Individual command implementations
- **Analyzers (`src/analyzers/`)**: Language detection and code analysis
- **Services (`src/services/`)**: AI service integration
- **Config (`src/config/`)**: Configuration management with cosmiconfig
- **Utils (`src/utils/`)**: Shared utilities including error handling

### Error Handling System

Cyrus uses a comprehensive error handling system located in `src/utils/error-handler.ts`. When contributing:

#### Use Specific Error Types

```typescript
import { AnalysisError, ConfigurationError, ValidationError } from "../utils/error-handler.js";

// Instead of generic Error
throw new AnalysisError("Failed to analyze file", filePath);

// For configuration issues
throw new ConfigurationError("Invalid AI provider configuration");

// For validation failures
throw new ValidationError("Required field missing", fieldName);
```

#### Use Error Handler Wrappers

```typescript
import { errorHandler } from "../utils/error-handler.js";

// For async operations
return await errorHandler.handleAsync(async () => {
  // Your async code here
}, 'operation-context');

// For file operations
import { handleFileError, validateFileExists } from "../utils/error-handler.js";

try {
  validateFileExists(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
} catch (error) {
  handleFileError(error as Error, filePath);
}
```

#### Error Handling Guidelines

1. Always use specific error types instead of generic `Error`
2. Provide meaningful error messages with context
3. Include relevant metadata (file paths, provider names, etc.)
4. Use `errorHandler.handleAsync()` for command-level error management
5. Never use `console.error()` directly - let the error handler manage output
6. Don't call `process.exit()` directly - configure the error handler instead

## Style Guide

### TypeScript Style Guide

* Use TypeScript for all new code
* Follow the existing code style (enforced by ESLint)
* Use meaningful variable names
* Add types to all function parameters and return values
* Avoid `any` types - use proper interfaces and unions
* Use import aliases consistently (`.js` extensions for local imports)

### Code Organization

* Keep functions focused and single-purpose
* Use descriptive function and variable names
* Group related functionality in appropriate modules
* Follow the established directory structure
* Export types from `src/types/index.ts`

### Error Handling Patterns

```typescript
// ✅ Good - Specific error with context
throw new AnalysisError(
  `Failed to analyze ${language} code: ${error.message}`,
  filePath,
  { language, provider: aiProvider.name }
);

// ❌ Bad - Generic error without context
throw new Error(`Analysis failed: ${error}`);

// ✅ Good - Using error handler wrapper
return await errorHandler.handleAsync(async () => {
  // Command implementation
}, 'command-name');

// ❌ Bad - Manual error handling
try {
  // Command implementation
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
```

### AI Integration Guidelines

* Always validate AI provider configuration before use
* Handle AI service errors gracefully with `handleAIError()`
* Provide fallback behavior when AI services are unavailable
* Support both cloud and local AI providers
* Include provider context in error messages

### CLI UX Guidelines

* Use consistent color coding (follow Claude Code style)
* Provide progress indicators for long operations
* Include helpful suggestions in error messages
* Support both interactive and non-interactive modes
* Offer JSON output options for automation

## Testing

### Manual Testing

Test your changes with various scenarios:

```bash
# Test language detection
bun run start:cli:dev detect src/
bun run start:cli:dev detect src/cli.ts --detailed

# Test analysis with different providers
bun run start:cli:dev analyze src/commands/analyze.ts --security --metrics

# Test configuration management
bun run start:cli:dev config show
bun run start:cli:dev config set provider ollama

# Test error scenarios
bun run start:cli:dev analyze nonexistent-file.js
bun run start:cli:dev config set provider invalid-provider
```

### Error Handling Testing

* Test error scenarios (invalid files, network issues, invalid configs)
* Verify error messages are helpful and actionable
* Check that errors include appropriate context and suggestions
* Ensure graceful degradation when AI services are unavailable

## Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* Include scope when applicable: `feat(analyze): add security scanning`

## Additional Notes

### Issue and Pull Request Labels

* `bug` - Something isn't working
* `enhancement` - New feature or request
* `good first issue` - Good for newcomers
* `help wanted` - Extra attention is needed
* `question` - Further information is requested
* `documentation` - Improvements or additions to documentation
* `ai-integration` - Related to AI service integration
* `language-support` - Adding support for new programming languages
* `error-handling` - Related to error handling improvements
* `performance` - Performance improvements
* `security` - Security-related changes

### Development Tips

1. **Local AI Development**: Use Ollama or LM Studio for development to avoid API costs
2. **Configuration**: Keep multiple config files for testing different scenarios
3. **Debugging**: Use `--verbose` flags and check logs in the logger output
4. **Performance**: Test with large codebases to ensure scalability
5. **Cross-platform**: Test on different operating systems when possible

### Areas We Need Help

- 🌍 **Language Support**: Add more programming languages and frameworks
- 🤖 **AI Providers**: Integrate additional AI services and local models
- 🧪 **Test Coverage**: Expand automated test suite
- 📖 **Documentation**: Improve guides, examples, and API documentation
- 🎨 **CLI UX**: Enhance user experience and output formatting
- 🔌 **Integrations**: VS Code extension, GitHub Actions, CI/CD tools
- 🛡️ **Security**: Enhance security analysis capabilities
- ⚡ **Performance**: Optimize analysis speed and memory usage

### Resources

- [Cyrus Documentation](https://github.com/ali-master/cyrus#readme)
- [AI SDK Documentation](https://sdk.vercel.ai/)
- [Cosmiconfig Documentation](https://github.com/davidtheclark/cosmiconfig)
- [Commander.js Documentation](https://github.com/tj/commander.js/)

[See open issues →](https://github.com/ali-master/cyrus/issues)

---

Thank you for contributing! Your efforts help make Cyrus a better tool for developers worldwide. 🎉

**Built with ❤️ by the community for developers who demand excellence**