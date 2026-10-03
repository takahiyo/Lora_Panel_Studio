/* No network inference: only same-origin runtime/model GETs. Stop terminates this worker. */
'use strict';
importScripts('./ai-core.js','../vendor/ort.webgpu.min.js');
ort.env.wasm.wasmPaths=new URL('../vendor/',self.location.href).href;
ort.env.wasm.numThreads=1;
ort.env.wasm.proxy=false;
let session=null,provider='',preference='';
const send=(type,values={})=>postMessage({type,...values});
async function initialize(requested){
  if(session&&preference===requested)return;
  if(session)await session.release();session=null;
  send('progress',{text:'AIモデルを準備しています…'});
  const response=await fetch(new URL('../models/realesr-animevideov3.onnx',self.location.href));
  if(!response.ok)throw Error('AIモデルを読み込めません。modelsフォルダーを確認してください。');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength!==PanelAI.MODEL.bytes)throw Error('モデルのサイズが一致しません。');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==PanelAI.MODEL.sha256)throw Error('モデルのSHA256が一致しません。');
  const adapter=requested==='auto'&&self.navigator.gpu?await self.navigator.gpu.requestAdapter().catch(()=>null):null;
  let note='';
  if(adapter){try{session=await ort.InferenceSession.create(bytes,{executionProviders:['webgpu'],graphOptimizationLevel:'all'});provider='webgpu';}catch(e){note='GPU初期化に失敗したためCPUで処理します。';send('progress',{text:`GPU初期化: ${e.message}`});console.error(e);}}
  if(!session){session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});provider='wasm';if(!note)note=requested==='auto'?'WebGPUを利用できないためCPUで処理します。':'CPUで処理します。';}
  preference=requested;send('provider',{provider,note});
}
onmessage=async({data:job})=>{
  try{
    await initialize(job.provider);const {width:w,height:h,factor,square}=job;
    PanelAI.size(w,h,factor,square);
    const rgba=new Uint8ClampedArray(job.pixels),list=PanelAI.tiles(w,h),result=new Uint8ClampedArray(w*h*16*4);
    for(let i=0;i<list.length;i++){
      send('progress',{text:`AI処理 ${i+1} / ${list.length} タイル · ${provider==='webgpu'?'GPU':'CPU'}`,done:i,total:list.length});
      const input=new ort.Tensor('float32',PanelAI.input(rgba,w,h,list[i]),[1,3,PanelAI.INPUT,PanelAI.INPUT]);let outputs;
      try{outputs=await session.run({[session.inputNames[0]]:input});const output=outputs[session.outputNames[0]];PanelAI.stitch(result,w*4,list[i],await output.getData(),output.dims);}finally{input.dispose();if(outputs)Object.values(outputs).forEach(t=>t.dispose());}
    }
    const native=new OffscreenCanvas(w*4,h*4),ng=native.getContext('2d');ng.putImageData(new ImageData(result,w*4,h*4),0,0);
    // Preserve transparency via an independent high-quality alpha resize.
    if(rgba.some((v,i)=>i%4===3&&v!==255)){
      const alpha=new OffscreenCanvas(w,h),ag=alpha.getContext('2d'),mask=new Uint8ClampedArray(rgba.length);
      for(let i=0;i<rgba.length;i+=4){mask[i]=mask[i+1]=mask[i+2]=255;mask[i+3]=rgba[i+3];}ag.putImageData(new ImageData(mask,w,h),0,0);
      ng.globalCompositeOperation='destination-in';ng.imageSmoothingQuality='high';ng.drawImage(alpha,0,0,w*4,h*4);ng.globalCompositeOperation='source-over';
    }
    const size=PanelAI.size(w,h,factor,square),canvas=new OffscreenCanvas(size.width,size.height),g=canvas.getContext('2d');
    if(square){g.fillStyle='#fffefa';g.fillRect(0,0,size.width,size.height);}g.imageSmoothingQuality='high';g.drawImage(native,(size.width-size.drawWidth)/2,(size.height-size.drawHeight)/2,size.drawWidth,size.drawHeight);
    send('complete',{blob:await canvas.convertToBlob({type:'image/png'}),size,provider,model:PanelAI.MODEL.id,nativeScale:4});
  }catch(e){send('error',{text:e.message||String(e)});}
};
