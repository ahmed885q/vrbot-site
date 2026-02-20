export class BanProtectionSystem {
  private warningSigns: string[] = [];
  private protectionActive = true;
  
  // علامات التحذير من البان المحتمل
  private banWarningIndicators = [
    { indicator: 'تسجيل دخول مفاجئ من موقع جديد', severity: 'medium' },
    { indicator: 'نشاط مكثف بعد فترة خمول', severity: 'high' },
    { indicator: 'طلبات متكررة بنمط ثابت', severity: 'high' },
    { indicator: 'تغييرات سريعة في الإعدادات', severity: 'low' },
    { indicator: 'استخدام أوامر غير اعتيادية', severity: 'medium' }
  ];
  
  // =============== VIKING RISE EXTENSION ===============
  private vikingBanIndicators = [
    { indicator: 'تطبيق درع بنفس التوقيت يومياً', severity: 'medium' },
    { indicator: 'إرسال مساعدات بنمط رياضي دقيق', severity: 'high' },
    { indicator: 'نقرات متطابقة في نفس الإحداثيات', severity: 'critical' },
    { indicator: 'جلسة لعب متواصلة أكثر من 4 ساعات', severity: 'high' },
    { indicator: 'عدم وجود أخطاء بشرية في النقر', severity: 'medium' },
    { indicator: 'توقيتات دقيقة بين الإجراءات', severity: 'high' }
  ];
  
  private vikingActivityHistory: VikingRiseActivity[] = [];
  // =====================================================
  
  // =============== VIKING RISE MONITORING ===============
  monitorVikingRiseActivity(activity: VikingRiseActivity): VikingBanRiskAssessment {
    this.vikingActivityHistory.push(activity);
    
    // الحفاظ على آخر 100 نشاط فقط
    if (this.vikingActivityHistory.length > 100) {
      this.vikingActivityHistory = this.vikingActivityHistory.slice(-100);
    }
    
    const riskFactors: RiskFactor[] = [];
    let totalRiskScore = 0;
    
    // تحليل أنشطة Viking Rise المحددة
    if (activity.tapsPerMinute > 150) {
      riskFactors.push({
        factor: 'معدل نقرات مرتفع جداً في Viking Rise',
        score: 35,
        suggestion: 'خفض سرعة النقر إلى أقل من 100/دقيقة'
      });
      totalRiskScore += 35;
    }
    
    if (activity.patternConsistency > 0.85) {
      riskFactors.push({
        factor: 'نمط متكرر جداً في أنشطة Viking Rise',
        score: 45,
        suggestion: 'إضافة عشوائية في توقيتات وتتابع المهام'
      });
      totalRiskScore += 45;
    }
    
    if (activity.identicalActionsCount > 3) {
      riskFactors.push({
        factor: 'إجراءات متطابقة بشكل كامل في Viking Rise',
        score: 50,
        suggestion: 'تغيير إحداثيات النقر ومسارات السحب'
      });
      totalRiskScore += 50;
    }
    
    if (activity.sessionDurationHours > 6) {
      riskFactors.push({
        factor: 'جلسة Viking Rise طويلة جداً',
        score: 40,
        suggestion: 'تقسيم الجلسة إلى فترات مع استراحات'
      });
      totalRiskScore += 40;
    }
    
    if (activity.noHumanErrors && activity.totalActions > 20) {
      riskFactors.push({
        factor: 'غياب تام للأخطاء البشرية في Viking Rise',
        score: 30,
        suggestion: 'إضافة أخطاء بشرية طبيعية بنسبة 2-5%'
      });
      totalRiskScore += 30;
    }
    
    // تحليل الأنماط الزمنية
    const timePatternScore = this.analyzeTimePatterns(this.vikingActivityHistory);
    if (timePatternScore > 20) {
      riskFactors.push({
        factor: 'أنماط زمنية منتظمة يمكن اكتشافها',
        score: timePatternScore,
        suggestion: 'تغيير أوقات تنفيذ المهام بشكل عشوائي'
      });
      totalRiskScore += timePatternScore;
    }
    
    // تقييم المخاطر
    const riskLevel = this.calculateVikingRiskLevel(totalRiskScore);
    
    return {
      timestamp: new Date(),
      riskScore: totalRiskScore,
      riskLevel,
      factors: riskFactors,
      recommendations: this.generateVikingRecommendations(riskLevel, riskFactors),
      protectionActions: this.determineVikingProtectionActions(riskLevel),
      activitySnapshot: activity,
      detectedPatterns: this.detectVikingPatterns(this.vikingActivityHistory)
    };
  }
  
  async executeVikingProtection(actions: VikingProtectionAction[]): Promise<void> {
    console.log('🛡️ تنفيذ إجراءات حماية Viking Rise من البان');
    
    for (const action of actions) {
      console.log(`⚡ ${action.description}`);
      
      switch (action.type) {
        case 'viking_delay':
          await this.vikingDelayedOperations(action.parameters);
          break;
        case 'viking_pattern_change':
          await this.changeVikingPattern(action.parameters);
          break;
        case 'viking_cool_break':
          await this.vikingCoolDown(action.parameters);
          break;
        case 'viking_random_actions':
          await this.addRandomVikingActions(action.parameters);
          break;
        case 'viking_emergency_stop':
          await this.vikingEmergencyStop(action.parameters);
          break;
        case 'viking_device_switch':
          await this.switchVikingDevice(action.parameters);
          break;
      }
    }
  }
  
  private async vikingDelayedOperations(params: VikingActionParams): Promise<void> {
    const delay = params.delayMs || 8000 + Math.random() * 4000;
    console.log(`⏳ تأخير أنشطة Viking Rise: ${Math.round(delay/1000)} ثانية`);
    
    // تأخير مع تباين بشري
    const intervals = [delay * 0.3, delay * 0.4, delay * 0.3];
    for (const interval of intervals) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      // حركات عشوائية خلال التأخير
      if (Math.random() > 0.5) {
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      }
    }
  }
  
  private async changeVikingPattern(params: VikingActionParams): Promise<void> {
    console.log('🔄 تغيير نمط أنشطة Viking Rise');
    
    const changes = [
      'تغيير تسلسل المهام',
      'تعديل إحداثيات النقر',
      'تغيير مدة السحب',
      'إضافة حركات عشوائية',
      'تعديل فترات التأخير'
    ];
    
    const selectedChanges = changes
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 2));
    
    console.log(`التغييرات المطبقة: ${selectedChanges.join('، ')}`);
    
    // محاكاة وقت التغيير
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
  }
  
  private async vikingCoolDown(params: VikingActionParams): Promise<void> {
    const minutes = params.minutes || 20 + Math.floor(Math.random() * 20);
    console.log(`☕ فترة تبريد Viking Rise: ${minutes} دقيقة`);
    
    // فترة تبريد مع أنشطة خفيفة
    const breakSegments = Math.ceil(minutes / 5);
    for (let i = 0; i < breakSegments; i++) {
      await new Promise(resolve => setTimeout(resolve, 5 * 60000));
      
      // بعض النشاط الخفيف بين الفترات
      if (i < breakSegments - 1 && Math.random() > 0.7) {
        console.log('🔍 نشاط خفيف خلال فترة التبريد...');
        await new Promise(resolve => setTimeout(resolve, 30000 + Math.random() * 30000));
      }
    }
  }
  
  private async addRandomVikingActions(params: VikingActionParams): Promise<void> {
    const count = params.actionCount || 3 + Math.floor(Math.random() * 4);
    console.log(`🎲 إضافة ${count} إجراءات عشوائية لـ Viking Rise`);
    
    for (let i = 0; i < count; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const actions = [
        'نقر عشوائي على الشاشة',
        'سحب قصير في اتجاه عشوائي',
        'تغيير الإعدادات',
        'فتح وإغلاق القلعة',
        'تصفح الموارد'
      ];
      
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      console.log(`   ↳ ${randomAction}`);
      
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
    }
  }
  
  private async vikingEmergencyStop(params: VikingActionParams): Promise<void> {
    console.log('🆘 توقف طارئ لأنشطة Viking Rise!');
    this.protectionActive = false;
    
    // إيقاف فوري مع رسالة طمأنة
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ تم إيقاف جميع أنشطة Viking Rise لحماية الحساب');
    
    // اقتراح وقت الاستئناف
    const resumeTime = new Date(Date.now() + 60 * 60 * 1000);
    console.log(`⏰ اقتراح استئناف النشاط بعد الساعة: ${resumeTime.toLocaleTimeString()}`);
  }
  
  private async switchVikingDevice(params: VikingActionParams): Promise<void> {
    console.log('📱 تبديل جهاز Viking Rise');
    
    const devices = ['Device-1', 'Device-2', 'Emulator-1'];
    const newDevice = devices[Math.floor(Math.random() * devices.length)];
    
    console.log(`   ↳ الانتقال إلى الجهاز: ${newDevice}`);
    
    // محاكاة وقت التبديل
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 4000));
    
    // محاكاة إعادة الاتصال
    console.log(`   ↳ إعادة الاتصال باللعبة...`);
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    console.log(`✅ تم التبديل إلى الجهاز الجديد بنجاح`);
  }
  
  private analyzeTimePatterns(activities: VikingRiseActivity[]): number {
    if (activities.length < 5) return 0;
    
    let patternScore = 0;
    
    // تحليل الفترات الزمنية بين الأنشطة
    const timeDiffs: number[] = [];
    for (let i = 1; i < activities.length; i++) {
      const diff = activities[i].timestamp - activities[i-1].timestamp;
      timeDiffs.push(diff);
    }
    
    // حساب الانحراف المعياري النسبي
    const avg = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    const variance = timeDiffs.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / timeDiffs.length;
    const stdDev = Math.sqrt(variance);
    const coeffOfVariation = stdDev / avg;
    
    // إذا كان التباين منخفض جداً (أنماط منتظمة)
    if (coeffOfVariation < 0.2) {
      patternScore += 25;
    }
    
    // تحليل أنماط التكرار اليومي
    const hourCounts = new Array(24).fill(0);
    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourCounts[hour]++;
    });
    
    // إذا كانت الأنشطة مركزة في ساعات محددة
    const maxHourCount = Math.max(...hourCounts);
    const totalActivities = activities.length;
    if (maxHourCount > totalActivities * 0.3) {
      patternScore += 15;
    }
    
    return Math.min(40, patternScore);
  }
  
  private detectVikingPatterns(activities: VikingRiseActivity[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    if (activities.length >= 10) {
      // اكتشاف أنماط التكرار
      const lastFive = activities.slice(-5);
      const areSimilar = lastFive.every(a => 
        a.tapsPerMinute > 100 && a.patternConsistency > 0.8
      );
      
      if (areSimilar) {
        patterns.push({
          type: 'repetitive_behavior',
          confidence: 0.85,
          description: 'سلوك متكرر في آخر 5 أنشطة',
          risk: 'medium'
        });
      }
      
      // اكتشاف فترات العمل الطويلة
      const recentHours = activities
        .filter(a => Date.now() - a.timestamp < 24 * 60 * 60 * 1000)
        .length;
      
      if (recentHours > 15) {
        patterns.push({
          type: 'extended_session',
          confidence: 0.9,
          description: 'جلسات متكررة على مدار 24 ساعة',
          risk: 'high'
        });
      }
    }
    
    return patterns;
  }
  
  private calculateVikingRiskLevel(score: number): VikingRiskLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'safe';
  }
  
  private generateVikingRecommendations(
    level: VikingRiskLevel, 
    factors: RiskFactor[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (level === 'critical') {
      recommendations.push('إيقاف فوري لأنشطة Viking Rise لمدة 24 ساعة');
      recommendations.push('تغيير جهاز المحاكاة المستخدم');
      recommendations.push('مراجعة كاملة لأنماط النشاط السابقة');
    } else if (level === 'high') {
      recommendations.push('تخفيض نشاط Viking Rise بنسبة 70%');
      recommendations.push('إضافة فترات عشوائية طويلة بين المهام');
      recommendations.push('تغيير أوقات تنفيذ المهام الرئيسية');
    } else if (level === 'medium') {
      recommendations.push('زيادة التباين في توقيتات النقر');
      recommendations.push('إضافة أخطاء بشرية متعمدة بنسبة 3-5%');
      recommendations.push('تغيير تسلسل تنفيذ المهام الفرعية');
    } else if (level === 'low') {
      recommendations.push('مراقبة الأنماط المستمرة');
      recommendations.push('إضافة حركات عشوائية إضافية');
    }
    
    // توصيات خاصة بناءً على عوامل الخطر
    if (factors.some(f => f.factor.includes('نقرات متطابقة'))) {
      recommendations.push('استخدام نطاق إحداثيات أوسع للنقر');
    }
    
    if (factors.some(f => f.factor.includes('غياب أخطاء'))) {
      recommendations.push('برمجة أخطاء بشرية عشوائية في النظام');
    }
    
    return recommendations;
  }
  
  private determineVikingProtectionActions(level: VikingRiskLevel): VikingProtectionAction[] {
    switch (level) {
      case 'critical':
        return [
          { 
            type: 'viking_emergency_stop', 
            parameters: { reason: 'critical_risk_detected' },
            description: 'إيقاف طارئ لأنشطة Viking Rise'
          },
          { 
            type: 'viking_cool_break', 
            parameters: { minutes: 120 },
            description: 'فترة تبريد طويلة (ساعتين)'
          }
        ];
      case 'high':
        return [
          { 
            type: 'viking_delay', 
            parameters: { delayMs: 15000 },
            description: 'تأخير طويل للأنشطة'
          },
          { 
            type: 'viking_pattern_change', 
            parameters: { changeCount: 4 },
            description: 'تغيير أنماط التنفيذ'
          },
          { 
            type: 'viking_cool_break', 
            parameters: { minutes: 45 },
            description: 'فترة تبريد متوسطة'
          }
        ];
      case 'medium':
        return [
          { 
            type: 'viking_delay', 
            parameters: { delayMs: 8000 },
            description: 'تأخير متوسط للأنشطة'
          },
          { 
            type: 'viking_random_actions', 
            parameters: { actionCount: 5 },
            description: 'إضافة إجراءات عشوائية'
          }
        ];
      case 'low':
        return [
          { 
            type: 'viking_delay', 
            parameters: { delayMs: 3000 },
            description: 'تأخير قصير للأنشطة'
          },
          { 
            type: 'viking_random_actions', 
            parameters: { actionCount: 2 },
            description: 'إضافة إجراءات عشوائية قليلة'
          }
        ];
      default:
        return [];
    }
  }
  // =====================================================
  
  // [الدوال الأصلية تبقى كما هي بدون تغيير]
  monitorForBanSigns(activity: UserActivity): BanRiskAssessment {
    const riskFactors: RiskFactor[] = [];
    let totalRiskScore = 0;
    
    if (activity.requestsPerMinute > 50) {
      riskFactors.push({
        factor: 'معدل طلبات مرتفع',
        score: 30,
        suggestion: 'خفض عدد الطلبات أو إضافة تأخيرات'
      });
      totalRiskScore += 30;
    }
    
    if (activity.sessionDurationHours > 8) {
      riskFactors.push({
        factor: 'جلسة طويلة جداً',
        score: 25,
        suggestion: 'أخذ فترات راحة كل 2-3 ساعات'
      });
      totalRiskScore += 25;
    }
    
    if (activity.patternConsistency > 0.9) {
      riskFactors.push({
        factor: 'نمط متكرر جداً',
        score: 40,
        suggestion: 'إضافة عشوائية في التوقيت والأنشطة'
      });
      totalRiskScore += 40;
    }
    
    const riskLevel = this.calculateRiskLevel(totalRiskScore);
    
    return {
      timestamp: new Date(),
      riskScore: totalRiskScore,
      riskLevel,
      factors: riskFactors,
      recommendations: this.generateRecommendations(riskLevel, riskFactors),
      protectionActions: this.determineProtectionActions(riskLevel)
    };
  }
  
  async executeProtectionActions(actions: ProtectionAction[]): Promise<void> {
    console.log('🛡️ تنفيذ إجراءات الحماية من البان');
    
    for (const action of actions) {
      switch (action.type) {
        case 'slow_down':
          await this.slowDownOperations(action.parameters);
          break;
        case 'change_pattern':
          await this.changeBehaviorPattern(action.parameters);
          break;
        case 'take_break':
          await this.takeCoolDownBreak(action.parameters);
          break;
        case 'switch_account':
          await this.switchToAlternateAccount(action.parameters);
          break;
        case 'emergency_stop':
          await this.emergencyStop(action.parameters);
          break;
      }
    }
  }
  
  private async slowDownOperations(params: any): Promise<void> {
    const delay = params.delayMs || 5000;
    console.log(`⏳ إبطاء العمليات: ${delay}ms تأخير`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  private async changeBehaviorPattern(params: any): Promise<void> {
    console.log('🔄 تغيير نمط السلوك');
  }
  
  private async takeCoolDownBreak(params: any): Promise<void> {
    const minutes = params.minutes || 15;
    console.log(`☕ فترة تبريد: ${minutes} دقيقة`);
    await new Promise(resolve => setTimeout(resolve, minutes * 60000));
  }
  
  private async switchToAlternateAccount(params: any): Promise<void> {
    console.log('👤 تبديل الحساب');
  }
  
  private async emergencyStop(params: any): Promise<void> {
    console.log('🆘 توقف طارئ!');
    this.protectionActive = false;
  }
  
  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }
  
  private generateRecommendations(
    level: RiskLevel, 
    factors: RiskFactor[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (level === 'critical' || level === 'high') {
      recommendations.push('توقف فوري عن النشاط لمدة 30 دقيقة');
      recommendations.push('تغيير IP إذا كان ذلك آمناً');
      recommendations.push('مراجعة أنماط النشاط الأخيرة');
    }
    
    if (factors.some(f => f.factor.includes('نمط متكرر'))) {
      recommendations.push('إضافة تنوع أكبر في الأنشطة');
      recommendations.push('تغيير أوقات النشاط');
    }
    
    return recommendations;
  }
  
  private determineProtectionActions(level: RiskLevel): ProtectionAction[] {
    switch (level) {
      case 'critical':
        return [
          { type: 'emergency_stop', parameters: {} },
          { type: 'take_break', parameters: { minutes: 60 } }
        ];
      case 'high':
        return [
          { type: 'slow_down', parameters: { delayMs: 10000 } },
          { type: 'take_break', parameters: { minutes: 30 } },
          { type: 'change_pattern', parameters: {} }
        ];
      case 'medium':
        return [
          { type: 'slow_down', parameters: { delayMs: 5000 } },
          { type: 'change_pattern', parameters: {} }
        ];
      default:
        return [
          { type: 'slow_down', parameters: { delayMs: 2000 } }
        ];
    }
  }
}

// =============== VIKING RISE EXTENSION TYPES ===============
interface VikingRiseActivity {
  timestamp: number;
  deviceId?: string;
  actionType: 'tap' | 'swipe' | 'task' | 'shield' | 'helps';
  tapsPerMinute: number;
  patternConsistency: number; // 0-1
  identicalActionsCount: number;
  sessionDurationHours: number;
  noHumanErrors: boolean;
  totalActions: number;
  screenResolution: { width: number; height: number };
  gameState?: {
    shieldActive: boolean;
    helpsAvailable: number;
    resources: any;
  };
}

interface VikingActionParams {
  delayMs?: number;
  minutes?: number;
  actionCount?: number;
  changeCount?: number;
  reason?: string;
  deviceId?: string;
}

type VikingRiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

interface VikingProtectionAction {
  type: 'viking_delay' | 'viking_pattern_change' | 'viking_cool_break' | 
        'viking_random_actions' | 'viking_emergency_stop' | 'viking_device_switch';
  parameters: VikingActionParams;
  description: string;
}

interface DetectedPattern {
  type: string;
  confidence: number;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

interface VikingBanRiskAssessment {
  timestamp: Date;
  riskScore: number;
  riskLevel: VikingRiskLevel;
  factors: RiskFactor[];
  recommendations: string[];
  protectionActions: VikingProtectionAction[];
  activitySnapshot: VikingRiseActivity;
  detectedPatterns: DetectedPattern[];
}
// ===========================================================

// أنواع البيانات الأصلية (تبقى كما هي)
interface UserActivity {
  requestsPerMinute: number;
  sessionDurationHours: number;
  patternConsistency: number;
  lastActivity: Date;
}

interface RiskFactor {
  factor: string;
  score: number;
  suggestion: string;
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface ProtectionAction {
  type: 'slow_down' | 'change_pattern' | 'take_break' | 'switch_account' | 'emergency_stop';
  parameters: any;
}

interface BanRiskAssessment {
  timestamp: Date;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  recommendations: string[];
  protectionActions: ProtectionAction[];
}