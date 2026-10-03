import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const base=new URL('./',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('assets/ai-assets.json',base),'utf8'));
for(const asset of manifest.files){const bytes=await fs.readFile(new URL(asset.path,base)),hash=createHash('sha256').update(bytes).digest('hex');if(bytes.length!==asset.bytes||hash!==asset.sha256)throw Error(`Asset integrity mismatch: ${asset.path}`);console.log(`Verified ${asset.path}`);}
