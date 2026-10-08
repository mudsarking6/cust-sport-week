import {useEffect,useState} from 'react';
import {ArrowLeft,CheckCircle2,Download,ExternalLink,FileSpreadsheet,Forward,MoreHorizontal,Plus,RefreshCw,Trash2,UploadCloud,Users} from 'lucide-react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {api} from '../api';
import {useAuth,useToast} from '../App';
import Modal,{Field} from '../components/Modal';
import {useConfirm} from '../components/ConfirmationDialog';

const initial={studentName:'',registrationNo:'',department:'Faculty of Computing',semester:'',section:'',contactNo:'',position:''};

export default function SheetDetail(){
  const {id}=useParams();const {user}=useAuth();const flash=useToast();const confirm=useConfirm();const navigate=useNavigate();
  const [sheet,setSheet]=useState(null);const [records,setRecords]=useState([]);const [people,setPeople]=useState([]);const [modal,setModal]=useState(null);const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState('');const [syncing,setSyncing]=useState(false);
  const isSupport=user.displayRole==='Support Coordinator';const canForward=isSupport||user.baseRole==='HOD';const canSync=user.baseRole==='HOD'||isSupport||user.displayRole.endsWith('Game Head');
  const load=async()=>{
    setLoading(true);setLoadError('');
    try{
      const sheets=await api.get('/sheets');
      const current=sheets.find(item=>item.id===id);
      if(!current)throw new Error('This player sheet is unavailable or has not been shared with your account.');
      const playerRecords=await api.get(`/sheets/${id}/records`);
      setSheet(current);setRecords(playerRecords);
    }catch(error){
      setSheet(null);setRecords([]);setLoadError(error.message);
    }finally{
      setLoading(false);
    }
  };
  useEffect(()=>{load();if(canForward)api.get('/users').then(setPeople).catch(error=>flash(error.message,'error'))},[id]);
  if(loading)return <div className="skeleton-page" role="status" aria-label="Loading player sheet"/>;
  if(loadError)return <section className="panel sheet-load-error" role="alert"><h1>Couldn’t open this player sheet</h1><p>{loadError}</p><div><button className="secondary" onClick={load}><RefreshCw/> Try again</button><Link className="primary" to="/sheets">Back to player sheets</Link></div></section>;

  const save=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{modal.id?await api.patch(`/records/${modal.id}`,d):await api.post(`/sheets/${id}/records`,d);flash(modal.id?'Player updated':'Player added');setModal(null);load()}catch(error){flash(error.message,'error')}};
  const remove=async rid=>{if(!await confirm({title:'Remove this player?',message:'The player record will be removed from this sheet.',confirmLabel:'Remove player'}))return;try{await api.delete(`/records/${rid}`);flash('Player removed');load()}catch(error){flash(error.message,'error')}};
  const upload=async e=>{const file=e.target.files[0];if(!file)return;const form=new FormData();form.append('file',file);try{const result=await api.post(`/sheets/${id}/import`,form);flash(result.message);load()}catch(error){flash(error.message,'error')}};
  const submit=async()=>{if(!records.length)return flash('Add at least one player before submitting','error');if(!await confirm({title:'Submit this player sheet?',message:'The sheet will be sent to the Support Coordinator for review.',variant:'primary',confirmLabel:'Submit sheet'}))return;try{await api.post(`/sheets/${id}/submit`,{});flash('Sheet submitted to Support Coordinator');load()}catch(error){flash(error.message,'error')}};
  const forward=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));const [kind,value]=d.target.split(':');const payload={message:d.message,audience:kind==='audience'?value:'USER'};if(kind==='user')payload.userId=value;await api.post(`/sheets/${id}/forward`,payload);flash(kind==='audience'&&value==='HOD'?'Sheet forwarded to HOD':'Sheet forwarded');setModal(null)};
  const exportExcel=async()=>{try{await api.download(`/sheets/${id}/export`,`${sheet.title}.xlsx`)}catch(error){flash(error.message,'error')}};
  const syncDriveExcel=async()=>{setSyncing(true);try{const result=await api.post(`/sheets/${id}/google-sync`,{});flash(result.message,result.driveSyncStatus==='SYNCED'?'success':'error');await load()}catch(error){flash(error.message,'error')}finally{setSyncing(false)}};
  const deleteSheet=async scope=>{const everyone=scope==='everyone';if(!await confirm({title:everyone?'Delete this sheet for everyone?':'Delete this sheet for you?',message:everyone?'This permanently removes the sheet and its player records for all users.':'This removes the sheet from your account only.',confirmLabel:everyone?'Delete for everyone':'Delete for me'}))return;try{await api.delete(`/sheets/${id}?scope=${scope}`);flash(everyone?'Sheet deleted for everyone':'Sheet deleted for you');navigate('/sheets')}catch(error){flash(error.message,'error')}};

  return <>
    <div className="detail-head"><Link to="/sheets" className="back"><ArrowLeft/> Player sheets</Link><div><div><span className="sheet-game large">{sheet.game.slice(0,2).toUpperCase()}</span><div><p className="eyebrow">{sheet.game}</p><h1>{sheet.title}</h1><p>Prepared by {sheet.submittedBy} · {new Date(sheet.createdAt+'Z').toLocaleDateString()}</p></div></div><span className={`badge ${sheet.status.toLowerCase()}`}>{sheet.status}</span></div></div>
    <section className="detail-summary">
      <div><Users/><span><b>{records.length}</b>Players listed</span></div><div><FileSpreadsheet/><span><b>{sheet.fileName||'Manual entry'}</b>Source</span></div><div><CheckCircle2/><span><b>{sheet.status}</b>Submission status</span></div>
      <div className="detail-buttons">{sheet.driveFileUrl&&<a className="secondary" href={sheet.driveFileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink/> View Excel File</a>}{canSync&&<button className="secondary" onClick={syncDriveExcel} disabled={syncing}><RefreshCw/> {syncing?'Syncing…':sheet.driveSyncStatus==='SYNCED'?'Sync Excel File':'Retry Excel sync'}</button>}<button className="secondary" onClick={exportExcel}><Download/> Export Excel</button><label className="secondary upload"><UploadCloud/> Import Excel<input type="file" accept=".xlsx,.xls,.csv" onChange={upload}/></label>{canForward&&<button className="secondary" onClick={()=>setModal({type:'forward'})}><Forward/> Forward</button>}<button className="secondary danger" onClick={()=>setModal({type:'delete'})}><Trash2/> Delete</button>{sheet.status==='DRAFT'&&<button className="primary" onClick={submit}><CheckCircle2/> Submit sheet</button>}</div>
    </section>
    <section className="panel table-panel"><div className="toolbar"><div><h2>Player roster</h2><p>Complete registration and contact information</p></div>{sheet.status==='DRAFT'&&<button className="primary small" onClick={()=>setModal({type:'player',...initial})}><Plus/> Add player</button>}</div><div className="table-wrap"><table><thead><tr><th>Student</th><th>Registration no.</th><th>Department</th><th>Semester / section</th><th>Contact</th><th>Position</th><th></th></tr></thead><tbody>{records.map(x=><tr key={x.id}><td><b>{x.student_name}</b></td><td>{x.registration_no}</td><td>{x.department}</td><td>{x.semester} {x.section&&`· ${x.section}`}</td><td>{x.contact_no||'—'}</td><td>{x.position||'—'}</td><td>{sheet.status==='DRAFT'&&<div className="row-actions"><button onClick={()=>setModal({type:'player',id:x.id,studentName:x.student_name,registrationNo:x.registration_no,department:x.department,semester:x.semester,section:x.section,contactNo:x.contact_no,position:x.position})}><MoreHorizontal/></button><button onClick={()=>remove(x.id)}><Trash2/></button></div>}</td></tr>)}</tbody></table></div>{!records.length&&<div className="empty roster-empty"><Users/><p>No players yet. Add one manually or import an Excel workbook.</p></div>}</section>
    {modal?.type==='player'&&<PlayerModal modal={modal} sheet={sheet} save={save} close={()=>setModal(null)}/>} 
    {modal?.type==='forward'&&<ForwardModal people={people} isSupport={isSupport} forward={forward} close={()=>setModal(null)}/>} 
    {modal?.type==='delete'&&<DeleteSheetModal canDeleteEveryone={sheet.submittedById===user.id||user.baseRole==='HOD'||isSupport} remove={deleteSheet} close={()=>setModal(null)}/>} 
  </>;
}

