'use client'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = createSupabaseBrowserClient()

  async function handleSubmit() {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        else window.location.href = '/dashboard'
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        })
        if (error) setError(error.message)
        else setSuccess('?? ????? ?????! ???? ?? ?????.')
      }
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `https://www.vrbot.me/auth/callback` }
    })
  }

  const isSignIn = mode === 'signin'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "Georgia, serif",
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .bg-glow {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 40% at 50% 60%, rgba(200,80,0,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-card {
          width: 100%; max-width: 780px; min-height: 480px;
          border-radius: 18px; overflow: hidden; display: flex; position: relative;
          border: 1px solid rgba(200,80,0,0.35);
          box-shadow: 0 0 0 1px rgba(200,80,0,0.15), 0 0 40px rgba(200,80,0,0.2), 0 0 80px rgba(200,80,0,0.08);
        }
        .corner { position: absolute; width: 18px; height: 18px; border-color: rgba(200,80,0,0.7); border-style: solid; z-index: 10; }
        .corner-tl { top:-1px; left:-1px; border-width:2px 0 0 2px; border-radius:4px 0 0 0; }
        .corner-br { bottom:-1px; right:-1px; border-width:0 2px 2px 0; border-radius:0 0 4px 0; }
        .left-panel {
          flex: 1; background: rgba(10,8,5,0.97);
          padding: 50px 44px; display: flex; flex-direction: column; justify-content: center; position: relative;
        }
        .left-panel::after {
          content:''; position:absolute; top:0; right:0; width:1px; height:100%;
          background: linear-gradient(to bottom, transparent, rgba(200,80,0,0.4), transparent);
        }
        .right-panel {
          width: 300px; background: linear-gradient(145deg, rgba(30,12,0,0.98), rgba(20,8,0,0.98));
          padding: 50px 36px; display: flex; flex-direction: column;
          justify-content: center; align-items: center; text-align: center; position: relative; overflow: hidden;
        }
        .right-panel::before {
          content:''; position:absolute; inset:0;
          background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(200,80,0,0.12) 0%, transparent 70%);
        }
        .input-field {
          width:100%; padding:13px 16px;
          background:rgba(255,255,255,0.04); border:1px solid rgba(200,80,0,0.25);
          border-radius:8px; color:#e6d5c0; font-size:14px; font-family:Georgia,serif;
          outline:none; transition:all 0.2s; margin-bottom:12px;
        }
        .input-field::placeholder { color:rgba(200,150,100,0.35); }
        .input-field:focus { border-color:rgba(200,80,0,0.6); background:rgba(200,80,0,0.05); box-shadow:0 0 12px rgba(200,80,0,0.1); }
        .btn-signin {
          width:100%; padding:14px;
          background:linear-gradient(135deg,#c85000,#e06020); border:none; border-radius:50px;
          color:#fff; font-family:Georgia,serif; font-size:13px; font-weight:700;
          letter-spacing:2px; cursor:pointer; transition:all 0.2s; text-transform:uppercase;
          box-shadow:0 4px 20px rgba(200,80,0,0.3); margin-top:4px;
        }
        .btn-signin:hover { box-shadow:0 6px 28px rgba(200,80,0,0.5); transform:translateY(-1px); }
        .btn-signin:disabled { opacity:0.6; cursor:not-allowed; transform:none; }
        .btn-signup {
          padding:12px 32px; background:transparent;
          border:1.5px solid rgba(200,80,0,0.7); border-radius:50px;
          color:#e06020; font-family:Georgia,serif; font-size:12px; font-weight:600;
          letter-spacing:2px; cursor:pointer; transition:all 0.2s; text-transform:uppercase;
        }
        .btn-signup:hover { background:rgba(200,80,0,0.1); border-color:rgba(200,80,0,1); }
        .btn-google {
          width:100%; padding:12px; background:rgba(255,255,255,0.04);
          border:1px solid rgba(200,80,0,0.2); border-radius:8px; color:#c8a880;
          font-family:Georgia,serif; font-size:13px; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s;
        }
        .btn-google:hover { background:rgba(200,80,0,0.06); border-color:rgba(200,80,0,0.4); }
        .divider { display:flex; align-items:center; gap:10px; margin:16px 0; }
        .divider::before, .divider::after { content:''; flex:1; height:1px; background:rgba(200,80,0,0.2); }
        .divider span { color:rgba(200,120,60,0.4); font-size:11px; letter-spacing:1px; }
        @keyframes fadeSlide { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .fade-in { animation: fadeSlide 0.35s ease; }
        @media(max-width:600px){
          .login-card{flex-direction:column}
          .right-panel{width:100%;padding:36px 32px}
          .left-panel{padding:40px 28px}
          .left-panel::after{display:none}
        }
      `}</style>

      <div className="bg-glow" />

      <div className="login-card">
        <div className="corner corner-tl" />
        <div className="corner corner-br" />

        {/* Left */}
        <div className="left-panel">
          <div style={{ marginBottom: 32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
              <span style={{ fontSize:20 }}>??</span>
              <span style={{ color:'#e06020', fontSize:20, fontWeight:900, letterSpacing:5 }}>VRBOT</span>
            </div>
            <div style={{ color:'rgba(200,120,60,0.4)', fontSize:9, letterSpacing:4 }}>VIKING RISE AUTOMATION</div>
          </div>

          <div className="fade-in" key={mode}>
            <h2 style={{ color:'#e8d0b0', fontSize:24, fontWeight:700, marginBottom:6, letterSpacing:1 }}>
              {isSignIn ? 'Sign In' : 'Sign Up'}
            </h2>
            <p style={{ color:'rgba(200,140,80,0.5)', fontSize:13, marginBottom:24 }}>
              {isSignIn ? 'Welcome back, warrior' : 'Join the VRBOT kingdom'}
            </p>

            {!isSignIn && (
              <input className="input-field" type="text" placeholder="Full Name"
                value={name} onChange={e => setName(e.target.value)} />
            )}
            <input className="input-field" type="email" placeholder="Email"
              value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
            <input className="input-field" type="password" placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />

            {isSignIn && (
              <div style={{ textAlign:'right', marginBottom:16, marginTop:-4 }}>
                <span style={{ color:'rgba(200,80,0,0.6)', fontSize:12, cursor:'pointer' }}>Forgot password?</span>
              </div>
            )}

            {error && (
              <div style={{ background:'rgba(200,50,50,0.08)', border:'1px solid rgba(200,50,50,0.3)', color:'#c87060', padding:'9px 13px', borderRadius:7, fontSize:12, marginBottom:12 }}>
                ?? {error}
              </div>
            )}
            {success && (
              <div style={{ background:'rgba(50,180,80,0.08)', border:'1px solid rgba(50,180,80,0.3)', color:'#60c870', padding:'9px 13px', borderRadius:7, fontSize:12, marginBottom:12 }}>
                ? {success}
              </div>
            )}

            <button className="btn-signin" onClick={handleSubmit} disabled={loading}>
              {loading ? '? Loading...' : isSignIn ? 'Sign In' : 'Create Account'}
            </button>
          </div>

          <div className="divider"><span>OR</span></div>

          <button className="btn-google" onClick={handleGoogle}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Right */}
        <div className="right-panel">
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ fontSize:40, marginBottom:16, filter:'drop-shadow(0 0 12px rgba(200,80,0,0.4))' }}>
              {isSignIn ? '??' : '??'}
            </div>
            <h2 style={{ color:'#e8c890', fontSize:26, fontWeight:900, lineHeight:1.3, marginBottom:12 }}>
              {isSignIn ? 'Hello\nFriend!' : 'Welcome\nBack!'}
            </h2>
            <p style={{ color:'rgba(200,140,80,0.6)', fontSize:13, lineHeight:1.6, marginBottom:28 }}>
              {isSignIn ? 'Create your account and start your adventure' : 'Sign in and continue your quest'}
            </p>
            <button className="btn-signup"
              onClick={() => { setMode(isSignIn ? 'signup' : 'signin'); setError(''); setSuccess('') }}>
              {isSignIn ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


