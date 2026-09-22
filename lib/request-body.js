import 'server-only';

const plainObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);

function contentType(request){
  return String(request.headers.get('content-type')||'').split(';',1)[0].trim().toLowerCase();
}

async function readLimitedBytes(request,maxBytes){
  const declared=Number(request.headers.get('content-length') || 0);
  if(Number.isFinite(declared) && declared>maxBytes) throw new Error('Request is too large.');
  const reader=request.body?.getReader();
  if(!reader) throw new Error('Empty request.');
  const chunks=[];let size=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>maxBytes){await reader.cancel();throw new Error('Request is too large.');}
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return bytes;
}

function decodeUtf8(bytes){
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
  catch{throw new Error('Invalid text encoding.');}
}

export function assertAllowedKeys(value,allowed,label='request'){
  if(!plainObject(value)) throw new Error('Invalid request.');
  const permitted=new Set(allowed);
  if(Object.keys(value).some(key=>!permitted.has(key))) throw new Error(`Unsupported ${label} field.`);
  return value;
}

export function assertAllowedFormKeys(form,allowed){
  const permitted=new Set(allowed);
  for(const key of new Set(form.keys())) if(!permitted.has(key)) throw new Error('Unsupported form field.');
  return form;
}

export async function readLimitedJson(request,maxBytes=8192){
  if(contentType(request)!=='application/json') throw new Error('Send JSON.');
  const bytes=await readLimitedBytes(request,maxBytes);
  try{return JSON.parse(decodeUtf8(bytes));}catch(error){
    if(error?.message==='Invalid text encoding.') throw error;
    throw new Error('Invalid JSON.');
  }
}

export async function readLimitedForm(request,maxBytes=12288){
  if(contentType(request)!=='application/x-www-form-urlencoded') throw new Error('Send form data.');
  const bytes=await readLimitedBytes(request,maxBytes);
  return new URLSearchParams(decodeUtf8(bytes));
}
