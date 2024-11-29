# Contributing to Window Chain

First off, thank you for considering contributing to Window Chain! It's people like you that make Window Chain such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* Use a clear and descriptive title
* Describe the exact steps which reproduce the problem
* Provide specific examples to demonstrate the steps
* Describe the behavior you observed after following the steps
* Explain which behavior you expected to see instead and why
* Include screenshots if relevant

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide the following information:

* Use a clear and descriptive title
* Provide a step-by-step description of the suggested enhancement
* Provide specific examples to demonstrate the steps
* Describe the current behavior and explain which behavior you expected to see instead
* Explain why this enhancement would be useful

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Follow the JavaScript styleguide
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Development Process

1. Fork the repo
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run the tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Setup Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/window-chain.git

# Install dependencies
npm install

# Run tests
npm test

# Build documentation
npm run docs
```

### Project Structure

```
window-chain/
├── src/
│   ├── core/           # Core functionality
│   ├── templates/      # Template system
│   ├── caching/        # Caching system
│   ├── composition/    # Composition utilities
│   └── monitoring/     # Analytics and monitoring
├── test/              # Test files
├── docs/              # Documentation
└── examples/          # Example code
```

### Coding Style

* Use 2 spaces for indentation
* Use single quotes for strings
* Use template literals for string interpolation
* Use meaningful variable names
* Add JSDoc comments for all public APIs
* Follow ESLint configuration

### Testing

* Write tests for all new features
* Maintain test coverage
* Use descriptive test names
* Test edge cases
* Run the full test suite before submitting PRs

### Documentation

* Update documentation for all new features
* Use clear and concise language
* Include code examples
* Keep the API reference up to date
* Document breaking changes

## Community

* Join our Discord server
* Follow us on Twitter
* Read our blog

## Questions?

Feel free to open an issue with the "question" label if you need help or clarification.

Thank you for contributing to Window Chain!
