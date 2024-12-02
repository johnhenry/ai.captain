/**
 * Advanced template validation system
 */
class TemplateValidator {
  constructor() {
    this.rules = new Map();
    this._initializeDefaultRules();
  }

  /**
   * Initialize default validation rules
   * @private
   */
  _initializeDefaultRules() {
    // Type validators
    this.addRule('string', value => typeof value === 'string');
    this.addRule('number', value => typeof value === 'number' && !isNaN(value));
    this.addRule('boolean', value => typeof value === 'boolean');
    this.addRule('array', value => Array.isArray(value));
    this.addRule('object', value => typeof value === 'object' && value !== null && !Array.isArray(value));

    // Format validators
    this.addRule('email', value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    this.addRule('url', value => /^https?:\/\/.*/.test(value));
    this.addRule('date', value => !isNaN(Date.parse(value)));
    this.addRule('uuid', value => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
    
    // Range validators
    this.addRule('min', (value, min) => value >= min);
    this.addRule('max', (value, max) => value <= max);
    this.addRule('length', (value, length) => value.length === length);
    this.addRule('minLength', (value, min) => value.length >= min);
    this.addRule('maxLength', (value, max) => value.length <= max);
    
    // Pattern validators
    this.addRule('pattern', (value, pattern) => new RegExp(pattern).test(value));
    this.addRule('enum', (value, allowed) => allowed.includes(value));
  }

  /**
   * Add a custom validation rule
   * @param {string} name Rule name
   * @param {Function} validator Validation function
   */
  addRule(name, validator) {
    this.rules.set(name, validator);
  }

  /**
   * Create a validation schema
   * @param {Object} schema Validation schema
   * @returns {Function} Validation function
   */
  createSchema(schema) {
    return (value) => this.validate(value, schema);
  }

  /**
   * Validate a value against a schema
   * @param {any} value Value to validate
   * @param {Object} schema Validation schema
   * @returns {Object} Validation result
   */
  validate(value, schema) {
    const errors = [];

    for (const [rule, params] of Object.entries(schema)) {
      const validator = this.rules.get(rule);
      
      if (!validator) {
        errors.push(`Unknown validation rule: ${rule}`);
        continue;
      }

      if (!validator(value, params)) {
        errors.push(this._formatError(rule, params));
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Format validation error message
   * @private
   */
  _formatError(rule, params) {
    const messages = {
      string: 'Must be a string',
      number: 'Must be a number',
      boolean: 'Must be a boolean',
      array: 'Must be an array',
      object: 'Must be an object',
      email: 'Must be a valid email address',
      url: 'Must be a valid URL',
      date: 'Must be a valid date',
      uuid: 'Must be a valid UUID',
      min: `Must be at least ${params}`,
      max: `Must be at most ${params}`,
      length: `Must be exactly ${params} characters long`,
      minLength: `Must be at least ${params} characters long`,
      maxLength: `Must be at most ${params} characters long`,
      pattern: 'Must match the required pattern',
      enum: `Must be one of: ${Array.isArray(params) ? params.join(', ') : params}`
    };

    return messages[rule] || `Failed ${rule} validation`;
  }

  /**
   * Create a composite validator from multiple schemas
   * @param {Object[]} schemas List of validation schemas
   * @returns {Function} Composite validation function
   */
  compose(...schemas) {
    return (value) => {
      const results = schemas.map(schema => this.validate(value, schema));
      const errors = results.flatMap(result => result.errors);
      
      return {
        valid: errors.length === 0,
        errors
      };
    };
  }
}

export { TemplateValidator };
