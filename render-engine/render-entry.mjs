import {readFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ffmpegStaticPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const engineDir=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(engineDir,'..');

function renderPillow(projectDir){
  const python=process.env.ONELINE_PYTHON||(process.platform==='win32'?'python':'python3');
  const script=path.join(engineDir,'pillow_render.py');
  const env={...process.env,ONELINE_FFMPEG:process.env.ONELINE_FFMPEG||ffmpegStaticPath||'',ONELINE_FFPROBE:process.env.ONELINE_FFPROBE||ffprobeStatic?.path||''};
  const result=spawnSync(python,[script,projectDir],{stdio:'inherit',windowsHide:true,cwd:repoRoot,env});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`Pillow renderer exited with status ${result.status}.`);
}

export async function renderProject(projectPath){
  const projectDir=path.resolve(projectPath);
  const manifest=JSON.parse(readFileSync(path.join(projectDir,'standalone.json'),'utf8'));
  const backend=manifest.renderer||'auto';
  if(backend==='pillow')return renderPillow(projectDir);
  if(!['auto','browser'].includes(backend))throw new Error(`Unknown renderer: ${backend}`);
  try{
    const {renderProject:renderBrowser}=await import('./render.mjs');
    return await renderBrowser(projectDir);
  }catch(error){
    const browserUnavailable=error.code==='ONELINE_BROWSER_UNAVAILABLE'||error.code==='ERR_MODULE_NOT_FOUND';
    if(backend!=='auto'||!browserUnavailable)throw error;
    console.warn(`Browser rendering is unavailable (${error.message}). Trying the Pillow 2D renderer.`);
    return renderPillow(projectDir);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const projectPath=process.argv[2];
  if(!projectPath)throw new Error('Pass one standalone project folder path.');
  await renderProject(projectPath);
}
