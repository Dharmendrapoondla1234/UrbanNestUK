import { useState } from 'react';
import { C, T, btn, inputStyle } from '../../utils/design.js';
import { useAuth } from '../../hooks/useAuth.jsx';

export default function AuthModal({ onClose }) {
  const { signIn } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  function handleSubmit() {
    if (!name.trim() || !email.trim()) return;
    signIn(name.trim(), email.trim());
    onClose();
  }
  const features = ['🤖 AI Property Advisor','💰 Price Prediction AI','📊 Market Analysis','🗺️ Smart Map Search'];
  return (
    <div style={{
      position:'fixed',inset:0,zIndex:200,
      background:'rgba(0,0,0,0.8)',backdropFilter:'blur(12px)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:20,
    }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background:C.surface,border:`1px solid rgba(79,158,255,0.2)`,
        borderRadius:20,padding:36,width:'100%',maxWidth:420,
        boxShadow:'0 32px 80px rgba(0,0,0,0.8)',
      }}>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{
            width:52,height:52,borderRadius:14,margin:'0 auto 14px',
            background:'linear-gradient(135deg,#4f9eff,#818cf8)',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,
            boxShadow:'0 0 30px rgba(79,158,255,0.4)',
          }}>🏙️</div>
          <h2 style={{fontFamily:T.display,fontSize:22,fontWeight:900,color:C.text,margin:'0 0 6px'}}>Sign In to UrbanNest</h2>
          <p style={{color:C.muted,fontSize:13,margin:0}}>Unlock the full AI-powered platform</p>
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:7,justifyContent:'center',marginBottom:22}}>
          {features.map(f=>(
            <span key={f} style={{
              padding:'4px 11px',borderRadius:99,fontSize:11,color:C.muted,fontWeight:600,
              background:'rgba(79,158,255,0.08)',border:'1px solid rgba(79,158,255,0.15)',
            }}>{f}</span>
          ))}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <input style={inputStyle()} placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
          <input style={inputStyle()} type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSubmit()} />
          <button onClick={handleSubmit} style={{...btn('primary','lg'),width:'100%',justifyContent:'center',marginTop:4}}>
            Get Started Free →
          </button>
        </div>
        <p style={{textAlign:'center',fontSize:11,color:C.dim,marginTop:12}}>No payment required. Instant access.</p>
      </div>
    </div>
  );
}
