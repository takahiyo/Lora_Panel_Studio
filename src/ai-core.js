/* Pure tile mathematics shared with the inference worker. */
(function(root){
  'use strict';
  const MODEL={id:'realesr-animevideov3',scale:4,sha256:'7fcf233cfb4e6c3f1a35f41a62675ba4ff7d711beec3d06623773138ef77143f',bytes:2535266};
  const TILE=96,HALO=20,INPUT=TILE+HALO*2;
  function size(w,h,factor,square=false){
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||![2,4].includes(factor))throw Error('AI拡大の寸法・倍率が不正です。');
    if(w*h*16>64000000||Math.max(w,h)*factor>8192)throw Error('AI拡大は原寸400万画素以下・出力各辺8192px以下です。枠を小さくしてください。');
    const dw=w*factor,dh=h*factor,edge=Math.max(dw,dh),width=square?edge:dw,height=square?edge:dh;
    if(width*height>64000000)throw Error('正方形出力が6400万画素を超えます。');
    return {width,height,drawWidth:dw,drawHeight:dh,scale:factor};
  }
  function tiles(w,h){const result=[];for(let y=0;y<h;y+=TILE)for(let x=0;x<w;x+=TILE)result.push({x,y,w:Math.min(TILE,w-x),h:Math.min(TILE,h-y)});return result;}
  function reflect(p,n){if(n===1)return 0;const period=2*(n-1);p=((p%period)+period)%period;return p<n?p:period-p;}
  function input(rgba,w,h,t){
    if(rgba.length!==w*h*4)throw Error('入力画素数が一致しません。');
    const plane=INPUT*INPUT,data=new Float32Array(plane*3);
    for(let y=0;y<INPUT;y++)for(let x=0;x<INPUT;x++){
      const p=(reflect(t.y+y-HALO,h)*w+reflect(t.x+x-HALO,w))*4,i=y*INPUT+x;
      for(let c=0;c<3;c++)data[c*plane+i]=rgba[p+c]/255;
    }return data;
  }
  function stitch(target,width,t,rgb,shape){
    const side=INPUT*4,plane=side*side;
    if(!shape||shape.length!==4||shape[0]!==1||shape[1]!==3||shape[2]!==side||shape[3]!==side||rgb.length!==plane*3)throw Error('モデルの出力形状が想定と異なります。');
    for(let y=0;y<t.h*4;y++)for(let x=0;x<t.w*4;x++){
      const p=((t.y*4+y)*width+t.x*4+x)*4,i=(y+HALO*4)*side+x+HALO*4;
      for(let c=0;c<3;c++){const v=rgb[c*plane+i];if(!Number.isFinite(v))throw Error('モデルが不正な画素を出力しました。');target[p+c]=Math.round(Math.max(0,Math.min(1,v))*255);}target[p+3]=255;
    }
  }
  const api={MODEL,TILE,HALO,INPUT,size,tiles,reflect,input,stitch};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PanelAI=api;
})(typeof globalThis!=='undefined'?globalThis:this);
