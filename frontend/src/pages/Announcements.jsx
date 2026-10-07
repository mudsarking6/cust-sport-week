import {useEffect,useRef,useState} from 'react';
import {CheckCheck,FileText,Mic,MicOff,Megaphone,Trash2} from 'lucide-react';
import {useAuth,useToast} from '../App';
import {api} from '../api';
import {useConfirm} from '../components/ConfirmationDialog';

export default function Announcements(){
  const {user}=useAuth();
  const flash=useToast();
  const confirm=useConfirm();
  const [items,setItems]=useState([]);
  const [title,setTitle]=useState('');
  const [message,setMessage]=useState('');
  const [audiences,setAudiences]=useState(['TEACHERS']);
  const [file,setFile]=useState(null);
  const [submitting,setSubmitting]=useState(false);
  const [isRecording,setIsRecording]=useState(false);
  const fileRef=useRef(null);
  const recorderRef=useRef(null);
  const streamRef=useRef(null);
  const autoSendRef=useRef(false);
  const isSupport=user?.displayRole==='Support Coordinator';

  if(user?.baseRole==='SUPER_ADMIN'){
    return <div className="page-head"><div><p className="eyebrow">COMMUNICATION</p><h1>Announcements</h1><p>Announcements are not available for Super Administrator accounts.</p></div></div>;
  }

  const load=async()=>{
    const data=await api.get('/announcements');
    setItems(data);
  };

  useEffect(()=>{load().catch(()=>{});},[]);

  const toggleAudience=group=>setAudiences(current=>current.includes(group)?current.filter(item=>item!==group):[...current,group]);

  const startRecording=async()=>{
    if(!navigator.mediaDevices?.getUserMedia){
      flash('This browser does not support microphone recording.','error');
      return;
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const recorder=new MediaRecorder(stream);
      const chunks=[];
      recorder.ondataavailable=event=>{if(event.data.size>0) chunks.push(event.data);};
      recorder.onstop=()=>{
        const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
        const voiceFile=new File([blob],`announcement-audio-${Date.now()}.webm`,{type:blob.type||'audio/webm'});
        setFile(voiceFile);
        stream.getTracks().forEach(track=>track.stop());
        streamRef.current=null;
        recorderRef.current=null;
        setIsRecording(false);
        if(autoSendRef.current){
          autoSendRef.current=false;
          submit();
        }
      };
      streamRef.current=stream;
      recorderRef.current=recorder;
      autoSendRef.current=true;
      recorder.start();
      setIsRecording(true);
    }catch(error){
      flash('Microphone access was denied or unavailable.','error');
    }
  };

  const stopRecording=()=>{
    if(recorderRef.current&&recorderRef.current.state!=='inactive'){
      recorderRef.current.stop();
    }
  };

  const handleMicPress=()=>{
    if(isRecording) return;
    startRecording();
  };

  const handleMicRelease=()=>{
    if(isRecording){
      stopRecording();
    }
  };

  const submit=async event=>{
    if(event && typeof event.preventDefault==='function') event.preventDefault();
    if(!title.trim()){
      flash('Announcement title is required.','error');
      return;
    }
    if(!message.trim()&&!file){
      flash('Add a message or attach a file before sending the announcement.','error');
      return;
    }
    if(!audiences.length){
      flash('Choose at least one audience: HOD or All Teachers.','error');
      return;
    }
    const form=new FormData();
    form.append('title',title.trim());
    form.append('message',message.trim());
    audiences.forEach(group=>form.append('audiences',group));
    if(file) form.append('attachment',file);
    setSubmitting(true);
    try{
      await api.post('/announcements',form);
      setTitle('');
      setMessage('');
      setAudiences(['TEACHERS']);
      setFile(null);
      if(fileRef.current) fileRef.current.value='';
      flash('Announcement sent successfully');
      await load();
    }catch(error){
      flash(error.message,'error');
    }finally{
      setSubmitting(false);
    }
  };

  const openAnnouncement=async announcement=>{
    const isTeacherView=user?.baseRole==='TEACHER' && announcement.audience.includes('TEACHERS');
    const isHodView=user?.baseRole==='HOD' && announcement.audience.includes('HOD');
    if((isTeacherView||isHodView)&&!announcement.viewed){
      await api.patch(`/announcements/${announcement.id}/view`,{});
      await load();
    }
  };

  const removeAnnouncement=async (announcement,event)=>{
    event.stopPropagation();
    if(!await confirm({title:'Delete this announcement?',message:'It will be removed for all recipients. This action cannot be undone.',confirmLabel:'Delete announcement'})) return;
    try{
      await api.delete(`/announcements/${announcement.id}`);
      flash('Announcement deleted');
      await load();
    }catch(error){
      flash(error.message,'error');
    }
  };

  return <><div className="page-head"><div><p className="eyebrow">COMMUNICATION</p><h1>Announcements</h1><p>Share updates, files, and audio notes with HOD and faculty.</p></div></div>
    {isSupport&&<form className="announcement-form" onSubmit={submit}><h3><Megaphone size={18}/> Send announcement</h3><div className="announcement-grid"><div className="field"><span>Announcement title</span><input value={title} onChange={event=>setTitle(event.target.value)} maxLength={120} placeholder="Sports Week update" /></div><div className="field"><span>Audience</span><div className="announcement-toggles">{['HOD','TEACHERS'].map(group=><label key={group}><input type="checkbox" checked={audiences.includes(group)} onChange={()=>toggleAudience(group)}/> {group==='HOD'?'HOD':'All Teachers'}</label>)}</div></div></div><div className="field"><span>Message</span><textarea value={message} onChange={event=>setMessage(event.target.value)} placeholder="Write the announcement message here..." maxLength={1200} /></div><div className="field"><span>Attachment or voice note</span><div className="announcement-voice-row"><input ref={fileRef} type="file" accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={event=>setFile(event.target.files?.[0]||null)}/><button type="button" className={isRecording?'secondary danger':'secondary'} onPointerDown={handleMicPress} onPointerUp={handleMicRelease} onPointerLeave={handleMicRelease} onPointerCancel={handleMicRelease}>{isRecording?<><MicOff size={15}/> Stop</>:<><Mic size={15}/> Mic</>}</button></div>{file&&<small className="announcement-file-label">Selected file: {file.name}</small>}</div><div className="form-actions"><button className="primary" type="submit" disabled={submitting}>{submitting?'Sending…':'Send announcement'}</button></div></form>}
    <section className="announcement-list">{items.length?items.map(announcement=><div key={announcement.id} className="announcement-card" onClick={()=>openAnnouncement(announcement)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openAnnouncement(announcement);}}} role="button" tabIndex={0}><div className="announcement-header"><div><div className="announcement-meta"><span className="announcement-badge">{announcement.isSender?'Sent by you':'Announcement'}</span><span>{announcement.senderName}</span><span>·</span><span>{formatTimestamp(announcement.createdAt)}</span></div><h3>{announcement.title}</h3></div>{isSupport&&announcement.isSender&&<div className="announcement-actions"><button type="button" className="announcement-delete" onClick={event=>removeAnnouncement(announcement,event)} aria-label="Delete announcement"><Trash2 size={16}/></button></div>}</div><div className="announcement-body"><p>{announcement.message}</p>{announcement.attachmentUrl&&renderAttachment(announcement)}<div className="announcement-readout"><span><strong>{announcement.viewedCount}</strong> / <strong>{announcement.totalRecipients}</strong> recipients viewed</span>{announcement.viewed?<span className="announcement-viewed"><CheckCheck size={14}/> Viewed</span>:<span className="announcement-unread">New</span>}</div></div></div>):<div className="announcement-empty"><Megaphone size={20}/><p>No announcements yet.</p></div>}</section>
  </>;
}

function renderAttachment(announcement){
  const isAudio=announcement.attachmentType?.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|webm)$/i.test(announcement.attachmentUrl||'');
  if(isAudio){
    return <audio className="announcement-audio" controls src={announcement.attachmentUrl} preload="metadata" />;
  }
  return <a className="announcement-attachment" href={announcement.attachmentUrl} target="_blank" rel="noreferrer" onClick={event=>event.stopPropagation()}><FileText size={16}/>{announcement.attachmentName||'View attachment'}</a>;
}


function formatTimestamp(value){
  if(!value) return 'No timestamp';
  const date=new Date(value.replace(' ','T'));
  return Number.isNaN(date.getTime())?value:date.toLocaleString();
}
