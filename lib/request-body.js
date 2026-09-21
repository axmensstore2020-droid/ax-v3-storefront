import 'server-only';

export async function readLimitedJson(request,maxBytes=8192){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('Send JSON.');
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
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Error('Invalid JSON.');}
}
