/**
 * Template system for Window.ai prompts
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
   * @param {Object|string} options Template options or parent template name
   */
  register(name, content, options = {}) {
    // Handle template inheritance
    if (typeof options === 'string') {
      const parentName = options;
      const defaults = arguments[3] || {};
      const parentTemplate = this.templates.get(parentName);
      if (!parentTemplate) {
        throw new Error(`Parent template "${parentName}" not found`);
      }

      // Create new template with parent's content and default values
      const template = {
        content: parentTemplate.content,
        variables: parentTemplate.variables,
        defaults
      };

      this.templates.set(name, template);
      this.inheritance.set(name, parentName);
      return;
    }

    // Direct template registration
    this.templates.set(name, {
      content,
      variables: this._extractVariables(content),
      defaults: options
    });
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

    // Combine defaults with provided variables
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

    // Replace variables in template
    return this._replaceVariables(template.content, finalVars);
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
}
