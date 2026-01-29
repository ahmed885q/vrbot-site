// HumanBehaviorSimulator.ts
export interface BehaviorPattern {
  id: string;
  name: string;
  description: string;
  delayRange: [number, number]; // [min, max] in ms
  accuracy: number; // 0-1
  errorRate: number; // 0-1
  active: boolean;
}

export interface MouseMovement {
  start: { x: number; y: number };
  end: { x: number; y: number };
  path: { x: number; y: number; time: number }[];
  duration: number;
  accuracy: number;
}

export interface TypingPattern {
  text: string;
  speed: number; // characters per minute
  errors: number;
  backspaces: number;
  duration: number;
}

class HumanBehaviorSimulator {
  private patterns: BehaviorPattern[];
  private currentPattern: BehaviorPattern;
  private mouseHistory: MouseMovement[];
  private typingHistory: TypingPattern[];
  private behaviorScore: number;

  constructor() {
    this.patterns = [
      {
        id: 'careful',
        name: 'دقيق وحريص',
        description: 'حركات بطيئة ودقيقة، أخطاء قليلة',
        delayRange: [1000, 3000],
        accuracy: 0.95,
        errorRate: 0.02,
        active: false
      },
      {
        id: 'average',
        name: 'طبيعي ومتوسط',
        description: 'سرعة متوسطة، أخطاء عادية',
        delayRange: [500, 1500],
        accuracy: 0.85,
        errorRate: 0.05,
        active: true
      },
      {
        id: 'fast',
        name: 'سريع وخبير',
        description: 'حركات سريعة، دقة متوسطة',
        delayRange: [200, 800],
        accuracy: 0.75,
        errorRate: 0.08,
        active: false
      },
      {
        id: 'erratic',
        name: 'غير منتظم',
        description: 'توقيتات غير متوقعة، أخطاء متكررة',
        delayRange: [100, 5000],
        accuracy: 0.6,
        errorRate: 0.15,
        active: false
      }
    ];

    this.currentPattern = this.patterns[1]; // النمط المتوسط افتراضيًا
    this.mouseHistory = [];
    this.typingHistory = [];
    this.behaviorScore = 75;
  }

  // تعيين النمط الحالي
  setPattern(patternId: string): boolean {
    const pattern = this.patterns.find(p => p.id === patternId);
    if (pattern) {
      // تعطيل جميع الأنماط الأخرى
      this.patterns.forEach(p => p.active = false);
      
      // تفعيل النمط المطلوب
      pattern.active = true;
      this.currentPattern = pattern;
      
      this.updateBehaviorScore();
      return true;
    }
    return false;
  }

  // محاكاة تأخير بشري
  async simulateDelay(customDelay?: number): Promise<void> {
    const delay = customDelay || this.getRandomDelay();
    
    // إضافة اختلافات بسيطة في التأخير
    const jitter = (Math.random() - 0.5) * delay * 0.1;
    const finalDelay = Math.max(100, delay + jitter);
    
    return new Promise(resolve => setTimeout(resolve, finalDelay));
  }

  // محاكاة حركة الماوس البشرية
  async simulateMouseMove(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number
  ): Promise<MouseMovement> {
    const startTime = Date.now();
    const movement: MouseMovement = {
      start: { x: startX, y: startY },
      end: { x: targetX, y: targetY },
      path: [],
      duration: 0,
      accuracy: this.currentPattern.accuracy
    };

    // حساب المسار المنحني (ليس خطًا مستقيمًا)
    const steps = 10 + Math.floor(Math.random() * 10);
    const controlPoints = this.generateBezierPoints(
      startX, startY,
      startX + (targetX - startX) / 2 + (Math.random() - 0.5) * 100,
      startY + (targetY - startY) / 2 + (Math.random() - 0.5) * 100,
      targetX, targetY
    );

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.calculateBezierPoint(controlPoints, t);
      
      // إضافة اهتزاز طبيعي
      point.x += (Math.random() - 0.5) * 3;
      point.y += (Math.random() - 0.5) * 3;
      
      movement.path.push({
        x: point.x,
        y: point.y,
        time: Date.now()
      });

      // تأخير بين كل نقطة
      await this.simulateDelay(20);
    }

    // النهاية قد لا تكون دقيقة 100% (مثل البشر)
    if (Math.random() > this.currentPattern.accuracy) {
      const offsetX = (Math.random() - 0.5) * 15;
      const offsetY = (Math.random() - 0.5) * 15;
      movement.end.x = targetX + offsetX;
      movement.end.y = targetY + offsetY;
    }

    movement.duration = Date.now() - startTime;
    this.mouseHistory.push(movement);
    
    this.updateBehaviorScore();
    
