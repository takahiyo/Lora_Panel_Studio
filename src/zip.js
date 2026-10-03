/* ZIP STORE writer: UTF-8 filenames, CRC32, no network/library requirement. */
(function(root){
  'use strict';
  const table=new Uint32Array(256);
  for(let i=0;i<256;i++){let v=i;for(let j=0;j<8;j++) v=(v&1)?0xedb88320^(v>>>1):v>>>1;table[i]=v>>>0;}
  function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=table[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
  function header(length){const a=new Uint8Array(length);return {a,v:new DataView(a.buffer)};}
  async function pack(entries){
    if(entries.length>65535)throw new Error('ZIPのファイル数が多すぎます。');
    const encoder=new TextEncoder(), parts=[], central=[];let offset=0,centralSize=0;
    for(const entry of entries){
      if(typeof entry.name!=='string' || entry.name.startsWith('/') || entry.name.includes('..') || entry.name.includes('\\'))throw new Error('ZIPファイル名が不正です。');
      const name=encoder.encode(entry.name), data=entry.data instanceof Uint8Array?entry.data:new Uint8Array(await entry.data.arrayBuffer()), crc=crc32(data);
      if(name.length>65535 || offset+data.length>0xffffffff)throw new Error('ZIPが大きすぎます。');
      const h=header(30);h.v.setUint32(0,0x04034b50,true);h.v.setUint16(4,20,true);h.v.setUint16(6,0x800,true);h.v.setUint16(12,33,true);h.v.setUint32(14,crc,true);h.v.setUint32(18,data.length,true);h.v.setUint32(22,data.length,true);h.v.setUint16(26,name.length,true);
      parts.push(h.a,name,data);
      const c=header(46);c.v.setUint32(0,0x02014b50,true);c.v.setUint16(4,20,true);c.v.setUint16(6,20,true);c.v.setUint16(8,0x800,true);c.v.setUint16(14,33,true);c.v.setUint32(16,crc,true);c.v.setUint32(20,data.length,true);c.v.setUint32(24,data.length,true);c.v.setUint16(28,name.length,true);c.v.setUint32(42,offset,true);
      central.push(c.a,name);centralSize+=46+name.length;offset+=30+name.length+data.length;
    }
    const end=header(22);end.v.setUint32(0,0x06054b50,true);end.v.setUint16(8,entries.length,true);end.v.setUint16(10,entries.length,true);end.v.setUint32(12,centralSize,true);end.v.setUint32(16,offset,true);
    return new Blob([...parts,...central,end.a],{type:'application/zip'});
  }
  const api={pack,crc32};if(typeof module!=='undefined' && module.exports)module.exports=api;else root.PanelZip=api;
})(globalThis);
