/* Shared by the offline browser app and Node tests. Rectangles use normalized edges. */
(function (root) {
  'use strict';
  const VERSION = '0.3.0';
  const PRESETS = {
    expressions: {title:'表情', rows:2, cols:3, size:[1536,1024], names:['neutral','happy_smile','surprised','angry','embarrassed','eyes_closed'], descriptions:['通常の表情（正面）','明るい笑顔（正面）','驚き（正面）','怒り（正面）','照れ（正面）','目を閉じた笑顔（正面）'],
      framing:'各マスは頭頂から肩の上端までの顔のアップにし、全マスで同じ正面向き・同じ大きさ・同じ位置に頭部を揃えてください。胸から下や半身は入れないでください。',
      rule:'表情の違いは主に目・眉・口で表し、顔の骨格・髪型・装飾品・衣装・顔の向き・画角は全マスで同じにしてください。'},
    views: {title:'顔の三面図', rows:1, cols:3, size:[1536,1024], names:['face_front','face_side','face_back'], descriptions:['頭部を真正面から見た図','頭部を真横から見た図（本人の左側面が見える向き）','頭部を真後ろから見た図'],
      framing:'各マスは頭頂から首元・肩の上端までの頭部だけにし、胸や半身は入れないでください。全マスで頭部の大きさと高さを揃えてください。',
      rule:'表情は全マス通常の表情にしてください。向きは指定した1方向だけにし、斜めの図や別角度の小図を加えないでください。'},
    body: {title:'全身の三面図', rows:1, cols:3, size:[1536,1024], names:['body_front','body_side','body_back'], descriptions:['全身を真正面から見た図','全身を真横から見た図（本人の左側面が見える向き）','全身を真後ろから見た図'],
      framing:'すべてのマスで頭頂から足先（履物を含む）まで全身を入れ、全マスで身長の大きさと足元の高さを揃えてください。',
      rule:'自然な直立姿勢で腕を体から少し離し、衣装の形が分かるようにしてください。向きは指定した1方向だけにしてください。'},
    details: {title:'髪・衣装の詳細', rows:2, cols:2, size:[1024,1024], names:['hair_back','head_side','neckline','waist'], descriptions:['後頭部から肩までの後ろ髪を、真後ろの1方向から描いた単一画像','頭部を本人の右側面から見た、髪型・耳まわり・頭部の装飾品の単一接写','首元から胸の上までを正面から描いた、襟・首まわりの装飾品を含む単一接写','腰まわりを正面から描いた、ベルト・裾の始まりなど衣装の切り替え部分の単一接写'],
      framing:'各マスは指定した部位の単一の接写だけにしてください。全身図・顔だけの図・足元の挿図は加えないでください。',
      rule:'接写でも基準画像にない装飾・模様・部品を追加しないでください。基準画像で見えない部分は、新しい装飾を想像で加えず、見えている部分の形と色を自然につなげてください。装飾品だけを体から外した部品図にはしないでください。'},
    angles: {title:'顔の向き追加', rows:2, cols:2, size:[1024,1024], names:['face_three_quarter_right','face_three_quarter_left','face_side_right','face_back_three_quarter'], descriptions:['本人の右へ約45度向いた斜め前の顔','本人の左へ約45度向いた斜め前の顔','頭部を真横から見た図（本人の右側面が見える向き）','頭部を斜め後ろから見た図'],
      framing:'各マスは頭頂から首元・肩の上端までの頭部だけにし、全マスで頭部の大きさと高さを揃えてください。',
      rule:'表情は全マス通常の表情にしてください。向きによって見えなくなる装飾品は隠れたままにしてください。'},
    poses: {title:'動作・ポーズ', rows:2, cols:2, size:[1024,1536], names:['pose_standing','pose_walking','pose_sitting','pose_raising_hand'], descriptions:['自然に立つ全身（正面）','歩いている全身（斜め前）','簡素な椅子に座った全身（斜め前）','片手を上げた全身（正面）'],
      framing:'すべてのマスで頭頂から足先（履物を含む）まで全身を入れてください。',
      rule:'1マスに1人・1ポーズだけを描いてください。座るポーズの簡素な椅子以外、小物や背景物は加えないでください。'},
    custom: {title:'カスタム', rows:2, cols:3, size:[1536,1024], names:[], descriptions:[],
      framing:'各マスにはマスの内容で指定した1つの構図だけを描いてください。',
      rule:''}
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
    const spec=character.trim()?`\n\nキャラクターの固定仕様（全マス共通。左右はキャラクター本人から見た左右）:\n${character.trim()}`:'';
    return [
      `LoRA用のキャラクター資料画像を1枚作成してください。添付した基準画像のキャラクターを、全マスで同一人物として描いてください。${spec}`,
      `構成: ${p.title}。${shape}のキャンバス（参考 ${size[0]}×${size[1]}px。対応する出力サイズで作成）。${rows}行×${cols}列、合計${count}マス。すべて同じ大きさの長方形を、傾けず、隙間なく規則正しく並べてください。`,
      `画像の外周と全マスの境界には、色 ${color} の太く連続した水平・垂直の直線を描いてください。線幅は画像短辺の約0.6〜1%を目安とし、二重線・飾り枠・途切れ・影は不要です。この色は区切り線以外に使用しないでください。`,
      `1マス＝1つの絵:\n- 各マスには、指定された1つの視点・1つの構図だけを描いてください。人物を描くマスは1人だけ、接写のマスは指定された部位の単一の接写だけにしてください。\n- マス内部を再分割しないでください。小窓、挿図、別角度の追加図、比較図、複数人物、独立した部品図、内部の区切り線は描かないでください。区切り線は指定した外周とマス境界だけにしてください。\n- 画角: ${p.framing}\n- 被写体はマス内に収め、髪・装飾・手足が線に触れないよう、各辺の約3%に余白を確保してください。`,
      `背景: 全マスの背景を、同じ無地の明るいニュートラルグレーに統一してください。表情・向き・ポーズ・内容によって背景色を変えないでください。グラデーション、模様、風景、背景の小物は入れないでください。背景色は枠線の色と明確に区別できる色にしてください。`,
      `特徴の固定:\n- 添付した基準画像${spec?'と上記の固定仕様':''}を全マスで維持してください。顔立ち、体格、髪型（分け目・結び目・編み込みなどの位置）、装飾品（髪飾り・帽子・眼鏡・耳飾り・首飾りなど）の個数と取り付け位置、衣装の形・構造・配色・模様を変更・追加・省略しないでください。\n- 左右はキャラクター本人を基準にしてください。正面で画面の左に見えるものは、背面では画面の右に見えます。角度によって隠れる装飾を、見える側へ移したり複製したりしないでください。\n- 基準画像にない装飾、模様、金具、フリル、レース、小物などを追加しないでください。${p.rule?`\n- ${p.rule}`:''}`,
      `見出し・番号・ラベル・文字・透かし・カラーパレットを入れないでください。`,
      `左上から右へ、次に次の行へ、次の順に描いてください（このリストの文字は画像に描かないこと）:\n${order}`,
      `指定した行列構成と境界線を優先し、キャラクターの特徴をマスごとに変えないでください。`
    ].join('\n\n');
  }
  const api={VERSION,PRESETS,integer,validRect,makeRect,pixelBox,grid,colorRGB,bands,detect,outputSize,filename,template,readTemplate,prompt};
  if(typeof module!=='undefined' && module.exports) module.exports=api; else root.PanelCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
