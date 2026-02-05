import HumanBehaviorSimulator from './HumanBehaviorSimulator';
import { BanProtectionSystem } from '../../../BanProtectionSystem';
async function testVikingIntegration() {
  console.log('🧪 بدء اختبار تكامل Viking Rise...\n');
  
  // 1. اختبار HumanBehaviorSimulator مع Viking extensions
  const simulator = new HumanBehaviorSimulator();
  
  console.log('1. اختبار محاكاة Viking Rise...');
  const tapResult = await simulator.vikingTap({ x: 540, y: 1200 });
  console.log(`   ✅ نقر: ${tapResult.success ? 'ناجح' : 'فاشل'} (ثقة: ${tapResult.confidence.toFixed(2)})`);
  
  const shieldResult = await simulator.vikingShieldApplication();
  console.log(`   🛡️ تطبيق الدرع: ${shieldResult ? 'ناجح' : 'فاشل'}`);
  
  const helpsResult = await simulator.vikingSendHelps();
  console.log(`   🤝 المساعدات المرسلة: ${helpsResult}`);
  
  // 2. اختبار BanProtectionSystem مع Viking monitoring
  const banProtection = new BanProtectionSystem();
  
  console.log('\n2. اختبار حماية Viking Rise من البان...');
  const vikingActivity = {
    timestamp: Date.now(),
    actionType: 'task' as const,
    tapsPerMinute: 180,
    patternConsistency: 0.92,
    identicalActionsCount: 4,
    sessionDurationHours: 5.5,
    noHumanErrors: true,
    totalActions: 45,
    screenResolution: { width: 1080, height: 2400 }
  };
  
  const riskAssessment = banProtection.monitorVikingRiseActivity(vikingActivity);
  console.log(`   🚨 تقييم المخاطر: ${riskAssessment.riskLevel} (نقاط: ${riskAssessment.riskScore})`);
  
  if (riskAssessment.riskLevel === 'high' || riskAssessment.riskLevel === 'critical') {
    console.log('   ⚡ تنفيذ إجراءات الحماية...');
    await banProtection.executeVikingProtection(riskAssessment.protectionActions);
  }
  
  // 3. عرض الإحصائيات
  console.log('\n3. الإحصائيات النهائية:');
  const stats = simulator.getStats();
  const vikingStats = simulator.getVikingStats();
  
  console.log(`   📊 درجة السلوك: ${stats.behaviorScore}`);
  console.log(`   🔄 النمط الحالي: ${stats.currentPattern}`);
  console.log(`   📈 مهام Viking: ${vikingStats.activeTasks}/${vikingStats.totalTasks} نشطة`);
  console.log(`   ✅ معدل نجاح Viking: ${(vikingStats.successRate * 100).toFixed(1)}%`);
  
  return {
    success: true,
    simulatorStats: stats,
    vikingStats,
    riskAssessment
  };
}

// تشغيل الاختبار إذا تم تنفيذ الملف مباشرة
if (require.main === module) {
  testVikingIntegration()
    .then(result => {
      console.log('\n🎉 اختبار التكامل اكتمل بنجاح!');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ فشل اختبار التكامل:', error);
      process.exit(1);
    });
}

export { testVikingIntegration };