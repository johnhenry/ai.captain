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
   * @param {Object} [defaults={}] Default values for template variables
   */
  register(name, content, defaults = {}) {
    this.templates.set(name, {
      content,
      variables: this._extractVariables(content),
      defaults
    });
  }

  /**
   * Create a new template that inherits from a parent template
   * @param {string} name New template name
   * @param {string} parentName Parent template name
   * @param {Object} [defaults={}] Default values for template variables
   */
  inherit(name, parentName, defaults = {}) {
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
