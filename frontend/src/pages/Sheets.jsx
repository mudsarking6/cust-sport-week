import {useEffect,useMemo,useState} from 'react';
import {ClipboardList,Download,ExternalLink,FileCheck2,FileClock,Plus,Search,Users} from 'lucide-react';
import {Link,useNavigate} from 'react-router-dom';
import {api} from '../api';
import {useAuth,useToast} from '../App';
import Modal,{Field} from '../components/Modal';
import {useConfirm} from '../components/ConfirmationDialog';

export default function Sheets(){
  const {user}=useAuth();
  const flash=useToast();
  const confirm=useConfirm();
  const navigate=useNavigate();
  const [list,setList]=useState([]);
  const [games,setGames]=useState([]);
  const [q,setQ]=useState('');
  const [modal,setModal]=useState(false);
  const [creating,setCreating]=useState(false);
  const [deleteTarget,setDeleteTarget]=useState(null);

  const load=()=>api.get('/sheets').then(setList);
  useEffect(()=>{load();api.get('/games').then(setGames)},[]);
  const filtered=useMemo(()=>list.filter(sheet=>(sheet.title+sheet.game+sheet.submittedBy).toLowerCase().includes(q.toLowerCase())),[list,q]);

  const create=async event=>{
    event.preventDefault();
    setCreating(true);
    try{
      const data=Object.fromEntries(new FormData(event.currentTarget));
      const result=await api.post('/sheets',{...data,gameId:data.gameId});
      setModal(false);
      flash('Draft sheet created');
      navigate(`/sheets/${result.id}`);
    }catch(error){
      flash(error.message,'error');
    }finally{
      setCreating(false);
    }
  };
  const exportExcel=async sheet=>{
    try{await api.download(`/sheets/${sheet.id}/export`,`${sheet.title}.xlsx`)}
    catch(error){flash(error.message,'error')}
  };
  const remove=async scope=>{
    const everyone=scope==='everyone';
    if(!await confirm({
      title:everyone?'Delete this sheet for everyone?':'Delete this sheet for you?',
      message:everyone?'This permanently removes the sheet and its player records for all users.':'This removes the sheet from your account only.',
      confirmLabel:everyone?'Delete for everyone':'Delete for me'
    }))return;
    try{
      await api.delete(`/sheets/${deleteTarget.id}?scope=${scope}`);
      flash(everyone?'Sheet deleted for everyone':'Sheet deleted for you');
      setDeleteTarget(null);
      load();
    }catch(error){
      flash(error.message,'error');
    }
  };

  return <>
    <div className="page-head">
      <div><p className="eyebrow">PLAYER OPERATIONS</p><h1>Player sheets</h1><p>Create rosters, import Excel files, and track every submission.</p></div>
      <button className="primary" onClick={()=>setModal(true)}><Plus/> New player sheet</button>
    </div>
    <div className="stat-grid compact">
      <article className="stat"><div className="stat-icon c0"><ClipboardList/></div><div><span>Total sheets</span><strong>{list.length}</strong><small>Across all games</small></div></article>
      <article className="stat"><div className="stat-icon c3"><FileClock/></div><div><span>Drafts</span><strong>{list.filter(sheet=>sheet.status==='DRAFT').length}</strong><small>Still editable</small></div></article>
      <article className="stat"><div className="stat-icon c2"><FileCheck2/></div><div><span>Submitted</span><strong>{list.filter(sheet=>sheet.status==='SUBMITTED').length}</strong><small>Ready for review</small></div></article>
    </div>
    <section className="panel table-panel">
      <div className="toolbar">
        <div className="search"><Search/><input value={q} onChange={event=>setQ(event.target.value)} placeholder="Search sheets, games, or game heads…"/></div>
        <span>{filtered.length} sheets</span>
      </div>
      <div className="sheet-cards">{filtered.map(sheet=><article className="sheet-card-wrap" key={sheet.id}>
        <Link to={`/sheets/${sheet.id}`} className="sheet-card">
          <div className="sheet-card-top">
            <div className="sheet-game large">{sheet.game.slice(0,2).toUpperCase()}</div>
            <div className="sheet-card-badges">
              <span className={`direction-badge ${sheet.direction.toLowerCase()}`}>{sheet.direction}</span>
              <span className={`badge ${sheet.status.toLowerCase()}`}>{sheet.status}</span>
            </div>
          </div>
          <h3>{sheet.title}</h3><p>{sheet.game}</p>
          <div className="sheet-meta"><span><Users/> {sheet.playerCount} players</span><span>{new Date(sheet.createdAt+'Z').toLocaleDateString()}</span></div>
          <footer>Prepared by <b>{sheet.submittedBy}</b></footer>
        </Link>
        <div className="sheet-card-actions">
          {sheet.driveFileUrl&&<a className="drive-file-link" href={sheet.driveFileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink/> View Excel File</a>}
          <button onClick={()=>exportExcel(sheet)}><Download/> Export Excel</button>
          <button className="delete-action" onClick={()=>setDeleteTarget(sheet)}>Delete</button>
        </div>
      </article>)}</div>
      {!filtered.length&&<div className="empty"><ClipboardList/><p>No player sheets match your search.</p></div>}
    </section>
    {modal&&<Modal title="Create player sheet" subtitle="Start with a draft, then add players manually or import Excel." onClose={()=>!creating&&setModal(false)}>
      <form className="form-grid" onSubmit={create}>
        <Field label="Sheet title" wide><input name="title" placeholder="e.g. Cricket Men’s Team — Final Roster" required disabled={creating}/></Field>
        <Field label="Game" wide>
          <select name="gameId" required disabled={creating}>
            <option value="">Select game</option>
            {games.filter(game=>game.status==='ACTIVE').map(game=><option key={game.id} value={game.id}>{game.name}</option>)}
          </select>
        </Field>
        <Field label="Notes (optional)" wide><textarea name="notes" rows="3" placeholder="Selection notes or eligibility details" disabled={creating}/></Field>
        <div className="form-actions wide">
          <button type="button" className="ghost" disabled={creating} onClick={()=>setModal(false)}>Cancel</button>
          <button className="primary" disabled={creating}>{creating?'Creating draft…':'Create draft'}</button>
        </div>
      </form>
    </Modal>}
    {deleteTarget&&<DeleteModal sheet={deleteTarget} canEveryone={deleteTarget.submittedById===user.id||user.baseRole==='HOD'||user.displayRole==='Support Coordinator'} remove={remove} close={()=>setDeleteTarget(null)}/>}
  </>;
}

function DeleteModal({sheet,canEveryone,remove,close}){
  return <Modal title="Delete player sheet" subtitle={sheet.title} onClose={close}>
    <div className="delete-sheet-options">
      <button onClick={()=>remove('me')}><div><b>Delete for me</b><span>Only remove it from your account.</span></div></button>
      {canEveryone&&<button className="danger-option" onClick={()=>remove('everyone')}><div><b>Delete for everyone</b><span>Permanently remove it for all users.</span></div></button>}
    </div>
  </Modal>;
}
