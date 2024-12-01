/**
 * Template system for window.ai prompts
 */
import { TemplateValidator } from './validation.js';

export class TemplateSystem {
  constructor(session) {
    this.session = session;
    this.templates = new Map();
    this.inheritance = new Map();
    this.validator = new TemplateValidator();
    this.schemas = new Map();
  }

  /**
   * Register a new template
   * @param {string} name Template name
   * @param {string} content Template content
   * @param {Object} [options={}] Template options
   * @param {Object} [options.defaults={}] Default values for template variables
   * @param {Object} [options.schema={}] Validation schema for template variables
   */
  register(name, content, options = {}) {
    const { defaults = {}, schema = {} } = options;
    
    this.templates.set(name, {
      content,
      variables: this._extractVariables(content),
      defaults
    });

    if (Object.keys(schema).length > 0) {
      this.schemas.set(name, schema);
    }
  }

  /**
   * Create a new template that inherits from a parent template
   * @param {string} name New template name
   * @param {string} parentName Parent template name
   * @param {Object} [options={}] Template options
   * @param {Object} [options.defaults={}] Default values for template variables
   * @param {Object} [options.schema={}] Additional validation schema for template variables
   */
  inherit(name, parentName, options = {}) {
    const { defaults = {}, schema = {} } = options;
    const parentTemplate = this.templates.get(parentName);
    if (!parentTemplate) {
      throw new Error(`Parent template "${parentName}" not found`);
    }

    // Store the inheritance relationship and defaults
    this.inheritance.set(name, parentName);
    this.templates.set(name, {
      defaults,
      variables: this._extractVariables(parentTemplate.content)
    });

    // Merge parent and child schemas if they exist
    const parentSchema = this.schemas.get(parentName) || {};
    if (Object.keys(schema).length > 0 || Object.keys(parentSchema).length > 0) {
      this.schemas.set(name, { ...parentSchema, ...schema });
    }
  }

  /**
   * Apply a template with given variables
   * @param {string} name Template name
   * @param {Object} variables Template variables
   * @returns {Promise<string>} Processed template
   */
  async apply(name, variables = {}) {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template "${name}" not found`);
    }

    // Get parent template if this is an inherited template
    const parentName = this.inheritance.get(name);
    if (parentName) {
      const parentTemplate = this.templates.get(parentName);
      
      // Combine parent's content with child's defaults and provided variables
      const allVariables = {
        ...(parentTemplate.defaults || {}),
        ...(template.defaults || {}),
        ...variables
      };

      // Validate variables if schema exists
      await this._validateVariables(name, allVariables);

      // Replace variables in parent's content
      return this._replaceVariables(parentTemplate.content, allVariables);
    }

    // Handle non-inherited template
    const finalVars = {
      ...(template.defaults || {}),
      ...variables
    };

    // Validate all required variables are present
    for (const varName of template.variables) {
      if (finalVars[varName] === undefined) {
        throw new Error(`Missing required parameter: ${varName}`);
      }
    }

    // Validate variables if schema exists
    await this._validateVariables(name, finalVars);

    // Replace variables in template
    return this._replaceVariables(template.content, finalVars);
  }

  /**
   * Create a function that applies a template with given variables
   * @param {string} name Template name
   * @returns {function} Instantiated template
   */
  instantiate(name) {
    return (...vars) => this.apply(name, ...vars);
  }

  /**
   * Add validation schema for a template
   * @param {string} name Template name
   * @param {Object} schema Validation schema
   */
  addSchema(name, schema) {
    if (!this.templates.has(name)) {
      throw new Error(`Template "${name}" not found`);
    }
    this.schemas.set(name, schema);
  }

  /**
   * Add a custom validation rule
   * @param {string} name Rule name
   * @param {Function} validator Validation function
   */
  addValidationRule(name, validator) {
    this.validator.addRule(name, validator);
  }

  /**
   * Validate template variables against schema
   * @param {string} name Template name
   * @param {Object} variables Template variables
   * @private
   */
  async _validateVariables(name, variables) {
    const schema = this.schemas.get(name);
    if (!schema) return;

    const errors = [];
    for (const [varName, varSchema] of Object.entries(schema)) {
      if (variables[varName] !== undefined) {
        const result = this.validator.validate(variables[varName], varSchema);
        if (!result.valid) {
          errors.push(`Variable "${varName}": ${result.errors.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Template validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Extract variables from template content
   * @private
   */
  _extractVariables(content) {
    const matches = content.match(/\{([^}]+)\}/g) || [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  }

  /**
   * Replace variables in template content
   * @private
   */
  _replaceVariables(content, variables) {
    return content.replace(/\{([^}]+)\}/g, (match, key) => {
      return variables[key] === undefined ? match : variables[key];
    });
  }

  /**
   * Get template information
   * @param {string} name Template name
   * @returns {Object} Template information
   */
  getTemplateInfo(name) {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template "${name}" not found`);
    }

    return {
      variables: template.variables,
      defaults: template.defaults,
      schema: this.schemas.get(name),
      inherits: this.inheritance.get(name)
    };
  }
}
