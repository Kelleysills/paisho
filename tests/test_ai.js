global.PaiSho=require('../src/engine.js');
const P=PaiSho, AI=require('../src/ai.js');
function play(l0,l1,eff){
  let s=P.newGame({effects:eff||[[],[]],maxTurns:200}); const lv=[l0,l1]; let t0=Date.now(), maxT=0;
  while(s.winner===null){ const t=Date.now(); const seq=AI.chooseTurn(s,lv[s.turn]); maxT=Math.max(maxT,Date.now()-t);
    for(const a of seq){ s=P.apply(s,a); if(a.t==='end')break; } }
  return {w:s.winner,turns:s.turnNo,maxT};
}
const args=process.argv.slice(2);
for(let i=0;i<+args[2];i++) console.log(args[0],'vs',args[1],JSON.stringify(play(args[0],args[1], args[3]?[AI.AI_EFFECTS.hard,AI.AI_EFFECTS.hard]:null)));
