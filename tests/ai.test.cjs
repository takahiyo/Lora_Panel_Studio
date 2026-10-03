const {test}=require('node:test'),assert=require('node:assert/strict'),A=require('../src/ai-core.js'),C=require('../src/core.js');
test('AI sizes validate exact 2x, 4x, square and allocation limits',()=>{assert.deepEqual(A.size(91,123,2),{width:182,height:246,drawWidth:182,drawHeight:246,scale:2});assert.equal(A.size(91,123,4,true).width,492);assert.throws(()=>A.size(3000,3000,2));assert.throws(()=>A.size(100,100,3));assert.throws(()=>A.size(1,8192,2));});
test('halo tiles stitch every edge exactly once and discard artificial boundaries',()=>{
 const w=99,h=102,rgba=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=(y*w+x)*4;rgba[p]=x;rgba[p+1]=y;rgba[p+2]=55;rgba[p+3]=255;}
 const target=new Uint8ClampedArray(w*h*16*4),list=A.tiles(w,h);assert.equal(list.length,4);
 for(const t of list){const input=A.input(rgba,w,h,t),side=A.INPUT*4,plane=side*side,rgb=new Float32Array(plane*3);for(let c=0;c<3;c++)for(let y=0;y<side;y++)for(let x=0;x<side;x++)rgb[c*plane+y*side+x]=input[c*A.INPUT*A.INPUT+Math.floor(y/4)*A.INPUT+Math.floor(x/4)];A.stitch(target,w*4,t,rgb,[1,3,side,side]);}
 for(let y=0;y<h*4;y++)for(let x=0;x<w*4;x++){const p=(y*w*4+x)*4;assert.equal(target[p],Math.floor(x/4));assert.equal(target[p+1],Math.floor(y/4));assert.equal(target[p+2],55);assert.equal(target[p+3],255);}
 assert.equal(A.reflect(-1,5),1);assert.equal(A.reflect(5,5),3);assert.equal(A.reflect(99,1),0);assert.throws(()=>A.stitch(target,w*4,list[0],[],[1,3,1,1]));
});
test('old templates remain readable, corrupt AI options are rejected',()=>{const t=C.template([C.makeRect(0,0,1,1,'face')],{width:100,height:100},{edge:1024,square:false,originals:true,trigger:''});assert.equal(C.readTemplate(t).settings.mode,'resize');t.settings={...t.settings,mode:'ai',factor:4,provider:'wasm'};assert.equal(C.readTemplate(t).settings.factor,4);t.settings.factor=99;assert.throws(()=>C.readTemplate(t));});
