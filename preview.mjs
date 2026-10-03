// Static files only; inference always runs in the browser. No uploads or API routes.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./',import.meta.url)),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm','.onnx':'application/octet-stream','.png':'image/png','.json':'application/json; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),target=path.resolve(root,'.'+(name==='/'?'/index.html':name));
    if(!target.startsWith(root)||!(name==='/'||name==='/index.html'||/^\/(src|vendor|models|assets)\/[\w.\/-]+$/.test(name))){res.writeHead(404);res.end();return;}
    const real=await fs.realpath(target);if(!real.startsWith(root)){res.writeHead(403);res.end();return;}
    const content=await fs.readFile(real);res.setHeader('Content-Type',mime[path.extname(real)]||'application/octet-stream');res.setHeader('Cache-Control',name.startsWith('/vendor/')||name.startsWith('/models/')?'public, max-age=86400':'no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port 8765 is in use. Stop the previous preview first.':error.message);process.exitCode=1;});
server.listen(8765,'127.0.0.1',()=>console.log('LoRA Panel Studio: http://127.0.0.1:8765/\nStatic preview only. Press Ctrl+C to stop.'));