function PlayerModal({modal,sheet,save,close}){return <Modal size="large" title={modal.id?'Edit player record':'Add player record'} subtitle={`Adding to ${sheet.game}`} onClose={close}><form className="form-grid" onSubmit={save}><Field label="Student name"><input name="studentName" defaultValue={modal.studentName} required/></Field><Field label="Registration number"><input name="registrationNo" defaultValue={modal.registrationNo} required/></Field><Field label="Department"><input name="department" defaultValue={modal.department} required/></Field><Field label="Semester"><input name="semester" defaultValue={modal.semester}/></Field><Field label="Section"><input name="section" defaultValue={modal.section}/></Field><Field label="Contact number"><input name="contactNo" defaultValue={modal.contactNo}/></Field><Field label="Position" wide><input name="position" defaultValue={modal.position} placeholder="e.g. Batsman, Goalkeeper"/></Field><Actions close={close} label="Save player"/></form></Modal>}
function ForwardModal({people,isSupport,forward,close}){const heads=people.flatMap(person=>(person.assignments||'').split(',').map(x=>x.trim()).filter(x=>x.endsWith(' Game Head')).map(role=>({id:person.id,label:`${role.replace(/ Game Head$/,'')} — Game Head ${person.name}`})));return <Modal title="Forward player sheet" subtitle={isSupport?'Send the reviewed sheet to HOD or a registered game head.':'Share this roster with the right audience.'} onClose={close}><form className="form-grid" onSubmit={forward}><Field label="Audience" wide><select name="target" required><option value="audience:HOD">Head of Department (HOD)</option>{heads.map((head,index)=><option key={`${head.id}-${index}`} value={`user:${head.id}`}>{head.label}</option>)}</select></Field><Field label="Message" wide><textarea name="message" rows="4" placeholder="Add context for the recipient"/></Field><Actions close={close} label="Forward sheet"/></form></Modal>}
function Actions({close,label}){return <div className="form-actions wide"><button type="button" className="ghost" onClick={close}>Cancel</button><button className="primary">{label}</button></div>}
function DeleteSheetModal({canDeleteEveryone,remove,close}){return <Modal title="Delete player sheet" subtitle="Choose where this sheet should be removed." onClose={close}><div className="delete-sheet-options"><button onClick={()=>remove('me')}><Trash2/><div><b>Delete for me</b><span>Hide this sheet only from your account.</span></div></button>{canDeleteEveryone&&<button className="danger-option" onClick={()=>remove('everyone')}><Trash2/><div><b>Delete for everyone</b><span>Permanently remove the sheet and player records.</span></div></button>}</div></Modal>}
