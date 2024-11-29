# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Updated Session class documentation to use static `create()` factory method
- Standardized template system API to use `create()` instead of `register()`
- Updated README examples to reflect current API patterns

### Added
- Documentation for Session's `destroy()` method
- Documentation for token tracking properties (`tokensSoFar`, `maxTokens`, `tokensLeft`)
- Added CHANGELOG.md for tracking project changes

### Fixed
- Resolved API documentation inconsistencies between implementation and documentation
- Standardized method naming conventions across codebase
