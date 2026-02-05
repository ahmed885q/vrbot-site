/**
 * Windows Agent Service for Viking Rise
 * تكامل نظام Windows Agent مع تطبيق Next.js
 */

import { HumanBehaviorSimulator } from '../../../lib/HumanBehaviorSimulator';

export interface VikingWindow {
  pid: number;
  processName: string;
  title: string;
  hwnd: string;
  isVikingRise: boolean;
}

export interface VikingBot {
  id: string;
  name: string;
  windowTitle: string;
  deviceId: string;
  gameAccount: string;
  status: 'active' | 'inactive' | 'error';
  totalActions: number;
  successRate: number;
  lastActive?: string;
  settings: {
    autoShield: boolean;
    autoHelps: boolean;
    autoCollection: boolean;
  };
}

export interface VikingTaskResult {
  success: boolean;
  actions: any[];
  timestamp: string;
  botId: string;
  taskType: string;
}

export class WindowsAgentService {
  private baseUrl: string;
  private simulator: HumanBehaviorSimulator;

  constructor() {
    this.baseUrl = 'http://127.0.0.1:9797';
    this.simulator = new HumanBehaviorSimulator();
  }

  // Check if Windows Agent is running
  async isAgentAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.ok === true;
    } catch {
      return false;
    }
  }

  // Start the Viking Rise agent
  async startAgent(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/viking/start`, {
        method: 'POST'
      });
      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Failed to start agent:', error);
      return false;
    }
  }

  // Stop the Viking Rise agent
  async stopAgent(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/viking/stop`, {
        method: 'POST'
      });
      const data = await response.json();
      return data.ok === true;
    } catch (error) {
      console.error('Failed to stop agent:', error);
      return false;
    }
  }

  // Get agent status
  async getAgentStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/viking/status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get agent status:', error);
      return { ok: false, error: error.message };
    }
  }

  // Get all active bots
  async getBots(): Promise<VikingBot[]> {
    try {
      const response = await fetch(`${this.baseUrl}/viking/bots`);
      const data = await response.json();
      return data.bots || [];
    } catch (error) {
      console.error('Failed to get bots:', error);
      return [];
    }
  }

  // Execute a task on a specific bot
  async executeBotTask(botId: string, taskType: 'shield' | 'helps' | 'collection'): Promise<VikingTaskResult> {
    try {
      const response = await fetch(`${this.baseUrl}/viking/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ botId, taskType })
      });
      
      const data = await response.json();
      
      return {
        success: data.ok === true,
        actions: data.result?.actions || [],
        timestamp: new Date().toISOString(),
        botId,
        taskType
      };
    } catch (error) {
      console.error('Failed to execute task:', error);
      return {
        success: false,
        actions: [],
        timestamp: new Date().toISOString(),
        botId,
        taskType,
        error: error.message
      };
    }
  }

  // Get all detected Windows (including non-Viking)
  async getAllWindows(): Promise<VikingWindow[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/windows`);
      const data = await response.json();
      return data.windows || [];
    } catch (error) {
      console.error('Failed to get windows:', error);
      return [];
    }
  }

  // Manually create a bot for a window
  async createBotForWindow(windowTitle: string, settings?: any): Promise<VikingBot | null> {
    // In the full implementation, this would call the agent's API
    // For now, we'll simulate it
    const bot: VikingBot = {
      id: `bot-${Date.now()}`,
      name: `Bot-${windowTitle.substring(0, 10)}`,
      windowTitle,
      deviceId: `window-${Date.now()}`,
      gameAccount: 'Detecting...',
      status: 'active',
      totalActions: 0,
      successRate: 1.0,
      settings: {
        autoShield: true,
        autoHelps: true,
        autoCollection: true,
        ...settings
      }
    };

    // Try to detect account name via OCR (would be done by agent)
    try {
      // Simulate OCR delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, this would call the agent's OCR endpoint
      bot.gameAccount = `VikingPlayer-${Math.floor(Math.random() * 1000)}`;
      
    } catch {
      bot.gameAccount = 'Unknown';
    }

    return bot;
  }

  // Start task scheduler for a bot
  async scheduleBotTasks(botId: string, config: {
    shieldInterval?: number; // hours
    helpsInterval?: number; // hours
    collectionInterval?: number; // hours
  }): Promise<boolean> {
    // In full implementation, this would configure the agent's scheduler
    console.log(`Scheduling tasks for bot ${botId}:`, config);
    
    // Simulate successful scheduling
    return true;
  }

  // Get statistics
  async getStatistics(): Promise<any> {
    try {
      const status = await this.getAgentStatus();
      return status.statistics || {};
    } catch {
      return {};
    }
  }

  // Take screenshot of a bot's window
  async takeScreenshot(botId: string): Promise<string | null> {
    // In full implementation, this would call the agent's screenshot endpoint
    // For now, return a placeholder
    return `data:image/png;base64,placeholder-for-bot-${botId}`;
  }

  // Enhanced with HumanBehaviorSimulator
  async simulateHumanInteraction(botId: string, actions: any[]): Promise<any> {
    // Use the extended HumanBehaviorSimulator for human-like interactions
    const bot = (await this.getBots()).find(b => b.id === botId);
    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    // Use Viking Rise specific methods from the extended simulator
    const results = [];
    for (const action of actions) {
      switch (action.type) {
        case 'tap':
          // Use the vikingTap method from extended HumanBehaviorSimulator
          const tapResult = await (this.simulator as any).vikingTap(
            action.position,
            bot.deviceId
          );
          results.push(tapResult);
          break;
        case 'swipe':
          // Use the vikingSwipe method
          const swipeResult = await (this.simulator as any).vikingSwipe(
            action.start,
            action.end,
            action.duration,
            bot.deviceId
          );
          results.push(swipeResult);
          break;
      }
    }

    return results;
  }
}

// Singleton instance
export const windowsAgentService = new WindowsAgentService();