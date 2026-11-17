const fs=require('fs'),path=require('path');
const src=f=>fs.readFileSync(path.join(__dirname,'src',f),'utf8');
const js=['engine.js','ai.js','glyphs.js','economy.js','avatars.js','music.js','p2p.js','social.js','firebase.js','store.js','board.js','guide.js','ui.js'].map(f=>`// ---- ${f} ----\n`+src(f).replace(/^if \(typeof module.*$/m,'')).join('\n');
let html=src('index.html').replace('/*CSS*/',()=>src('style.css')).replace('/*JS*/',()=>js.replace(/<\/script/g,'<\\/script'));
fs.mkdirSync(path.join(__dirname,'dist'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'dist','index.html'),html);
console.log('built dist/index.html',html.length,'bytes');
// GitHub Pages copy at the repo root (installable PWA)
for (const f of ['manifest.webmanifest','sw.js','icon-192.png','icon-512.png','AvatarAirbender.ttf']) fs.copyFileSync(path.join(__dirname,'web',f), path.join(__dirname,f));
fs.copyFileSync(path.join(__dirname,'dist','index.html'), path.join(__dirname,'index.html'));
fs.writeFileSync(path.join(__dirname,'.nojekyll'),'');
console.log('copied GitHub Pages files to repo root');
