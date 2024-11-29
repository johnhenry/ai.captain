/**
 * Advanced composition chains for common patterns
 */
export class CompositionChains {
  constructor(session) {
    this.session = session;
  }

  /**
   * Create a chain for processing prompts with retries and fallbacks
   * @returns {Function} Chained prompt processor
   */
  createPromptChain() {
    return new CompositionBuilder(this.session)
      .pipe(async (input) => {
        // Validate input
        if (!input || typeof input !== 'string') {
          throw new Error('Invalid prompt input');
        }
        return input;
      })
      .pipe(async (input) => {
        // Try primary model
        try {
          return await this.session.prompt(input);
        } catch (error) {
          throw new Error(`Primary model failed: ${error.message}`);
        }
      })
      .retry({
        maxAttempts: 3,
        delay: 1000,
        backoff: 'exponential'
      })
      .catch(async (error, input) => {
        // Fallback to a different model or configuration
        const fallbackSession = await this.session.clone({
          temperature: 0.5,  // More conservative settings
          topK: 1
        });
        return await fallbackSession.prompt(input);
      })
      .build();
  }

  /**
   * Create a chain for streaming responses with backpressure
   * @returns {Function} Chained streaming processor
   */
  createStreamingChain() {
    return new CompositionBuilder(this.session)
      .pipe(async function* (input) {
        const stream = await this.session.promptStreaming(input);
        for await (const chunk of stream) {
          yield chunk;
          // Add backpressure
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      })
      .retry({
        maxAttempts: 2,
        condition: error => error.message.includes('stream')
      })
      .build();
  }

  /**
   * Create a chain for batch processing
   * @returns {Function} Chained batch processor
   */
  createBatchChain() {
    return new CompositionBuilder(this.session)
      .pipe(async (inputs) => {
        if (!Array.isArray(inputs)) {
          throw new Error('Batch input must be an array');
        }
        return inputs;
      })
      .parallel(inputs => 
        inputs.map(input => this.session.prompt(input))
      )
      .timeout(30000)  // 30 second timeout for batch
      .catch(async (error, inputs) => {
        // Process sequentially if parallel fails
        const results = [];
        for (const input of inputs) {
          try {
            results.push(await this.session.prompt(input));
          } catch (e) {
            results.push(`Error: ${e.message}`);
          }
        }
        return results;
      })
      .build();
  }

  /**
   * Create a chain for semantic search
   * @returns {Function} Chained semantic searcher
   */
  createSearchChain() {
    return new CompositionBuilder(this.session)
      .pipe(async (query) => {
        // Generate search embedding
        const embedding = await this.session.prompt(`
          Convert the following query into a semantic embedding:
          ${query}
        `);
        return { query, embedding };
      })
      .pipe(async ({ query, embedding }) => {
        // Perform semantic search
        const results = await this.session.prompt(`
          Find relevant information for:
          Query: ${query}
          Embedding: ${embedding}
        `);
        return { query, results };
      })
      .retry({
        maxAttempts: 2,
        delay: 500
      })
      .build();
  }

  /**
   * Create a chain for conversation management
   * @returns {Function} Chained conversation manager
   */
  createConversationChain() {
    const history = [];
    
    return new CompositionBuilder(this.session)
      .use(async (input) => {
        // Add input to history
        history.push({ role: 'user', content: input });
        return { input, history };
      })
      .pipe(async ({ input, history }) => {
        // Generate response with context
        const response = await this.session.prompt(`
          Previous conversation:
          ${history.map(h => `${h.role}: ${h.content}`).join('\n')}
          
          Current input: ${input}
        `);
        
        // Add response to history
        history.push({ role: 'assistant', content: response });
        return response;
      })
      .timeout(10000)
      .build();
  }

  /**
   * Create a chain for content generation with validation
   * @returns {Function} Chained content generator
   */
  createContentChain() {
    return new CompositionBuilder(this.session)
      .pipe(async ({ prompt, schema }) => {
        // Generate content
        const content = await this.session.prompt(prompt);
        return { content, schema };
      })
      .pipe(async ({ content, schema }) => {
        // Validate against schema
        const validation = await this.session.prompt(`
          Validate the following content against the schema:
          Content: ${content}
          Schema: ${JSON.stringify(schema)}
        `);
        
        if (validation.includes('invalid')) {
          throw new Error(`Content validation failed: ${validation}`);
        }
        
        return content;
      })
      .retry({
        maxAttempts: 3,
        condition: error => error.message.includes('validation')
      })
      .build();
  }
}
