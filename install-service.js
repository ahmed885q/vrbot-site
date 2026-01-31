// تثبيت كخدمة Windows
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🔧 تثبيت Viking Rise Agent كخدمة Windows...')

try {
  // التحقق من PM2
  try {
    execSync('pm2 --version', { stdio: 'ignore' })
  } catch {
    console.log('📦 تثبيت PM2...')
    execSync('npm install -g pm2', { stdio: 'inherit' })
  }

  // إنشاء سيناريو PM2
  const pm2Config = {
    name: 'viking-rise-agent',
    script: path.join(__dirname, 'agent.js'),
    cwd: __dirname,
    interpreter: 'node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }

  fs.writeFileSync('ecosystem.config.js', 
    `module.exports = ${JSON.stringify({ apps: [pm2Config] }, null, 2)}`
  )

  // بدء الخدمة
  console.log('🚀 بدء الخدمة...')
  execSync('pm2 start ecosystem.config.js', { stdio: 'inherit' })
  execSync('pm2 save', { stdio: 'inherit' })
  
  // إنشاء خدمة Windows
  console.log('🖥️ إنشاء خدمة Windows...')
  execSync('pm2 startup', { stdio: 'inherit' })

  console.log('\n✅ تم التثبيت بنجاح!')
  console.log('📊 عرض الحالة: pm2 status')
  console.log('📋 عرض السجلات: pm2 logs viking-rise-agent')
  console.log('🔄 إعادة التشغيل: pm2 restart viking-rise-agent')
  console.log('⏹️ التوقف: pm2 stop viking-rise-agent')

} catch (error) {
  console.error('❌ فشل التثبيت:', error.message)
  process.exit(1)
}