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
    
    const variables = this._extractVariables(content);
    this.templates.set(name, {
      content,
      variables,
      defaults,
      parent: null
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

    // Create child template with reference to parent
    this.templates.set(name, {
      content: parentTemplate.content, // Use parent's content
      variables: [...parentTemplate.variables], // Copy parent's variables
      defaults: {
        ...parentTemplate.defaults, // Include parent's defaults first
        ...defaults // Then override with child's defaults
      },
      parent: parentName // Store reference to parent
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

    // Get complete chain of templates through inheritance
    const templateChain = this._getTemplateChain(name);
    
    // Merge variables from all templates in the chain, starting from the root
    const finalVars = templateChain.reduce((vars, templateName) => {
      const currentTemplate = this.templates.get(templateName);
      return {
        ...vars,
        ...currentTemplate.defaults
      };
    }, {});

    // Override with provided variables last
    Object.assign(finalVars, variables);

    // Get all required variables from the entire template chain
    const allRequiredVars = new Set();
    for (const templateName of templateChain) {
      const currentTemplate = this.templates.get(templateName);
      currentTemplate.variables.forEach(v => allRequiredVars.add(v));
    }

    // Check for missing variables
    const missingVars = Array.from(allRequiredVars)
      .filter(varName => finalVars[varName] === undefined);
    if (missingVars.length > 0) {
      throw new Error(`Missing required parameters: ${missingVars.join(', ')}`);
    }

    // Validate variables if schema exists
    await this._validateVariables(name, finalVars);

    // Replace variables in template
    return this._replaceVariables(template.content, finalVars);
  }

  /**
   * Get the chain of templates through inheritance
   * @private
   */
  _getTemplateChain(name) {
    const chain = [];
    let currentName = name;
    
    while (currentName) {
      if (chain.includes(currentName)) {
        throw new Error(`Circular inheritance detected: ${chain.join(' -> ')} -> ${currentName}`);
      }
      chain.unshift(currentName); // Add to start of array to maintain inheritance order
      const template = this.templates.get(currentName);
      currentName = template.parent;
    }
    
    return chain;
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
    // Get all schemas in the inheritance chain
    const templateChain = this._getTemplateChain(name);
    const schemas = templateChain
      .map(templateName => this.schemas.get(templateName))
      .filter(Boolean);

    // Validate against all schemas
    for (const schema of schemas) {
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
      content: template.content,
      variables: template.variables,
      defaults: template.defaults,
      schema: this.schemas.get(name),
      parent: template.parent,
      inheritance: this._getTemplateChain(name)
    };
  }
}
