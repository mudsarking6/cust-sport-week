import {useState} from 'react';
import {ArrowRight,Sparkles} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import '../welcome.css';

export default function Welcome(){
  const navigate=useNavigate();const[leaving,setLeaving]=useState(false);
  const start=()=>{if(leaving)return;setLeaving(true);window.setTimeout(()=>navigate('/login'),650)};
  return <main className={`welcome-page${leaving?' leaving':''}`}>
    <div className="welcome-rays" aria-hidden="true"/>
    <div className="welcome-stars" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
    <div className="welcome-orbit orbit-one" aria-hidden="true"/><div className="welcome-orbit orbit-two" aria-hidden="true"/>
    <section className="welcome-content">
      <div className="welcome-emblem"><span className="emblem-halo"/><img src="/cust-logo.jpg" alt="Capital University of Science & Technology"/></div>
      <p className="welcome-kicker"><Sparkles size={15}/> CAPITAL UNIVERSITY OF SCIENCE &amp; TECHNOLOGY</p>
      <h1>Welcome to <span>CUST</span></h1>
      <p className="welcome-subtitle">Sports Week <b>2026</b></p>
      <button className="welcome-start" onClick={start} disabled={leaving}>Get Started <ArrowRight size={19}/></button>
      <p className="welcome-footnote">One campus. Every game. One team.</p>
    </section>
    <div className="welcome-edge" aria-hidden="true"/>
  </main>;
}
