import {access, cp, copyFile, mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const values={};
const positional=[];
for(let i=0;i<args.length;i++){
  const item=args[i];
  if(item.startsWith('--')){
    const key=item.slice(2);
    if(!['topic','slug','title','hook','brand','logo','script-language','narration-language','captions','caption-language'].includes(key))throw new Error(`Unknown option: ${item}`);
    if(!args[i+1]||args[i+1].startsWith('--'))throw new Error(`Pass a value after ${item}.`);
    values[key]=args[++i];
  }else positional.push(item);
}

let topic=values.topic?.trim()||'';
let slug=values.slug?.trim()||'';
let title=values.title?.trim()||'';
let hook=values.hook?.trim()||'';
let brandName=values.brand?.trim()||'OneLine Studio';
let logoSource=values.logo?path.resolve(values.logo):null;
const scriptLanguage=(values['script-language']?.trim()||'auto').toLowerCase();
const narrationLanguage=(values['narration-language']?.trim()||scriptLanguage).toLowerCase();
const captionMode=(values.captions?.trim().toLowerCase()||'off');
const captionLanguage=(values['caption-language']?.trim().toLowerCase()||'same');

const validLanguage=value=>value==='auto'||value==='same'||/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value);
if(!validLanguage(scriptLanguage)||scriptLanguage==='same')throw new Error('Use --script-language auto or an ISO language code such as en, es, ta, or zh-Hans.');
if(!validLanguage(narrationLanguage)||narrationLanguage==='same')throw new Error('Use --narration-language auto or an ISO language code such as en, es, ta, or zh-Hans.');
if(!validLanguage(captionLanguage))throw new Error('Use --caption-language same or an ISO language code such as en, es, ta, or zh-Hans.');
if(!['off','phrase','karaoke'].includes(captionMode))throw new Error('Use --captions off, phrase, or karaoke.');
if(captionMode==='karaoke'&&captionLanguage!=='same')throw new Error('Translated subtitles use phrase timing. Use --captions phrase when --caption-language is not same.');

if(positional.length>=3){
  slug ||= positional[0].trim();
  title ||= positional[1].trim();
  hook ||= positional.slice(2).join(' ').trim();
}else if(positional.length===1){
  topic ||= positional[0].trim();
}else if(positional.length>1){
  throw new Error('Use one topic sentence, or the legacy form: <slug> "Title" "Cover hook".');
}

if(!topic&&title)topic=title;
if(!topic)throw new Error('Usage: npm run new -- "One-sentence video idea" [--title "Title"] [--brand "Brand"] [--logo path]');
const cleanTopic=topic.replace(/\s+/g,' ').trim();
const conciseTitle=cleanTopic.replace(/[.!?]+$/,'').split(' ').slice(0,10).join(' ');
title ||= conciseTitle || 'Untitled explainer';
hook ||= cleanTopic;
slug ||= title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,56).replace(/-$/,'') || 'new-explainer';
if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error('Use a lowercase, hyphen-separated project slug.');

const template=path.join(root,'templates','explainer');
const project=path.join(root,'projects',slug);
try{await access(project);throw new Error(`Project already exists: ${project}`)}catch(error){if(error.code!=='ENOENT')throw error}
await mkdir(path.dirname(project),{recursive:true});
await cp(template,project,{recursive:true});

let logoFile='assets/oneline-studio-logo.png';
if(logoSource){
  await access(logoSource);
  const extension=path.extname(logoSource).toLowerCase()||'.png';
  logoFile=`assets/custom-brand-logo${extension}`;
  await copyFile(logoSource,path.join(project,logoFile));
}
const replacements={
  'standalone.json':[
    ['"__PROJECT_ID__"',JSON.stringify(`oneline-${slug}`)],
    ['"__EXPORT_SLUG__"',JSON.stringify(`${slug}-v1`)],
    ['"__TITLE__"',JSON.stringify(title)],
    ['"__HOOK__"',JSON.stringify(hook)],
    ['"__SCRIPT_LANGUAGE__"',JSON.stringify(scriptLanguage)],
    ['"__NARRATION_LANGUAGE__"',JSON.stringify(narrationLanguage)],
    ['__CAPTIONS_ENABLED__',String(captionMode!=='off')],
    ['"__CAPTION_LANGUAGE__"',JSON.stringify(captionLanguage)],
    ['"__CAPTION_STYLE__"',JSON.stringify(captionMode==='off'?'phrase':captionMode)],
    ['"__BRAND_NAME__"',JSON.stringify(brandName)],
    ['"__BRAND_LOGO__"',JSON.stringify(logoFile)],
    ['__BRAND_NAME_UPPER__',brandName.toUpperCase()]
  ],
  'index.html':[
    ['__HTML_LANGUAGE__',scriptLanguage==='auto'?'und':scriptLanguage.split('-')[0]],
    ['__TITLE__',title],['__HOOK__',hook],['__BRAND_NAME__',brandName],['__BRAND_LOGO__',logoFile],
    ['__BRAND_NAME_JS__',JSON.stringify(brandName)],['__BRAND_LOGO_JS__',JSON.stringify(logoFile)],
    ['__BRAND_OUTRO_JS__',JSON.stringify(`MADE WITH ${brandName.toUpperCase()}`)],['__BRAND_NAME_UPPER__',brandName.toUpperCase()]
  ],
  'script-v1.md':[['__TITLE__',title],['__HOOK__',hook],['__BRAND_NAME__',brandName]],
  'README.md':[['__TITLE__',title],['__HOOK__',hook],['__BRAND_NAME__',brandName]]
};
for(const [file,pairs] of Object.entries(replacements)){
  const filePath=path.join(project,file);let content=await readFile(filePath,'utf8');
  for(const [needle,value] of pairs){
    const escaped=file==='index.html'&&!needle.endsWith('_JS__')?value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])):value;
    content=content.replaceAll(needle,escaped);
  }
  await writeFile(filePath,content,'utf8');
}
console.log(`Created ${path.relative(root,project)} with ${brandName} branding, script language ${scriptLanguage}, narration language ${narrationLanguage}, and ${captionMode} video subtitles. Add verified research, narration, and topic-specific scenes before rendering.`);
