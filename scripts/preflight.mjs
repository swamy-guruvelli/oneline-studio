import {existsSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const projectArg=process.argv[2];
const python=process.env.ONELINE_PYTHON||(process.platform==='win32'?'python':'python3');
const report={python,pythonModules:{pillow:false,whisper:false,torch:false,whisperBaseCached:false},ffmpeg:null,ffprobe:null,browser:{launchable:false,source:null},project:null};

const pythonProbe=spawnSync(python,['-c',`import importlib.util,json,pathlib
cache=pathlib.Path.home()/'.cache'/'whisper'/'base.pt'
print(json.dumps({'pillow':importlib.util.find_spec('PIL') is not None,'whisper':importlib.util.find_spec('whisper') is not None,'torch':importlib.util.find_spec('torch') is not None,'whisperBaseCached':cache.is_file()}))`],{encoding:'utf8',windowsHide:true});
if(pythonProbe.status===0){
  try{report.pythonModules=JSON.parse(pythonProbe.stdout.trim())}catch{}
}else report.pythonError=pythonProbe.error?.message||pythonProbe.stderr?.trim()||`Python exited ${pythonProbe.status}`;

for(const [name,moduleName] of [['ffmpeg','ffmpeg-static'],['ffprobe','ffprobe-static']]){
  try{
    const imported=await import(moduleName);
    const resolved=name==='ffmpeg'?imported.default:imported.default?.path;
    report[name]=resolved&&existsSync(resolved)?resolved:null;
  }catch{}
  const override=process.env[name==='ffmpeg'?'ONELINE_FFMPEG':'ONELINE_FFPROBE'];
  if(override)report[name]=override;
  if(!report[name])report[name]=spawnSync(process.platform==='win32'?'where':'which',[name],{encoding:'utf8',windowsHide:true}).status===0?'PATH':null;
}

const browserNames=process.platform==='win32'?['msedge.exe','chrome.exe','chromium.exe']:['chromium','chromium-browser','google-chrome','google-chrome-stable','microsoft-edge','chrome'];
const locator=process.platform==='win32'?'where':'which';
const pathCandidates=browserNames.map(name=>spawnSync(locator,[name],{encoding:'utf8',windowsHide:true})).flatMap(result=>(result.stdout||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean));
const platformCandidates=process.platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']:process.platform==='win32'?['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']:['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/usr/bin/microsoft-edge'];
const candidatePaths=[process.env.ONELINE_VIDEO_BROWSER,...pathCandidates,...platformCandidates].filter(Boolean);
const browserCandidate=candidatePaths.find(existsSync);
try{
  const {chromium}=await import('playwright');
  const browser=await chromium.launch({headless:true,...(browserCandidate?{executablePath:browserCandidate}:{}),args:['--disable-dev-shm-usage']});
  await browser.close();
  report.browser={launchable:true,source:browserCandidate||chromium.executablePath()};
}catch(error){report.browserError=error.message;}

if(projectArg){
  const project=path.resolve(projectArg);
  const manifestPath=path.join(project,'standalone.json');
  if(existsSync(manifestPath)){
    const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
    const audioPath=path.resolve(project,manifest.audioFile||'assets/audio/narration.wav');
    const timingPath=path.join(project,'assets','narration-timing-v1.json');
    const scriptPath=path.join(project,'script-v1.md');
    let timing=null;
    if(existsSync(timingPath)){try{timing=JSON.parse(readFileSync(timingPath,'utf8'))}catch{}}
    let captionChars=null;
    if(existsSync(scriptPath)){
      const source=readFileSync(scriptPath,'utf8');
      const section=source.split(/^## Instagram caption\s*$/im)[1];
      const caption=section?.split(/^##?\s/m)[0]?.trim();
      if(caption)captionChars=Array.from(caption).length;
    }
    const hasPhraseTimings=Array.isArray(timing?.sentences)&&timing.sentences.length>0&&timing.sentences.every(row=>typeof row.text==='string'&&row.text.trim()&&Number.isFinite(Number(row.startSec))&&Number.isFinite(Number(row.endSec)));
    const hasWordTimings=hasPhraseTimings&&timing.sentences.every(row=>Array.isArray(row.words)&&row.words.length>0);
    const timingFresh=existsSync(timingPath)&&existsSync(audioPath)&&existsSync(scriptPath)&&statSync(timingPath).mtimeMs>=statSync(audioPath).mtimeMs&&statSync(timingPath).mtimeMs>=statSync(scriptPath).mtimeMs;
    const captions={enabled:false,language:'same',style:'phrase',...(manifest.captions||{})};
    const captionTimingsReady=!captions.enabled||(timingFresh&&hasPhraseTimings&&(captions.style!=='karaoke'||hasWordTimings));
    report.project={path:project,renderer:manifest.renderer||'auto',audioPresent:existsSync(audioPath),scriptLanguage:manifest.scriptLanguage||'auto',narrationLanguage:manifest.narrationLanguage||manifest.scriptLanguage||'auto',captionsEnabled:!!captions.enabled,captionLanguage:captions.language,captionStyle:captions.style,phraseTimingsPresent:hasPhraseTimings,wordTimingsPresent:hasWordTimings,wordTimingsFresh:timingFresh,captionTimingsReady,captionAlignmentNeeded:!!captions.enabled&&!captionTimingsReady,captionCharacters:captionChars,captionInTargetRange:captionChars!==null&&captionChars>=1500&&captionChars<=2000};
  }else report.projectError=`No standalone.json found at ${manifestPath}`;
}

const binaryReady=!!report.ffmpeg&&!!report.ffprobe;
report.renderRoutes={browser:binaryReady&&report.browser.launchable,pillow:binaryReady&&report.pythonModules.pillow};
if(report.project?.renderer==='pillow'&&report.renderRoutes.pillow)report.recommendedRoute='pillow';
else if(report.project?.renderer==='browser'&&report.renderRoutes.browser)report.recommendedRoute='browser';
else if(report.project?.renderer==='browser')report.recommendedRoute='unavailable';
else if(report.renderRoutes.browser)report.recommendedRoute='browser';
else if(report.renderRoutes.pillow)report.recommendedRoute='pillow';
else report.recommendedRoute='unavailable';
console.log(JSON.stringify(report,null,2));
if(report.recommendedRoute==='unavailable')process.exitCode=1;
