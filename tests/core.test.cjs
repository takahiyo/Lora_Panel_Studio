const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');
function sheet(width,height,vertical,horizontal,color=[255,0,255]){
  const a=new Uint8ClampedArray(width*height*4);for(let p=0;p<a.length;p+=4){a[p]=248;a[p+1]=246;a[p+2]=240;a[p+3]=255;}
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(vertical.some(([s,e])=>x>=s&&x<=e)||horizontal.some(([s,e])=>y>=s&&y<=e)){const p=(y*width+x)*4;a.set([...color,255],p);}return a;
}
test('off-center thick lines crop their interiors rather than assume equal grid',()=>{
  const data=sheet(240,180,[[0,3],[71,75],[155,161],[236,239]],[[0,4],[82,87],[176,179]],[239,20,242]);
  const result=C.detect(data,240,180,{rows:2,cols:3,inset:2,tolerance:25,coverage:.7});
  assert.equal(result.rects.length,6);assert.deepEqual(C.pixelBox(result.rects[0],240,180),{x:6,y:7,w:63,h:73});assert.deepEqual(C.pixelBox(result.rects[5],240,180),{x:164,y:90,w:70,h:84});
});
test('missing/extra lines and transparent magenta never report successful grid',()=>{
  const d=sheet(120,120,[[0,2],[59,61],[117,119]],[[0,2],[117,119]]);
  assert.throws(()=>C.detect(d,120,120,{rows:2,cols:2}),/横 2\/3/);
  for(let p=0;p<d.length;p+=4)d[p+3]=0;
  assert.throws(()=>C.detect(d,120,120,{rows:1,cols:2}),/縦 0\/3/);
});
test('odd image dimensions have predictable crops, margins and pixel limits',()=>{
  const rects=C.grid(1055,1491,2,3,4);assert.equal(rects.length,6);
  for(const r of rects){const b=C.pixelBox(r,1055,1491);assert.ok(b.x>=4 && b.y>=4 && b.x+b.w<=1051 && b.y+b.h<=1487);}
  assert.throws(()=>C.grid(80,80,2,2,30),/余白/);assert.throws(()=>C.grid(1024,1024,10,10),/80/);
  assert.throws(()=>C.pixelBox(C.makeRect(0,0,.000001,.2,'tiny'),100,100),/1画素/);
});
test('resize preserves portrait proportions and square mode pads rather than stretches',()=>{
  assert.deepEqual(C.outputSize(200,500,1024),{width:410,height:1024,drawWidth:410,drawHeight:1024,scale:2.048});
  assert.deepEqual(C.outputSize(200,500,1024,true),{width:1024,height:1024,drawWidth:410,drawHeight:1024,scale:2.048});
  assert.deepEqual(C.outputSize(200,500,0,true),{width:500,height:500,drawWidth:200,drawHeight:500,scale:1});
});
test('templates preserve selection/captions and reject corrupt coordinates/configuration',()=>{
  const r={...C.makeRect(.1,.2,.3,.4,'顔'),enabled:false,caption:'smiling'};
  const t=C.template([r],{width:1536,height:1024},{edge:1024,square:false,originals:true,trigger:'my_char'});
  const roundtrip=C.readTemplate(JSON.parse(JSON.stringify(t)));assert.deepEqual(roundtrip.rects,[r]);
  assert.throws(()=>C.readTemplate({...t,rects:[{...r,w:1}]}),/内側/);
  assert.throws(()=>C.readTemplate({...t,settings:{...t.settings,edge:999999}}),/出力設定/);
  assert.throws(()=>C.readTemplate({...t,rects:[{...r,x:NaN}]}),/座標/);
});
test('filename generation prevents paths, Windows device names and collisions by index',()=>{
  assert.equal(C.filename('CON',0),'001__CON');const unsafe=C.filename('../face\\front:*?',1);assert.ok(!/[<>:"/\\|?*]/.test(unsafe));assert.ok(!unsafe.includes('..'));
  assert.notEqual(C.filename('face',0),C.filename('face',1));assert.equal(C.filename('',2),'003_panel');
  assert.equal(C.filename('<img src=x onerror=alert(1)>',0).includes('<'),false);
});
test('prompts match requested matrix/color and describe reference dimensions without guarantee',()=>{
  const p=C.prompt({rows:1,cols:3,preset:'body',size:[1536,1024],color:'#ff00ff'});
  assert.match(p,/1行×3列/);assert.match(p,/参考 1536×1024/);assert.match(p,/頭頂から靴まで/);assert.match(p,/#ff00ff/);
});
