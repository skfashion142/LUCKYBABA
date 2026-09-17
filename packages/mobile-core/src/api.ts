import * as SecureStore from'expo-secure-store';
const TOKEN='commerce.session.token';
export async function getToken(){return SecureStore.getItemAsync(TOKEN)}
export async function setToken(v:string){return SecureStore.setItemAsync(TOKEN,v)}
export async function clearToken(){return SecureStore.deleteItemAsync(TOKEN)}
export async function session(base:string){return api(base,'/v1/auth/session')}
export async function api(base:string,path:string,opts:RequestInit={}){const token=await getToken();const headers=new Headers(opts.headers||{});headers.set('Accept','application/json');if(opts.body&&typeof opts.body!=='string')headers.set('Content-Type','application/json');if(typeof opts.body==='string'&& !headers.has('Content-Type'))headers.set('Content-Type','application/json');if(token)headers.set('Authorization',`Bearer ${token}`);const res=await fetch(`${base.replace(/\/$/,'')}${path}`,{...opts,headers});let body:any=null;const text=await res.text();try{body=text?JSON.parse(text):null}catch{body=text}if(!res.ok)throw new Error(body?.error||`HTTP_${res.status}`);return body}
export async function upload(base:string,token:string,fileUri:string,contentType:string,extension:string){const blob=await (await fetch(fileUri)).blob();const pre=await api(base,'/v1/uploads/presign',{method:'POST',body:JSON.stringify({contentType,extension,sizeBytes:blob.size})});const r=await fetch(pre.uploadUrl,{method:'PUT',headers:{'Content-Type':contentType,'Content-Length':String(blob.size)},body:blob});if(!r.ok)throw new Error('UPLOAD_FAILED');return pre.objectKey as string}
