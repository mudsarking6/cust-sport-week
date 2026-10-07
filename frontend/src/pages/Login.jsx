import {useEffect,useState} from 'react';
import {ArrowRight,ChevronLeft,ChevronRight,Eye,EyeOff,LockKeyhole,ShieldCheck} from 'lucide-react';
import {api} from '../api';
import {useAuth} from '../App';
import '../login-carousel.css';

const sportsMoments=[
  {src:'/login-carousel/football.jpeg',title:'Football',caption:'Every pass builds the team.'},
  {src:'/login-carousel/tug-men.jpeg',title:'Tug of War',caption:'Strength is better together.'},
  {src:'/login-carousel/cricket.jpeg',title:'Cricket',caption:'Ready for the next big shot.'},
  {src:'/login-carousel/javelin.jpeg',title:'Javelin Throw',caption:'Focus. Power. Flight.'},
  {src:'/login-carousel/basketball.jpeg',title:'Basketball',caption:'Rise above the competition.'},
  {src:'/login-carousel/tug-women.jpeg',title:"Women's Tug of War",caption:'One rhythm. One team.'},
  {src:'/login-carousel/volleyball-serve.jpeg',title:'Volleyball',caption:'Own every serve.'},
  {src:'/login-carousel/volleyball-spike.jpeg',title:'Volleyball',caption:'Meet the moment at the net.'}
];

function SportsCarousel(){
  const [current,setCurrent]=useState(0);const [previous,setPrevious]=useState(null);const [direction,setDirection]=useState('forward');const [paused,setPaused]=useState(false);
  const move=(index,nextDirection='forward')=>{if(index===current)return;setPrevious(current);setDirection(nextDirection);setCurrent(index)};
  const next=()=>move((current+1)%sportsMoments.length,'forward');
  const back=()=>move((current-1+sportsMoments.length)%sportsMoments.length,'backward');
  useEffect(()=>{if(paused)return;const timer=setInterval(next,2000);return()=>clearInterval(timer)},[current,paused]);
  return <div className="sports-carousel" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setPaused(false)}} aria-roledescription="carousel" aria-label="CUST Sports Week moments">
    <div className="carousel-viewport">
      {sportsMoments.map((moment,index)=><figure key={moment.src} className={`carousel-slide ${index===current?`active ${direction}`:''} ${index===previous&&index!==current?`leaving ${direction}`:''}`} aria-hidden={index!==current}>
        <img src={moment.src} alt={index===current?`${moment.title} at CUST Sports Week`:''}/>
        <figcaption><span>SPORTS WEEK MOMENT</span><strong>{moment.title}</strong><p>{moment.caption}</p></figcaption>
      </figure>)}
      <div className="carousel-shade"/>
      <div className="carousel-arrows">
        <button type="button" onClick={back} aria-label="Previous sports moment"><ChevronLeft/></button>
        <button type="button" onClick={next} aria-label="Next sports moment"><ChevronRight/></button>
      </div>
    </div>
  </div>
}

function LoginPreloader(){return <div className="login-preloader" role="status" aria-live="polite"><div className="preloader-aura"><span/><span/><div className="preloader-logo"><img src="/cust-logo.jpg" alt="CUST"/></div></div><p>CUST SPORTS WEEK</p><h2>Preparing your dashboard</h2><div className="preloader-dots" aria-hidden="true"><i/><i/><i/></div><small>Setting up your secure workspace…</small></div>}

export default function Login(){
  const{login}=useAuth();const[email,setEmail]=useState('admin@cust.edu.pk');const[password,setPassword]=useState('');const[originalPassword,setOriginalPassword]=useState('');const[newPassword,setNewPassword]=useState('');const[confirmPassword,setConfirmPassword]=useState('');const[show,setShow]=useState(false);const[forgot,setForgot]=useState(false);const[error,setError]=useState('');const[resetMessage,setResetMessage]=useState('');const[busy,setBusy]=useState(false);const[preparing,setPreparing]=useState(false);
  const submit=async event=>{event.preventDefault();setBusy(true);setError('');try{const data=await api.post('/auth/login',{email,password},{timeoutMs:12000});setPreparing(true);await new Promise(resolve=>setTimeout(resolve,3000));login(data.token,data.user)}catch(error){setPreparing(false);setError(error.message)}finally{setBusy(false)}};
  const reset=async event=>{event.preventDefault();setBusy(true);setError('');if(newPassword!==confirmPassword){setError('New password and confirmation do not match');setBusy(false);return}try{const result=await api.post('/auth/forgot-password',{email,originalPassword,newPassword,confirmPassword});setResetMessage(result.message);setForgot(false);setPassword('');setOriginalPassword('');setNewPassword('');setConfirmPassword('')}catch(error){setError(error.message)}finally{setBusy(false)}};
  const toggleForgot=value=>{setForgot(value);setError('');setResetMessage('')};
  if(preparing)return <LoginPreloader/>;
  return <div className="login-page"><section className="login-visual"><div className="visual-inner"><div className="uni"><img src="/cust-logo.jpg"/><span>Capital University of<br/>Science &amp; Technology</span></div><div className="hero-copy"><div className="hero-heading"><p className="eyebrow">CUST SPORTS WEEK</p><h1>One team. <em>Every game.</em></h1></div><SportsCarousel/></div><div className="security"><ShieldCheck/><div><b>Institutional access only</b><span>Protected with role-based permissions</span></div></div></div></section><section className="login-form-wrap"><form onSubmit={forgot?reset:submit}><div className="mobile-logo"><img src="/cust-logo.jpg"/><b>CUST Sports Week</b></div><p className="eyebrow">{forgot?'ACCOUNT RECOVERY':'WELCOME BACK'}</p><h2>{forgot?'Reset your password':'Sign in to your workspace'}</h2><p className="muted">{forgot?'Enter the original password issued by the Super Admin, then choose a new password.':'Use the credentials issued by the system administrator.'}</p>{resetMessage&&<div className="reset-success" role="status">{resetMessage}</div>}{error&&<div className="error-box" role="alert">{error}</div>}<label><span>University email</span><input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="name@cust.edu.pk" required/></label>{forgot?<><label><span>Original password provided by Super Admin</span><input type="password" value={originalPassword} onChange={event=>setOriginalPassword(event.target.value)} autoComplete="current-password" required/></label><label><span>New password (at least 8 characters)</span><input type="password" value={newPassword} onChange={event=>setNewPassword(event.target.value)} autoComplete="new-password" minLength="8" required/></label><label><span>Confirm new password</span><input type="password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} autoComplete="new-password" minLength="8" required/></label><button className="primary login-btn" disabled={busy}>{busy?'Resetting…':'Reset password'}<ArrowRight/></button><button type="button" className="forgot-link" onClick={()=>toggleForgot(false)}>Back to sign in</button></>:<><label><span>Password</span><div className="password"><input type={show?'text':'password'} value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password" required/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></label><button className="primary login-btn" disabled={busy}>{busy?'Signing in…':'Sign in securely'}<ArrowRight/></button><button type="button" className="forgot-link" onClick={()=>toggleForgot(true)}>Forgot Password?</button><div className="demo-note"><LockKeyhole/><p><b>Super Admin access</b><span>admin@cust.edu.pk · Use the server-configured password</span></p></div></>}<small className="copyright">© 2026 Capital University of Science &amp; Technology</small></form></section></div>;
}
