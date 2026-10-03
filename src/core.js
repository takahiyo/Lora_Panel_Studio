/* Shared by the offline browser app and Node tests. Rectangles use normalized edges. */
(function (root) {
  'use strict';
  const VERSION = '0.2.0';
  const PRESETS = {
    expressions: {title:'表情', rows:2, cols:3, size:[1536,1024], names:['neutral','happy_smile','surprised','angry','embarrassed','eyes_closed'], descriptions:['通常の表情','明るい笑顔','驚き','怒り','照れ','目を閉じた笑顔']},
    views: {title:'顔の三面図', rows:1, cols:3, size:[1536,1024], names:['face_front','face_side','face_back'], descriptions:['顔の正面','顔の側面','頭部の背面']},
    body: {title:'全身の三面図', rows:1, cols:3, size:[1536,1024], names:['body_front','body_side','body_back'], descriptions:['全身の正面','全身の側面','全身の背面']},
    details: {title:'髪・衣装の詳細', rows:2, cols:2, size:[1024,1024], names:['hair_detail','ribbon_detail','neckline_detail','outfit_detail'], descriptions:['髪の詳細','リボンの詳細','襟元の詳細','衣装の詳細']},
    custom: {title:'カスタム', rows:2, cols:3, size:[1536,1024], names:[], descriptions:[]}
  };
  function integer(n, min, max, title) {
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${title}は${min}〜${max}の整数で指定してください。`);
    return n;
  }
  function validRect(r) {
    if (!r || !['x','y','w','h'].every(k => typeof r[k] === 'number' && Number.isFinite(r[k]))) throw new Error('切り出し座標が不正です。');
    if (r.x < 0 || r.y < 0 || r.w <= 0 || r.h <= 0 || r.x+r.w > 1+1e-8 || r.y+r.h > 1+1e-8) throw new Error('切り出し枠は画像の内側に指定してください。');
    if (typeof r.name !== 'string' || r.name.length > 120 || typeof r.caption !== 'string' || r.caption.length > 2000 || typeof r.enabled !== 'boolean') throw new Error('枠の名前・キャプション・選択状態が不正です。');
    return r;
  }
  function makeRect(x,y,w,h,name) {return validRect({x,y,w,h,name,caption:'',enabled:true});}
  function pixelBox(r, width, height) {
    validRect(r); integer(width,1,8192,'画像幅'); integer(height,1,8192,'画像高さ');
    const x = Math.max(0,Math.round(r.x*width)), y=Math.max(0,Math.round(r.y*height));
    const right=Math.min(width,Math.round((r.x+r.w)*width)), bottom=Math.min(height,Math.round((r.y+r.h)*height));
    if(right<=x || bottom<=y) throw new Error('1画素未満の枠は保存できません。');
    return {x,y,w:right-x,h:bottom-y};
  }
  function grid(width,height,rows,cols,inset=4,names=[]) {
    integer(rows,1,10,'行数'); integer(cols,1,10,'列数'); integer(inset,0,100,'内側余白');
    if(rows*cols>80) throw new Error('枠は最大80個です。');
    const result=[];
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
      const left=Math.round(c*width/cols)+inset, top=Math.round(r*height/rows)+inset;
      const right=Math.round((c+1)*width/cols)-inset, bottom=Math.round((r+1)*height/rows)-inset;
      if(right-left<8 || bottom-top<8) throw new Error('余白が大きすぎます。各枠は8画素以上必要です。');
      result.push(makeRect(left/width,top/height,(right-left)/width,(bottom-top)/height,names[result.length] || `panel_${String(result.length+1).padStart(2,'0')}`));
    }
    return result;
  }
  function colorRGB(hex) {
    if(typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('枠線の色は6桁のカラーコードで指定してください。');
    return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  }
  function bands(scores, threshold) {
    const found=[]; let start=-1;
    for(let i=0;i<=scores.length;i++) {
      if(i<scores.length && scores[i]>=threshold) {if(start<0) start=i;}
      else if(start>=0) {found.push({start,end:i-1});start=-1;}
    }
    return found;
  }
  /* Color coverage across entire rows/columns rejects local character strokes. No guessed fallback. */
  function detect(data,width,height,options) {
    const {rows,cols,color='#ff00ff',tolerance=80,coverage=0.7,inset=4,names=[]}=options;
    integer(rows,1,10,'行数'); integer(cols,1,10,'列数'); integer(tolerance,0,180,'色の許容差'); integer(inset,0,100,'内側余白');
    if(rows*cols>80 || width*height>36000000 || data.length!==width*height*4) throw new Error('検出対象の画像または枠数が不正です。');
    if(!Number.isFinite(coverage) || coverage<0.3 || coverage>1) throw new Error('線の連続率は30〜100%で指定してください。');
    const rgb=colorRGB(color), xs=new Float64Array(width), ys=new Float64Array(height);
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
      const p=(y*width+x)*4;
      if(data[p+3]<128) continue;
      if(Math.max(Math.abs(data[p]-rgb[0]),Math.abs(data[p+1]-rgb[1]),Math.abs(data[p+2]-rgb[2]))<=tolerance) {xs[x]++;ys[y]++;}
    }
    const vertical=bands(xs,height*coverage), horizontal=bands(ys,width*coverage);
    if(vertical.length!==cols+1 || horizontal.length!==rows+1) throw new Error(`枠線を確認してください。縦 ${vertical.length}/${cols+1}本・横 ${horizontal.length}/${rows+1}本を検出しました。色・許容差・連続率・行列数を調整するか、均等分割／手動追加を使用してください。既存の枠は保持しています。`);
    const result=[];
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) {
      const x=vertical[c].end+1+inset, y=horizontal[r].end+1+inset;
      const right=vertical[c+1].start-inset, bottom=horizontal[r+1].start-inset;
      if(right-x<8 || bottom-y<8) throw new Error('枠の間隔が狭すぎます。余白を減らしてください。');
      result.push(makeRect(x/width,y/height,(right-x)/width,(bottom-y)/height,names[result.length] || `panel_${String(result.length+1).padStart(2,'0')}`));
    }
    return {rects:result,vertical,horizontal};
  }
  function outputSize(w,h,longEdge,square=false) {
    integer(w,1,8192,'切り出し幅'); integer(h,1,8192,'切り出し高さ');
    if(longEdge===0) return {width:square?Math.max(w,h):w,height:square?Math.max(w,h):h,drawWidth:w,drawHeight:h,scale:1};
    integer(longEdge,64,4096,'出力長辺');
    const scale=longEdge/Math.max(w,h), dw=Math.max(1,Math.round(w*scale)), dh=Math.max(1,Math.round(h*scale));
    return {width:square?longEdge:dw,height:square?longEdge:dh,drawWidth:dw,drawHeight:dh,scale};
  }
  function filename(name,index) {
    let clean=String(name).normalize('NFKC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/\.{2,}/g,'_').replace(/^[. ]+|[. ]+$/g,'').trim().slice(0,80);
    if(!clean) clean='panel';
    if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(clean)) clean=`_${clean}`;
    return `${String(index+1).padStart(3,'0')}_${clean}`;
  }
  function template(rects,source,settings) {
    if(!rects.length || rects.length>80) throw new Error('保存する枠がありません。');
    rects.forEach(validRect);
    return {format:'lora-panel-studio',version:1,appVersion:VERSION,source:{width:source.width,height:source.height},settings:{...settings},rects:rects.map(r=>({...r}))};
  }
  function readTemplate(value) {
    if(!value || value.format!=='lora-panel-studio' || value.version!==1 || !Array.isArray(value.rects) || !value.rects.length || value.rects.length>80) throw new Error('対応するテンプレートJSONではありません。');
    integer(value.source?.width,1,8192,'元画像幅'); integer(value.source?.height,1,8192,'元画像高さ');
    value.rects.forEach(validRect);
    const s=value.settings;
    if(!s || ![0,512,768,1024,1536,2048].includes(s.edge) || typeof s.square!=='boolean' || typeof s.originals!=='boolean' || typeof s.trigger!=='string' || s.trigger.length>200) throw new Error('テンプレートの出力設定が不正です。');
    const mode=s.mode??'resize',factor=s.factor??2,provider=s.provider??'auto';
    if(!['resize','ai'].includes(mode)||![2,4].includes(factor)||!['auto','wasm'].includes(provider))throw new Error('AI出力設定が不正です。');
    return {source:{width:value.source.width,height:value.source.height},settings:{edge:s.edge,square:s.square,originals:s.originals,trigger:s.trigger,mode,factor,provider},rects:value.rects.map(r=>({x:r.x,y:r.y,w:r.w,h:r.h,name:r.name,caption:r.caption,enabled:r.enabled}))};
  }
  function prompt({preset='expressions',rows,cols,size,color='#ff00ff',character='',labels=''}) {
    const p=PRESETS[preset] || PRESETS.custom;
    integer(rows,1,10,'行数'); integer(cols,1,10,'列数'); colorRGB(color);
    const count=rows*cols;
    const descriptions=labels.trim()?labels.split('\n').map(s=>s.trim()).filter(Boolean):p.descriptions;
    const order=Array.from({length:count},(_,i)=>`${i+1}. ${descriptions[i] || `同一キャラクターの${p.title}・別バリエーション`}`).join('\n');
    const shape=size[0]===size[1]?'正方形':size[0]>size[1]?'横長':'縦長';
    return `LoRA用のキャラクター資料画像を1枚作成してください。${character.trim() || '添付したキャラクター資料を参照し、同一キャラクターの顔・髪・服・装飾の特徴を維持してください。'}\n\n構成: ${p.title}。${shape}のキャンバス（参考 ${size[0]}×${size[1]}px。対応する出力サイズで作成）。${rows}行×${cols}列、合計${count}マス。すべて同じ大きさの長方形を、傾けず、隙間なく規則正しく並べてください。\n\n画像の外周と全マスの境界には、色 ${color} の太く連続した水平・垂直の直線を描いてください。線幅は画像短辺の約0.6〜1%を目安とし、二重線・飾り枠・途切れ・影は不要です。この色は区切り線以外に使用しないでください。\n\n各マスの内側は単色の明るい背景にしてください。被写体はマス内に収め、髪・装飾・手足が線に触れないよう、各辺の約3%に余白を確保してください。${preset==='body'?'すべてのマスで頭頂から靴まで全身を入れてください。':preset==='views' || preset==='expressions'?'顔から肩までを各マスに1人ずつ描いてください。':''}見出し・番号・ラベル・文字・透かし・カラーパレットを入れないでください。\n\n左上から右へ、次に次の行へ、次の順に描いてください（このリストの文字は画像に描かないこと）:\n${order}\n\n指定した行列構成と境界線を優先し、キャラクターの特徴をマスごとに変えないでください。`;
  }
  const api={VERSION,PRESETS,integer,validRect,makeRect,pixelBox,grid,colorRGB,bands,detect,outputSize,filename,template,readTemplate,prompt};
  if(typeof module!=='undefined' && module.exports) module.exports=api; else root.PanelCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
