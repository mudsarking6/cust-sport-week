import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {AlertTriangle,CheckCircle2} from 'lucide-react';

const ConfirmationContext=createContext(null);

export function useConfirm(){
  const confirm=useContext(ConfirmationContext);
  if(!confirm)throw new Error('useConfirm must be used inside ConfirmationProvider');
  return confirm;
}

export function ConfirmationProvider({children}){
  const [dialog,setDialog]=useState(null);
  const resolver=useRef(null);
  const cancelButton=useRef(null);

  const finish=useCallback(confirmed=>{
    const resolve=resolver.current;
    resolver.current=null;
    setDialog(null);
    resolve?.(confirmed);
  },[]);

  const confirm=useCallback(options=>new Promise(resolve=>{
    resolver.current?.(false);
    resolver.current=resolve;
    setDialog({variant:'danger',confirmLabel:'Confirm',cancelLabel:'Cancel',...options});
  }),[]);

  useEffect(()=>{
    if(!dialog)return undefined;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    cancelButton.current?.focus();
    const onKeyDown=event=>{
      if(event.key==='Escape'){
        event.preventDefault();
        finish(false);
      }else if(event.key==='Tab'){
        const buttons=[...document.querySelectorAll('.confirmation-dialog button:not(:disabled)')];
        if(buttons.length!==2)return;
        if(event.shiftKey&&document.activeElement===buttons[0]){
          event.preventDefault();
          buttons[1].focus();
        }else if(!event.shiftKey&&document.activeElement===buttons[1]){
          event.preventDefault();
          buttons[0].focus();
        }
      }
    };
    document.addEventListener('keydown',onKeyDown);
    return ()=>{
      document.body.style.overflow=previousOverflow;
      document.removeEventListener('keydown',onKeyDown);
    };
  },[dialog,finish]);

  useEffect(()=>()=>resolver.current?.(false),[]);

  return <ConfirmationContext.Provider value={confirm}>
    {children}
    {dialog&&<div className="confirmation-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)finish(false)}}>
      <section className="confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-message">
        <div className={`confirmation-icon ${dialog.variant==='danger'?'danger':'success'}`}>{dialog.variant==='danger'?<AlertTriangle aria-hidden="true"/>:<CheckCircle2 aria-hidden="true"/>}</div>
        <h2 id="confirmation-title">{dialog.title}</h2>
        <p id="confirmation-message">{dialog.message}</p>
        <div className="confirmation-actions">
          <button ref={cancelButton} type="button" className="confirmation-cancel" onClick={()=>finish(false)}>{dialog.cancelLabel}</button>
          <button type="button" className={`confirmation-submit ${dialog.variant==='danger'?'danger':'primary'}`} onClick={()=>finish(true)}>{dialog.confirmLabel}</button>
        </div>
      </section>
    </div>}
  </ConfirmationContext.Provider>;
}
