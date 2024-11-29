/**
 * Enhanced template system with inheritance and validation
 */
export class TemplateSystem {
  constructor(session) {
    this.session = session;
    this.templates = new Map();
    this.inheritance = new Map();
  }

  /**
   * Register a new template
   * @param {string} name Template name
   * @param {string} content Template content
   * @param {Object} options Template options
   */
  register(name, content, options = {}) {
    const template = {
      content,
      variables: this._extractVariables(content),
      parent: options.extends,
      validation: options.validation || {},
      formatters: options.formatters || {},
      version: options.version || '1.0.0'
    };

    this.templates.set(name, template);
    if (template.parent) {
      this.inheritance.set(name, template.parent);
    }
  }

  /**
   * Apply a template with given variables
   * @param {string} name Template name
   * @param {Object} variables Template variables
   * @returns {string} Processed template
   */
  async apply(name, variables = {}) {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template "${name}" not found`);
    }

    // Get inherited content
    let content = template.content;
    if (template.parent) {
      const parentContent = await this.apply(template.parent, variables);
      content = this._mergeTemplates(parentContent, content);
    }

    // Validate variables
    this._validateVariables(template, variables);

    // Apply formatters
    const formattedVars = this._applyFormatters(template, variables);

    // Replace variables
    return this._replaceVariables(content, formattedVars);
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
   * Validate variables against template schema
   * @private
   */
  _validateVariables(template, variables) {
    for (const [key, schema] of Object.entries(template.validation)) {
      const value = variables[key];
      
      if (schema.required && value === undefined) {
        throw new Error(`Missing required variable "${key}"`);
      }

      if (value !== undefined) {
        if (schema.type && typeof value !== schema.type) {
          throw new Error(`Invalid type for "${key}": expected ${schema.type}`);
        }

        if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
          throw new Error(`Invalid format for "${key}"`);
        }

        if (schema.validate && !schema.validate(value)) {
          throw new Error(`Validation failed for "${key}"`);
        }
      }
    }
  }

  /**
   * Apply formatters to variables
   * @private
   */
  _applyFormatters(template, variables) {
    const formatted = { ...variables };
    
    for (const [key, formatter] of Object.entries(template.formatters)) {
      if (formatted[key] !== undefined) {
        formatted[key] = formatter(formatted[key]);
      }
    }

    return formatted;
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
   * Merge parent and child templates
   * @private
   */
  _mergeTemplates(parent, child) {
    // Simple block-based inheritance
    const blocks = {};
    
    // Extract blocks from child
    child = child.replace(/\{% block ([^%]+) %\}([\s\S]*?)\{% endblock %\}/g, (_, name, content) => {
      blocks[name] = content.trim();
      return `{block:${name}}`;
    });

    // Replace blocks in parent
    return parent.replace(/\{% block ([^%]+) %\}([\s\S]*?)\{% endblock %\}/g, (_, name, defaultContent) => {
      return blocks[name] || defaultContent.trim();
    });
  }
}
