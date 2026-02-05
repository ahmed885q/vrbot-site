export class HumanBehaviorSimulator {
  private patterns = [
    { id: 'average', name: 'طبيعي', active: true },
    { id: 'careful', name: 'دقيق', active: false },
    { id: 'fast', name: 'سريع', active: false }
  ];

  async simulateDelay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async simulateHumanClick() {
    await this.simulateDelay(500 + Math.random() * 1000);
    return true;
  }

  async simulateMouseMove(startX: number, startY: number, endX: number, endY: number) {
    console.log(`🖱️ محاكاة حركة الماوس من (${startX},${startY}) إلى (${endX},${endY})`);
    await this.simulateDelay(200);
    return { success: true };
  }

  async simulateTyping(text: string) {
    for (let i = 0; i < text.length; i++) {
      await this.simulateDelay(50 + Math.random() * 100);
    }
    return { duration: text.length * 75 };
  }

  setPattern(patternId: string) {
    this.patterns.forEach(p => p.active = p.id === patternId);
    console.log(`🎭 تم تغيير النمط إلى: ${patternId}`);
    return true;
  }

  getStats() {
    return {
      behaviorScore: 85,
      currentPattern: this.patterns.find(p => p.active)?.name || 'طبيعي',
      availablePatterns: this.patterns
    };
  }
}

export default HumanBehaviorSimulator;