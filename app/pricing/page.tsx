'use client';
import { useLanguage } from '@/lib/i18n';

type Language = 'ar' | 'en' | 'ru' | 'zh';
type PricingContent = {
  title: string; subtitle: string;
  free_title: string; free_price: string; free_f1: string; free_f2: string; free_f3: string; free_cta: string;
  ldp_title: string; ldp_desc: string; ldp_price: string; ldp_per: string;
  ldp_f1: string; ldp_f2: string; ldp_f3: string; ldp_f4: string; ldp_f5: string; ldp_cta: string;
  cloud_title: string; cloud_desc: string; cloud_price: string; cloud_per: string;
  cloud_f1: string; cloud_f2: string; cloud_f3: string; cloud_f4: string; cloud_f5: string; cloud_cta: string;
  popular: string;
};

const content: Record<Language, PricingContent> = {
  ar: {
    title: '\u0627\u0644\u0623\u0633\u0639\u0627\u0631', subtitle: '\u0627\u062e\u062a\u0631 \u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0643',
    free_title: '\u0645\u062c\u0627\u0646\u064a', free_price: '$0', free_f1: '\u2713 \u062a\u0634\u063a\u064a\u0644 \u0645\u062d\u062f\u0648\u062f', free_f2: '\u2713 \u062f\u0639\u0645 \u0627\u0644\u0645\u062c\u062a\u0645\u0639', free_f3: '\u2713 \u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0645\u062c\u0627\u0646\u064a\u0629', free_cta: '\u0627\u0628\u062f\u0623 \u0645\u062c\u0627\u0646\u0627\u064b',
    ldp_title: 'LDPlayer', ldp_desc: '\u0644\u0644\u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0645\u062d\u0644\u064a', ldp_price: '$2', ldp_per: '/\u0645\u0632\u0631\u0639\u0629/\u0634\u0647\u0631',
    ldp_f1: '\u2713 52 \u0645\u0647\u0645\u0629 \u0622\u0644\u064a\u0629', ldp_f2: '\u2713 \u062a\u0634\u063a\u064a\u0644 \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f', ldp_f3: '\u2713 \u062f\u0639\u0645 \u0623\u0648\u0644\u0648\u064a', ldp_f4: '\u2713 \u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0645\u0628\u0643\u0631\u0629', ldp_f5: '\u2713 \u062a\u0634\u063a\u064a\u0644 \u0639\u0644\u0649 \u062c\u0647\u0627\u0632\u0643', ldp_cta: '\u0627\u0634\u062a\u0631\u0643 \u0627\u0644\u0622\u0646',
    cloud_title: '\u0633\u062d\u0627\u0628\u064a \u2601\ufe0f', cloud_desc: '\u0628\u062f\u0648\u0646 \u062c\u0647\u0627\u0632 \u0643\u0645\u0628\u064a\u0648\u062a\u0631', cloud_price: '$3', cloud_per: '/\u0645\u0632\u0631\u0639\u0629/\u0634\u0647\u0631',
    cloud_f1: '\u2713 52 \u0645\u0647\u0645\u0629 \u0622\u0644\u064a\u0629', cloud_f2: '\u2713 \u062a\u0634\u063a\u064a\u0644 \u063a\u064a\u0631 \u0645\u062d\u062f\u0648\u062f', cloud_f3: '\u2713 \u062f\u0639\u0645 \u0623\u0648\u0644\u0648\u064a', cloud_f4: '\u2713 \u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0645\u0628\u0643\u0631\u0629', cloud_f5: '\u2713 \u0628\u062f\u0648\u0646 \u062d\u0627\u062c\u0629 \u0644\u062c\u0647\u0627\u0632', cloud_cta: '\u0627\u0634\u062a\u0631\u0643 \u0627\u0644\u0622\u0646',
    popular: '\u0627\u0644\u0623\u0643\u062b\u0631 \u0634\u0639\u0628\u064a\u0629',
  },
  en: {
    title: 'Pricing', subtitle: 'Choose the plan that suits you',
    free_title: 'Free', free_price: '$0', free_f1: '\u2713 Limited operation', free_f2: '\u2713 Community support', free_f3: '\u2713 Free updates', free_cta: 'Start Free',
    ldp_title: 'LDPlayer', ldp_desc: 'Run locally on your PC', ldp_price: '$2', ldp_per: '/farm/month',
    ldp_f1: '\u2713 52 automated tasks', ldp_f2: '\u2713 Unlimited operation', ldp_f3: '\u2713 Priority support', ldp_f4: '\u2713 Early updates', ldp_f5: '\u2713 Runs on your device', ldp_cta: 'Subscribe Now',
    cloud_title: 'Cloud \u2601\ufe0f', cloud_desc: 'No computer needed', cloud_price: '$3', cloud_per: '/farm/month',
    cloud_f1: '\u2713 52 automated tasks', cloud_f2: '\u2713 Unlimited operation', cloud_f3: '\u2713 Priority support', cloud_f4: '\u2713 Early updates', cloud_f5: '\u2713 No device required', cloud_cta: 'Subscribe Now',
    popular: 'Most Popular',
  },
  ru: {
    title: '\u0426\u0435\u043d\u044b', subtitle: '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u043e\u0434\u0445\u043e\u0434\u044f\u0449\u0438\u0439 \u043f\u043b\u0430\u043d',
    free_title: '\u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e', free_price: '$0', free_f1: '\u2713 \u041e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u043d\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430', free_f2: '\u2713 \u041f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430 \u0441\u043e\u043e\u0431\u0449\u0435\u0441\u0442\u0432\u0430', free_f3: '\u2713 \u0411\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u044b\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f', free_cta: '\u041d\u0430\u0447\u0430\u0442\u044c \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e',
    ldp_title: 'LDPlayer', ldp_desc: '\u0417\u0430\u043f\u0443\u0441\u043a \u043d\u0430 \u0432\u0430\u0448\u0435\u043c \u041f\u041a', ldp_price: '$2', ldp_per: '/\u0444\u0435\u0440\u043c\u0430/\u043c\u0435\u0441\u044f\u0446',
    ldp_f1: '\u2713 52 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u0437\u0430\u0434\u0430\u0447\u0438', ldp_f2: '\u2713 \u0411\u0435\u0437\u043b\u0438\u043c\u0438\u0442\u043d\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430', ldp_f3: '\u2713 \u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430', ldp_f4: '\u2713 \u0420\u0430\u043d\u043d\u0438\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f', ldp_f5: '\u2713 \u0420\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u043d\u0430 \u0432\u0430\u0448\u0435\u043c \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0435', ldp_cta: '\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f',
    cloud_title: '\u041e\u0431\u043b\u0430\u043a\u043e \u2601\ufe0f', cloud_desc: '\u0411\u0435\u0437 \u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440\u0430', cloud_price: '$3', cloud_per: '/\u0444\u0435\u0440\u043c\u0430/\u043c\u0435\u0441\u044f\u0446',
    cloud_f1: '\u2713 52 \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0445 \u0437\u0430\u0434\u0430\u0447\u0438', cloud_f2: '\u2713 \u0411\u0435\u0437\u043b\u0438\u043c\u0438\u0442\u043d\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430', cloud_f3: '\u2713 \u041f\u0440\u0438\u043e\u0440\u0438\u0442\u0435\u0442\u043d\u0430\u044f \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u043a\u0430', cloud_f4: '\u2713 \u0420\u0430\u043d\u043d\u0438\u0435 \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u0438\u044f', cloud_f5: '\u2713 \u0411\u0435\u0437 \u043d\u0435\u043e\u0431\u0445\u043e\u0434\u0438\u043c\u043e\u0441\u0442\u0438 \u0432 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0435', cloud_cta: '\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f',
    popular: '\u0421\u0430\u043c\u044b\u0439 \u043f\u043e\u043f\u0443\u043b\u044f\u0440\u043d\u044b\u0439',
  },
  zh: {
    title: '\u4ef7\u683c', subtitle: '\u9009\u62e9\u9002\u5408\u60a8\u7684\u65b9\u6848',
    free_title: '\u514d\u8d39', free_price: '$0', free_f1: '\u2713 \u6709\u9650\u8fd0\u884c', free_f2: '\u2713 \u793e\u533a\u652f\u6301', free_f3: '\u2713 \u514d\u8d39\u66f4\u65b0', free_cta: '\u514d\u8d39\u5f00\u59cb',
    ldp_title: 'LDPlayer', ldp_desc: '\u5728\u60a8\u7684\u7535\u8111\u4e0a\u8fd0\u884c', ldp_price: '$2', ldp_per: '/\u519c\u573a/\u6708',
    ldp_f1: '\u2713 52\u4e2a\u81ea\u52a8\u4efb\u52a1', ldp_f2: '\u2713 \u65e0\u9650\u8fd0\u884c', ldp_f3: '\u2713 \u4f18\u5148\u652f\u6301', ldp_f4: '\u2713 \u65e9\u671f\u66f4\u65b0', ldp_f5: '\u2713 \u5728\u60a8\u7684\u8bbe\u5907\u4e0a\u8fd0\u884c', ldp_cta: '\u7acb\u5373\u8ba2\u9605',
    cloud_title: '\u4e91\u7aef \u2601\ufe0f', cloud_desc: '\u65e0\u9700\u7535\u8111', cloud_price: '$3', cloud_per: '/\u519c\u573a/\u6708',
    cloud_f1: '\u2713 52\u4e2a\u81ea\u52a8\u4efb\u52a1', cloud_f2: '\u2713 \u65e0\u9650\u8fd0\u884c', cloud_f3: '\u2713 \u4f18\u5148\u652f\u6301', cloud_f4: '\u2713 \u65e9\u671f\u66f4\u65b0', cloud_f5: '\u2713 \u65e0\u9700\u8bbe\u5907', cloud_cta: '\u7acb\u5373\u8ba2\u9605',
    popular: '\u6700\u53d7\u6b22\u8fce',
  },
};

