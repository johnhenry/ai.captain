# Inconsistency Fix Plan

## 1. Session Class Inconsistencies

### Issue 1.1: Constructor vs Create Method
- **Documentation** shows Session using constructor
- **Tests** use `Session.create()` static method
- **Fix**: Update API documentation to reflect the static factory method pattern being used in tests

### Issue 1.2: Streaming Method Names
- **API docs** show `streamPrompt()`
- **Tests** use `promptStreaming()`
- **Fix**: Standardize on one name (recommend `streamPrompt` for clarity)

## 2. Missing Documentation

### Issue 2.1: Session Methods
- `destroy()` method is used in tests but not documented in API
- **Fix**: Add documentation for `destroy()` method in api.md

### Issue 2.2: Token Tracking Properties
- `tokensSoFar`, `maxTokens`, and `tokensLeft` properties are tested but not documented
- **Fix**: Add these properties to Session class documentation

## 3. Template System Inconsistencies

### Issue 3.1: Template Creation
- **README** shows direct template registration with `templates.register()`
- **API docs** show `create()` method
- **Fix**: Standardize API and update all documentation to use consistent method names

## 4. Implementation Gaps

### Issue 4.1: Source Files
- No `.js`, `.mjs`, or `.ts` source files found in repository
- **Fix**: Ensure source code is properly committed and matches documentation structure

## 5. Test Coverage Gaps

### Issue 5.1: Capabilities Testing
- `Capabilities` class is documented but not comprehensively tested
- **Fix**: Add test cases for all documented Capabilities methods

### Issue 5.2: Cache Compression
- `CacheCompression` class is documented but missing from test suite
- **Fix**: Add dedicated tests for compression functionality

## Action Items Priority

1. High Priority:
   - Add missing source code files
   - Standardize Session class API between docs and implementation
   - Add missing method documentation

2. Medium Priority:
   - Add missing test coverage
   - Standardize template system method names

3. Low Priority:
   - Update example code in README to match final API decisions
   - Add comprehensive token tracking documentation

## Implementation Timeline

1. Week 1:
   - Fix source code structure
   - Update API documentation
   - Standardize method names

2. Week 2:
   - Implement missing tests
   - Update README examples

3. Week 3:
   - Final documentation review
   - Version bump and release

## Notes

- All changes should maintain backward compatibility where possible
- Each change should include corresponding updates to tests and documentation
- Consider adding a CHANGELOG.md to track these changes