    return movement;
  }

  // محاكاة النقر البشري
  async simulateClick(
    element?: HTMLElement,
    clickType: 'left' | 'right' | 'middle' = 'left'
  ): Promise<boolean> {
    // تأخير قبل النقر
    await this.simulateDelay();
    
    // احتمال الخطأ البشري
    if (Math.random() < this.currentPattern.errorRate) {
      // محاكاة الخطأ: نقر في المكان الخطأ
      await this.simulateDelay(300);
      
      // محاولة التصحيح
      if (Math.random() > 0.3) {
        // النقر الصحيح في المحاولة الثانية
        await this.simulateDelay(200);
        return true;
      }
      return false;
    }
    
    // تنفيذ النقر
    return true;
  }

  // محاكاة الكتابة البشرية
  async simulateTyping(text: string): Promise<TypingPattern> {
    const startTime = Date.now();
    const pattern: TypingPattern = {
      text,
      speed: 0,
      errors: 0,
      backspaces: 0,
      duration: 0
    };

    const chars = text.split('');
    let typedText = '';
    
    for (let i = 0; i < chars.length; i++) {
      // تأخير بين الأحرف (غير منتظم)
      const baseDelay = 50 + Math.random() * 150;
      await this.simulateDelay(baseDelay);
      
      // احتمال خطأ في الكتابة
      if (Math.random() < this.currentPattern.errorRate * 0.5) {
        const wrongChar = this.getRandomChar();
        typedText += wrongChar;
        pattern.errors++;
        
        // تأخير قبل التصحيح
        await this.simulateDelay(100 + Math.random() * 200);
        
        // مسح الخطأ
        typedText = typedText.slice(0, -1);
        pattern.backspaces++;
        
        // كتابة الحرف الصحيح
        await this.simulateDelay(50 + Math.random() * 100);
        typedText += chars[i];
      } else {
        typedText += chars[i];
      }
      
      // استراحة بعد الكلمات الطويلة
      if (chars[i] === ' ' && Math.random() < 0.1) {
        await this.simulateDelay(200 + Math.random() * 600);
      }
    }
    
    pattern.duration = Date.now() - startTime;
    pattern.speed = (text.length / pattern.duration) * 60000; // حرف في الدقيقة
    
    this.typingHistory.push(pattern);
    this.updateBehaviorScore();
    
    return pattern;
  }

  // محاكاة حركات عشوائية (للتمويه)
  async simulateRandomActivity(): Promise<void> {
    const activities = [
      () => this.simulateMouseMove(100, 100, 300, 300),
      () => this.simulateDelay(500 + Math.random() * 1500),
      () => this.simulateTyping('test'),
      () => this.simulateClick()
    ];
    
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    await randomActivity();
  }

  // توليد نقاط بيزير للمسار المنحني
  private generateBezierPoints(
    startX: number, startY: number,
    controlX: number, controlY: number,
    endX: number, endY: number
  ): { x: number; y: number }[] {
    return [
      { x: startX, y: startY },
      { x: controlX, y: controlY },
      { x: endX, y: endY }
    ];
  }

  // حساب نقطة على منحنى بيزير
  private calculateBezierPoint(
    points: { x: number; y: number }[],
    t: number
  ): { x: number; y: number } {
    if (points.length === 1) return points[0];
    
    const newPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      newPoints.push({
        x: points[i].x * (1 - t) + points[i + 1].x * t,
        y: points[i].y * (1 - t) + points[i + 1].y * t
      });
    }
    
    return this.calculateBezierPoint(newPoints, t);
  }

  // الحصول على تأخير عشوائي حسب النمط
  private getRandomDelay(): number {
    const [min, max] = this.currentPattern.delayRange;
    return min + Math.random() * (max - min);
  }

  // تحديث درجة السلوك
  private updateBehaviorScore(): void {
    // حساب متوسط الدقة
    const mouseAccuracy = this.mouseHistory.length > 0
      ? this.mouseHistory.reduce((sum, m) => sum + m.accuracy, 0) / this.mouseHistory.length
      : 0.8;
    
    // حساب معدل الأخطاء في الكتابة
    const typingErrorRate = this.typingHistory.length > 0
      ? this.typingHistory.reduce((sum, t) => sum + (t.errors / t.text.length), 0) / this.typingHistory.length
      : 0.05;
    
    // حساب درجة السلوك (0-100)
    const accuracyScore = mouseAccuracy * 40; // 40% للدقة
    const errorScore = (1 - Math.min(typingErrorRate * 10, 1)) * 30; // 30% لقلة الأخطاء
    const patternScore = 30; // 30% لاختيار النمط المناسب
    
    this.behaviorScore = Math.min(100, accuracyScore + errorScore + patternScore);
  }

  // الحصول على حرف عشوائي
  private getRandomChar(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
  }

  // الحصول على الإحصائيات
  getStats() {
    return {
      behaviorScore: Math.round(this.behaviorScore),
      currentPattern: this.currentPattern.name,
      totalMouseMovements: this.mouseHistory.length,
      totalTypingActions: this.typingHistory.length,
      averageAccuracy: this.mouseHistory.length > 0
        ? this.mouseHistory.reduce((sum, m) => sum + m.accuracy, 0) / this.mouseHistory.length
        : 0,
      availablePatterns: this.patterns.map(p => ({
        id: p.id,
        name: p.name,
        active: p.active
      }))
    };
  }

  // الحصول على آخر حركات الماوس
  getRecentMouseMovements(limit: number = 5): MouseMovement[] {
    return this.mouseHistory.slice(-limit);
  }

  // الحصول على آخر أنماط الكتابة
  getRecentTypingPatterns(limit: number = 5): TypingPattern[] {
    return this.typingHistory.slice(-limit);
  }
}

export default HumanBehaviorSimulator;