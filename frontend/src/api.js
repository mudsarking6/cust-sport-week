const API=(import.meta.env.VITE_API_URL||'/api').replace(/\/+$/,'');
let onUnauthorized=null;export const setOnUnauthorized=fn=>{onUnauthorized=fn};

export async function request(path,options={}){
  const {timeoutMs=15000,...fetchOptions}=options;
  const token=localStorage.getItem('cust_token');
  const headers={...(fetchOptions.body instanceof FormData?{}:{'Content-Type':'application/json'}),...fetchOptions.headers};
  if(token)headers.Authorization=`Bearer ${token}`;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetch(API+path,{...fetchOptions,headers,signal:controller.signal});
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      if(res.status===401){localStorage.removeItem('cust_token');localStorage.removeItem('cust_user');if(onUnauthorized)onUnauthorized()}
      const error=new Error(data.message||'Request failed');error.status=res.status;throw error;
    }
    return data;
  }catch(error){
    if(error.name==='AbortError')throw new Error('The server is taking too long to respond. Check your connection and try again.');
    if(error instanceof TypeError)throw new Error('Unable to connect to the server. Check your internet connection and try again.');
    throw error;
  }finally{clearTimeout(timer)}
}

async function download(path,fallbackName='export.xlsx'){
  const token=localStorage.getItem('cust_token');
  const res=await fetch(API+path,{headers:{Authorization:`Bearer ${token}`}});
  if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error(data.message||'Download failed')}
  const disposition=res.headers.get('content-disposition')||'';const name=disposition.match(/filename="?([^";]+)"?/)?.[1]||fallbackName;
  const url=URL.createObjectURL(await res.blob());const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}

export const api={
  get:(path,options)=>request(path,options),
  post:(path,body,options={})=>request(path,{...options,method:'POST',body:body instanceof FormData?body:JSON.stringify(body)}),
  patch:(path,body,options={})=>request(path,{...options,method:'PATCH',body:JSON.stringify(body)}),
  delete:(path,options={})=>request(path,{...options,method:'DELETE'}),
  download
};
