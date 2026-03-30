import type { Media } from "../../types/index.js";

/**
 * Plugin lifecycle hook context
 */
export interface PluginContext {
  media?: Media;
  file?: Buffer;
  fileName?: string;
  mimeType?: string;
  model?: string;
  modelId?: string;
  collection?: string;
  metadata?: Record<string, any>;
  transformations?: any[];
  [key: string]: any;
}

/**
 * Core plugin interface
 */
export interface MediaPlugin {
  name: string;
  version?: string;
  description?: string;

  /**
   * Called before media is uploaded/processed
   */
  beforeUpload?(context: PluginContext): Promise<void>;

  /**
   * Called after media is successfully uploaded
   */
  afterUpload?(context: PluginContext): Promise<void>;

  /**
   * Called before media is deleted
   */
  beforeDelete?(context: PluginContext): Promise<void>;

  /**
   * Called after media is successfully deleted
   */
  afterDelete?(context: PluginContext): Promise<void>;

  /**
   * Custom plugin configuration validation
   */
  validate?(config: Record<string, any>): Promise<void>;
}

/**
 * Plugin metadata stored in registry
 */
export interface PluginMetadata {
  name: string;
  version: string;
  plugin: MediaPlugin;
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Plugin registry and manager
 */
export class PluginRegistry {
  private plugins: Map<string, PluginMetadata> = new Map();

  /**
   * Register a plugin
   */
  register(
    plugin: MediaPlugin,
    config: Record<string, any> = {},
    enabled: boolean = true,
  ): void {
    const name = plugin.name;

    if (this.plugins.has(name)) {
      throw new Error(`Plugin '${name}' is already registered.`);
    }

    this.plugins.set(name, {
      name,
      version: plugin.version ?? "0.0.0",
      plugin,
      config,
      enabled,
    });
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): void {
    this.plugins.delete(name);
  }

  /**
   * Get plugin by name
   */
  get(name: string): PluginMetadata | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   */
  getAll(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabled(): PluginMetadata[] {
    return Array.from(this.plugins.values()).filter((p) => p.enabled);
  }

  /**
   * Enable/disable a plugin
   */
  setEnabled(name: string, enabled: boolean): void {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found.`);
    }
    plugin.enabled = enabled;
  }

  /**
   * Update plugin configuration
   */
  setConfig(name: string, config: Record<string, any>): void {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found.`);
    }
    plugin.config = { ...plugin.config, ...config };
  }

  /**
   * Execute hook across all enabled plugins
   */
  async executeHook(
    hookName: keyof MediaPlugin,
    context: PluginContext,
  ): Promise<void> {
    const enabledPlugins = this.getEnabled();

    for (const metadata of enabledPlugins) {
      const hook = metadata.plugin[hookName];

      if (hook && typeof hook === "function") {
        try {
          await hook.call(metadata.plugin, context);
        } catch (error) {
          throw new Error(
            `Plugin '${metadata.name}' hook '${String(hookName)}' failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
  }
}

export default PluginRegistry;