export default function PricingPage() {
  const { lang } = useLanguage();
  const t = content[lang as Language] || content.en;

  return (
    <main style={{minHeight:'100vh',background:'#0a0a0a',color:'#fff',padding:'80px 20px 40px'}}>
      <div style={{maxWidth:1100,margin:'0 auto',textAlign:'center'}}>
        <h1 style={{fontSize:'2.5rem',marginBottom:8}}>{t.title}</h1>
        <p style={{color:'#999',marginBottom:40}}>{t.subtitle}</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>

          {/* Free Card */}
          <div style={{background:'#111',borderRadius:16,padding:32,border:'1px solid #222',textAlign:'left'}}>
            <h3 style={{fontSize:'1.3rem',marginBottom:4}}>{t.free_title}</h3>
            <div style={{fontSize:'2rem',fontWeight:700,margin:'16px 0'}}>{t.free_price}</div>
            <ul style={{listStyle:'none',padding:0,margin:'16px 0',lineHeight:2}}>
              <li>{t.free_f1}</li><li>{t.free_f2}</li><li>{t.free_f3}</li>
            </ul>
            <button style={{width:'100%',padding:'10px 0',borderRadius:8,border:'1px solid #555',background:'transparent',color:'#fff',cursor:'pointer'}}>{t.free_cta}</button>
          </div>

          {/* LDPlayer Card */}
          <div style={{background:'#111',borderRadius:16,padding:32,border:'1px solid #7c3aed',textAlign:'left',position:'relative'}}>
            <span style={{position:'absolute',top:-12,right:20,background:'#7c3aed',color:'#fff',padding:'4px 16px',borderRadius:20,fontSize:'0.85rem'}}>{t.popular}</span>
            <h3 style={{fontSize:'1.3rem',marginBottom:4}}>{t.ldp_title}</h3>
            <p style={{color:'#999',fontSize:'0.9rem',marginBottom:8}}>{t.ldp_desc}</p>
            <div style={{fontSize:'2rem',fontWeight:700,margin:'16px 0'}}>{t.ldp_price}<span style={{fontSize:'0.9rem',color:'#999'}}>{t.ldp_per}</span></div>
            <ul style={{listStyle:'none',padding:0,margin:'16px 0',lineHeight:2}}>
              <li>{t.ldp_f1}</li><li>{t.ldp_f2}</li><li>{t.ldp_f3}</li><li>{t.ldp_f4}</li><li>{t.ldp_f5}</li>
            </ul>
            <a href="/billing?plan=ldplayer" style={{textDecoration:"none"}}><button style={{width:'100%',padding:'10px 0',borderRadius:8,border:'none',background:'linear-gradient(135deg,#7c3aed,#a855f7)',color:'#fff',cursor:'pointer',fontWeight:600}}>{t.ldp_cta}</button></a>
          </div>

          {/* Cloud Card */}
          <div style={{background:'#111',borderRadius:16,padding:32,border:'1px solid #7c3aed',textAlign:'left',boxShadow:'0 0 30px rgba(124,58,237,0.3)'}}>
            <h3 style={{fontSize:'1.3rem',marginBottom:4}}>{t.cloud_title}</h3>
            <p style={{color:'#999',fontSize:'0.9rem',marginBottom:8}}>{t.cloud_desc}</p>
            <div style={{fontSize:'2rem',fontWeight:700,margin:'16px 0'}}>{t.cloud_price}<span style={{fontSize:'0.9rem',color:'#999'}}>{t.cloud_per}</span></div>
            <ul style={{listStyle:'none',padding:0,margin:'16px 0',lineHeight:2}}>
              <li>{t.cloud_f1}</li><li>{t.cloud_f2}</li><li>{t.cloud_f3}</li><li>{t.cloud_f4}</li><li>{t.cloud_f5}</li>
            </ul>
            <a href="/billing?plan=cloud" style={{textDecoration:"none"}}><button style={{width:'100%',padding:'10px 0',borderRadius:8,border:'none',background:'linear-gradient(135deg,#7c3aed,#a855f7)',color:'#fff',cursor:'pointer',fontWeight:600}}>{t.cloud_cta}</button></a>
          </div>

        </div>
      </div>
      <style>{`@media(max-width:768px){div[style*="grid"]{grid-template-columns:1fr!important}}`}</style>
    </main>
  );
}
