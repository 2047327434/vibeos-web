/* ============================================
   VibeOS Config - User Configuration
   ============================================ */

const VibeOSConfig = {
  // LLM Configuration
  llm: {
    /** Provider: 'openai' | 'anthropic' | 'custom' | 'mock' */
    provider: 'openai',
    /** OpenAI-compatible API endpoint (configure in Settings app) */
    apiEndpoint: '',
    /** API Key (configure in Settings app, stored in localStorage only) */
    apiKey: '',
    /** Model identifier (configure in Settings app) */
    model: '',
    /** Maximum tokens in response */
    maxTokens: 65536,
    /** Temperature (0-2) */
    temperature: 0.3,
    /** Timeout in milliseconds */
    timeout: 120000,
  },

  // Desktop Configuration
  desktop: {
    /** Wallpaper type: 'gradient' | 'image' | 'solid' */
    wallpaperType: 'gradient',
    /** Wallpaper URL (when type is 'image') */
    wallpaperUrl: '',
    /** Solid color (when type is 'solid') */
    wallpaperColor: '#1a365d',
    /** Theme: 'light' | 'dark' */
    theme: 'light',
    /** Language */
    language: 'zh-CN',
  },

  // Window Defaults
  window: {
    defaultWidth: 800,
    defaultHeight: 520,
    minWidth: 320,
    minHeight: 240,
  },

  // App Cache (minutes, 0 = no cache)
  appCacheExpiry: 1440, // 24 hours

  /** Load config from localStorage */
  load() {
    try {
      const saved = localStorage.getItem('vibeos_config');
      if (saved) {
        const data = JSON.parse(saved);
        // Only merge non-empty values (preserve hardcoded defaults)
        if (data.llm) {
          if (data.llm.provider) this.llm.provider = data.llm.provider;
          if (data.llm.apiEndpoint && data.llm.apiEndpoint.length > 10) this.llm.apiEndpoint = data.llm.apiEndpoint.replace(/\/+$/, '');
          if (data.llm.apiKey && data.llm.apiKey.length > 10) this.llm.apiKey = data.llm.apiKey;
          if (data.llm.model && data.llm.model.length > 1) this.llm.model = data.llm.model;
          if (data.llm.maxTokens) this.llm.maxTokens = data.llm.maxTokens;
          if (data.llm.temperature !== undefined) this.llm.temperature = data.llm.temperature;
          if (data.llm.timeout && data.llm.timeout > 1000) this.llm.timeout = data.llm.timeout;
        }
        if (data.desktop) Object.assign(this.desktop, data.desktop);
        if (data.window) Object.assign(this.window, data.window);
        if (data.appCacheExpiry !== undefined) this.appCacheExpiry = data.appCacheExpiry;
      }
    } catch (e) {
      console.warn('Failed to load config:', e);
    }
    // Log current state for debugging
    console.log('[Config] provider:', this.llm.provider, 'endpoint:', this.llm.apiEndpoint, 'model:', this.llm.model, 'hasKey:', !!this.llm.apiKey);
  },

  /** Save config to localStorage */
  save() {
    try {
      localStorage.setItem('vibeos_config', JSON.stringify({
        llm: this.llm,
        desktop: this.desktop,
        window: this.window,
        appCacheExpiry: this.appCacheExpiry,
      }));
    } catch (e) {
      console.warn('Failed to save config:', e);
    }
  },

  /** Check if LLM is configured */
  isLLMConfigured() {
    return this.llm.provider !== 'mock' && this.llm.apiKey.length > 0;
  },
};
