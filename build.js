const fs=require('fs'),path=require('path');
const src=f=>fs.readFileSync(path.join(__dirname,'src',f),'utf8');
const js=['engine.js','ai.js','glyphs.js','store.js','board.js','guide.js','ui.js'].map(f=>`// ---- ${f} ----\n`+src(f).replace(/^if \(typeof module.*$/m,'')).join('\n');
let html=src('index.html').replace('/*CSS*/',()=>src('style.css')).replace('/*JS*/',()=>js.replace(/<\/script/g,'<\\/script'));
fs.mkdirSync(path.join(__dirname,'dist'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'dist','index.html'),html);
console.log('built dist/index.html',html.length,'bytes');
