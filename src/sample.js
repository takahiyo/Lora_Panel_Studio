(function(root){
  const W=1055,H=1491;
  function rects(){const result=[];function add(x,y,w,h,name,enabled=true){result.push({...PanelCore.makeRect(x/W,y/H,w/W,h/H,name),enabled});}
    function cells(xs,y,w,h,names){xs.forEach((x,i)=>add(x,y,w,h,names[i]));}
    cells([11,207,394],34,179,228,['face_front','face_side','face_back']);
    cells([588,746,889],34,155,489,['body_front','body_side','body_back']);
    cells([11,127,241,354,469],321,106,120,['neutral','happy_smile','open_mouth_laugh','gentle_smile','sad']);
    cells([11,127,241,354,469],469,106,118,['surprised','angry','embarrassed','eyes_closed','wink']);
    cells([11,140,266,394,520,647],642,116,160,['angle_left','angle_right','looking_up','looking_down','tilt_left','tilt_right']);
    cells([783,918],644,125,64,['gaze_left','gaze_right']);cells([783,918],735,125,65,['gaze_up','gaze_down']);
    cells([11,146,283,420,557],858,121,233,['hands_at_sides','touching_hair','hand_on_chest','small_wave','hands_clasped']);
    cells([696,817,929],864,109,115,['bangs_detail','ribbon_detail','hair_side']);cells([696,817,929],1008,109,113,['hair_back','neckline','outfit_detail']);
    cells([11,147,283,420,558],1147,120,307,['relaxed_standing','contrapposto','step_forward','arms_behind','hand_on_hip']);
    add(871,1199,170,277,'chibi',false);return result;}
  root.PanelSample={url:'/*__IMAGE__*/',rects};
})(globalThis);
