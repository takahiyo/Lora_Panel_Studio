const {test}=require('node:test');const assert=require('node:assert/strict');const {pack,crc32}=require('../src/zip.js');
test('CRC32 agrees with known vector',()=>{assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);});
test('UTF-8 ZIP offsets, directory, sizes, CRC and payload are internally readable',async()=>{
  const input=[{name:'resized/001_顔.txt',data:new TextEncoder().encode('my_char, smiling\n')},{name:'manifest.json',data:new Blob(['{}'])}];
  const bytes=new Uint8Array(await (await pack(input)).arrayBuffer()),v=new DataView(bytes.buffer),end=bytes.length-22;
  assert.equal(v.getUint32(end,true),0x06054b50);assert.equal(v.getUint16(end+10,true),2);
  let p=v.getUint32(end+16,true);const decoder=new TextDecoder();
  for(const entry of input){assert.equal(v.getUint32(p,true),0x02014b50);assert.equal(v.getUint16(p+8,true),0x800);const n=v.getUint16(p+28,true),size=v.getUint32(p+24,true),offset=v.getUint32(p+42,true);assert.equal(decoder.decode(bytes.slice(p+46,p+46+n)),entry.name);assert.equal(v.getUint32(offset,true),0x04034b50);const body=bytes.slice(offset+30+n,offset+30+n+size);assert.equal(crc32(body),v.getUint32(p+16,true));const expected=entry.data instanceof Uint8Array?entry.data:new Uint8Array(await entry.data.arrayBuffer());assert.deepEqual(body,expected);p+=46+n;}
  assert.equal(p,end);
});
test('ZIP rejects unsafe paths',async()=>{await assert.rejects(pack([{name:'../escape.txt',data:new Uint8Array([1])}]),/不正/);});
