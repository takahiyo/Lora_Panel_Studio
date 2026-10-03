import fs from 'node:fs/promises';
const base=new URL('./',import.meta.url), read=p=>fs.readFile(new URL(p,base),'utf8');
let html=await read('src/shell.html');
const image=await fs.readFile(new URL('assets/reference.png',base));
let sample=(await read('src/sample.js')).replace('/*__IMAGE__*/',`data:image/png;base64,${image.toString('base64')}`);
for(const[token,value]of[['STYLE',await read('src/style.css')],['CORE',await read('src/core.js')],['AI_CORE',await read('src/ai-core.js')],['ZIP',await read('src/zip.js')],['SAMPLE',sample],['APP',await read('src/app.js')]]) html=html.replace(`/*__${token}__*/`,()=>value);
await fs.writeFile(new URL('index.html',base),html);
console.log(`Built index.html (${Math.round(Buffer.byteLength(html)/1024)} KiB). AI assets served from vendor/ and models/.`);
