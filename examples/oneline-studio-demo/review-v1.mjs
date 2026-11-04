import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ffmpegStaticPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const ffmpegPath=process.env.ONELINE_FFMPEG||ffmpegStaticPath;
const ffprobePath=process.env.ONELINE_FFPROBE||ffprobeStatic?.path;

const projectDir=fileURLToPath(new URL('.',import.meta.url));
const manifest=JSON.parse(readFileSync(resolve(projectDir,'standalone.json'),'utf8'));
const videoPath=resolve(projectDir,'exports',`${manifest.exportSlug}.mp4`);
const reviewDir=resolve(projectDir,'exports','review');
if(!existsSync(videoPath))throw new Error('Render the video before creating review frames.');
if(!ffmpegPath||!ffprobePath)throw new Error('FFmpeg and FFprobe are required.');
mkdirSync(reviewDir,{recursive:true});
function run(binary,args){const result=spawnSync(binary,args,{stdio:'inherit',windowsHide:true});if(result.error)throw result.error;if(result.status!==0)throw new Error(`${binary} exited with status ${result.status}.`)}
const probe=spawnSync(ffprobePath,['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',videoPath],{encoding:'utf8',windowsHide:true});
if(probe.error)throw probe.error;if(probe.status!==0)throw new Error('Could not read the rendered video duration.');
const duration=Number.parseFloat(probe.stdout.trim());
const timing=JSON.parse(readFileSync(resolve(projectDir,'assets','narration-timing-v1.json'),'utf8'));
const frames=[{name:'frame-0000-exact-opening',time:0},{name:'opening-0_20s',time:.2},{name:'opening-0_80s',time:.8},{name:'cover-handoff-1_20s',time:1.2},...timing.sentences.map((sentence,index)=>({name:`beat-${String(index+1).padStart(2,'0')}-${sentence.startSec.toFixed(1).replace('.','_')}s`,time:Math.min(sentence.startSec+.45,duration-.2)})),{name:'end-card-hold',time:Math.min(timing.durationSeconds+1.5,duration-.2)},{name:'last-frame',time:duration-.1}];
for(const frame of frames){const args=['-hide_banner','-loglevel','error','-y','-i',videoPath];if(frame.time>0)args.push('-ss',frame.time.toFixed(3));args.push('-frames:v','1',resolve(reviewDir,`${frame.name}.png`));run(ffmpegPath,args)}
let sheets=0;
for(let start=0;start<Math.min(15,duration);start+=5){const end=Math.min(start+5,15,duration),name=`opening-${String(Math.floor(start)).padStart(2,'0')}-${String(Math.floor(end)).padStart(2,'0')}s.jpg`;run(ffmpegPath,['-hide_banner','-loglevel','error','-y','-ss',String(start),'-i',videoPath,'-t',(end-start).toFixed(3),'-vf','fps=5,scale=256:-2,tile=5x5','-frames:v','1',resolve(reviewDir,name)]);sheets++}
for(let start=15;start<duration;start+=15){const end=Math.min(start+15,duration),name=`sheet-${String(sheets++).padStart(2,'0')}-${String(Math.floor(start)).padStart(2,'0')}-${String(Math.floor(end)).padStart(2,'0')}s.jpg`;run(ffmpegPath,['-hide_banner','-loglevel','error','-y','-ss',String(start),'-i',videoPath,'-t',(end-start).toFixed(3),'-vf','fps=2,scale=320:-2,tile=6x5','-frames:v','1',resolve(reviewDir,name)])}
console.log(`Created opening checks, ${frames.length-2} narration-beat frames, and ${sheets} contact sheets.`);
