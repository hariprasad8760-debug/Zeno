/* =============================================================================
   Zeno AI Provider Manager
   Handles active provider selection and custom API Keys in localStorage.
   ============================================================================= */

window.ZenoProviders = {
  getProviders() {
    return [
      { id: 'gemini', name: 'Gemini API', defaultModel: 'gemini-3.5-flash' },
      { id: 'openrouter', name: 'OpenRouter API', defaultModel: 'mistralai/mistral-7b-instruct' },
      { id: 'groq', name: 'Groq API', defaultModel: 'llama-3.1-8b-instant' },
      { id: 'openai', name: 'OpenAI API', defaultModel: 'gpt-4o-mini' },
      { id: 'cohere', name: 'Cohere API', defaultModel: 'command-r' }
    ];
  },

  getActiveProvider() {
    return localStorage.getItem('zeno_active_provider') || 'groq';
  },

  setActiveProvider(providerId) {
    localStorage.setItem('zeno_active_provider', providerId);
  },

  getAPIKey(providerId) {
    return localStorage.getItem(`zeno_key_${providerId}`) || '';
  },

  setAPIKey(providerId, key) {
    localStorage.setItem(`zeno_key_${providerId}`, key);
  },

  async testConnection(providerId, customKey) {
    const key = customKey !== undefined ? customKey : this.getAPIKey(providerId);
    return await window.ZenoAPI.testProviderConnection(providerId, key);
  }
};
