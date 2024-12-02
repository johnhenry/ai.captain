/**
 * Template string validator
 */
class TemplateValidator {
  /**
   * Validate a template string and its parameters
   * @param {string} template Template string containing {param} placeholders
   * @param {Object} params Parameters to validate against
   * @returns {Object} Validation result with valid status and any issues
   */
  validate(template, params) {
    const issues = [];

    // Check for invalid template syntax (unclosed braces)
    const braceMatches = template.match(/\{([^}]*)\}/g) || [];
    const openBraces = (template.match(/\{/g) || []).length;
    const closeBraces = (template.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      issues.push('Invalid template syntax: mismatched braces');
      return { valid: false, issues };
    }

    // Extract required parameters from template
    const requiredParams = braceMatches.map(match => match.slice(1, -1));

    // Check for missing required parameters
    const missingParams = requiredParams.filter(param => !(param in params));
    if (missingParams.length > 0) {
      issues.push(`Missing required parameters: ${missingParams.join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export { TemplateValidator };
