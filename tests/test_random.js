const P=require('../src/engine.js');
let wins=[0,0,0], errs=0, maxH=0;
for(let g=0;g<200;g++){
  let s=P.newGame({effects:[P.EFFECT_TYPES.slice(g%7,g%7+6),P.EFFECT_TYPES.slice((g+3)%7,(g+3)%7+6)],maxTurns:300});
  let steps=0;
  while(s.winner===null && steps<3000){
    const acts=P.legalActions(s);
    if(!acts.length){console.log('no actions!');break;}
    // prefer main actions
    let pool=acts.filter(a=>a.t!=='end'&&a.t!=='place'&&a.t!=='wheel'&&a.t!=='koi');
    if(s.tp.mainDone||!pool.length) pool=Math.random()<0.3?acts:acts.filter(a=>a.t==='end');
    if(!pool.length) pool=acts;
    const a=pool[Math.floor(Math.random()*pool.length)];
    try{ s=P.apply(s,a);}catch(e){errs++; if(errs<5)console.log('ERR',e.message,JSON.stringify(a)); s=P.apply(s,{t:'end'});}
    steps++;
    maxH=Math.max(maxH,P.harmonies(s).length);
  }
  wins[s.winner==='draw'?2:s.winner]++;
}
console.log('wins',wins,'errs',errs,'maxH',maxH);
