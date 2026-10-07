import {X} from 'lucide-react';
export default function Modal({title,subtitle,onClose,children,size=''}){return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className={`modal ${size}`}><header><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-btn" onClick={onClose}><X size={19}/></button></header>{children}</section></div>}
export function Field({label,children,wide=false}){return <label className={wide?'field wide':'field'}><span>{label}</span>{children}</label>}
