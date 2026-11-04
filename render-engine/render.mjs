import {existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import ffmpegStaticPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const ffmpegPath = process.env.ONELINE_FFMPEG || ffmpegStaticPath;
const ffprobePath = process.env.ONELINE_FFPROBE || ffprobeStatic?.path;

const toolDir = fileURLToPath(new URL('.', import.meta.url));
const alignerPath = join(toolDir, '..', 'align-narration.py');
function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, {stdio: 'inherit', windowsHide: true, ...options});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${binary} exited with status ${result.status}.`);
  return result;
}

function detectBlankLeadIn(ffmpeg, videoPath) {
  const nullOutput = process.platform === 'win32' ? 'NUL' : '-';
  const result = spawnSync(ffmpeg, [
    '-hide_banner', '-loglevel', 'info', '-i', videoPath, '-t', '1.5',
    '-vf', 'signalstats,metadata=print', '-an', '-f', 'null', nullOutput,
  ], {encoding: 'utf8', windowsHide: true});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Could not inspect the recording start: ${result.stderr}`);
  const lines = `${result.stdout || ''}\n${result.stderr || ''}`.split(/\r?\n/);
  let frameTime = 0;
  for (const line of lines) {
    const timestamp = line.match(/frame:\s*\d+\s+pts:\s*\d+\s+pts_time:([\d.]+)/);
    if (timestamp) frameTime = Number.parseFloat(timestamp[1]);
    const luma = line.match(/lavfi\.signalstats\.YAVG=([\d.]+)/);
    if (luma && Number.parseFloat(luma[1]) < 180) return frameTime;
  }
  return 0;
}

function findBrowserExecutable() {
  const explicit = process.env.ONELINE_VIDEO_BROWSER;
  if (explicit && existsSync(explicit)) return explicit;
  const names = process.platform === 'win32'
    ? ['msedge.exe', 'chrome.exe', 'chromium.exe']
    : ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'microsoft-edge', 'chrome'];
  const locator = process.platform === 'win32' ? 'where' : 'which';
  for (const name of names) {
    const result = spawnSync(locator, [name], {encoding: 'utf8', windowsHide: true});
    const candidate = (result.stdout || '').split(/\r?\n/).map((item) => item.trim()).find(Boolean);
    if (candidate && existsSync(candidate)) return candidate;
  }
  const platformPaths = process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    : process.platform === 'win32'
      ? ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']
      : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/microsoft-edge'];
  return platformPaths.find((candidate) => existsSync(candidate)) || null;
}

export async function renderProject(projectPath) {
  const projectDir = resolve(projectPath);
  const projectName = projectDir.split(/[\\/]/).at(-1);
  const projectManifestPath = join(projectDir, 'standalone.json');
  const projectManifest = existsSync(projectManifestPath) ? JSON.parse(readFileSync(projectManifestPath, 'utf8')) : {};
  const captionSettings = {enabled: false, language: 'same', style: 'phrase', ...(projectManifest.captions || {})};
  captionSettings.spokenLanguage = projectManifest.narrationLanguage || projectManifest.scriptLanguage || 'auto';
  const slug = projectManifest.exportSlug;
  if (!slug) throw new Error(`Unknown OneLine Studio standalone project: ${projectName}`);
  const voiceStartsAtZero = projectManifest.voiceStartsAtZero ?? true;
  const htmlPath = join(projectDir, 'index.html');
  const audioDir = join(projectDir, 'assets', 'audio');
  const audioFiles = existsSync(audioDir) ? readdirSync(audioDir).filter((name) => name.toLowerCase().endsWith('.wav')) : [];
  const configuredAudioPath = projectManifest.audioFile ? resolve(projectDir, projectManifest.audioFile) : null;
  const audioPath = configuredAudioPath ?? (audioFiles.length === 1 ? join(audioDir, audioFiles[0]) : null);
  if (!audioPath || !existsSync(audioPath)) throw new Error(`Set a valid standalone.json audioFile or provide the expected narration WAV in ${audioDir}.`);
  const timingPath = join(projectDir, 'assets', 'narration-timing-v1.json');
  const outputDir = join(projectDir, 'exports');
  const outputPath = join(outputDir, `${slug}.mp4`);
  if (!existsSync(htmlPath) || !existsSync(audioPath)) throw new Error(`Project input is missing: ${projectDir}`);
  if (!ffmpegPath || !ffprobePath) throw new Error('FFmpeg and FFprobe binaries are required.');

  const probe = spawnSync(ffprobePath, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath,
  ], {encoding: 'utf8', windowsHide: true});
  if (probe.status !== 0) throw new Error(`Could not read narration duration: ${probe.stderr}`);
  const durationSeconds = Number.parseFloat(probe.stdout.trim());
  if (!Number.isFinite(durationSeconds) || durationSeconds < 10) throw new Error(`Narration duration looks invalid: ${durationSeconds}`);

  let timing = {durationSeconds, sentences: []};
  if (captionSettings.enabled) {
    if (!['phrase', 'karaoke'].includes(captionSettings.style)) throw new Error('captions.style must be "phrase" or "karaoke".');
    if (captionSettings.style === 'karaoke' && captionSettings.language !== 'same') {
      throw new Error('Karaoke captions must use the spoken language. Set captions.style to "phrase" for translated subtitles.');
    }
    const timingIsFresh = existsSync(timingPath)
      && statSync(timingPath).mtimeMs >= statSync(audioPath).mtimeMs
      && statSync(timingPath).mtimeMs >= statSync(join(projectDir, 'script-v1.md')).mtimeMs;
    if (!timingIsFresh) {
      try {
        run(process.env.ONELINE_PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), [alignerPath, projectDir]);
      } catch (error) {
        throw new Error(`Could not align requested subtitles. Set captions.enabled to false, or provide reviewed phrase/word timings for this WAV. ${error.message}`);
      }
    }
    timing = JSON.parse(readFileSync(timingPath, 'utf8'));
    captionSettings.spokenLanguage = timing.narrationLanguage || captionSettings.spokenLanguage;
    const rows = Array.isArray(timing.sentences) ? timing.sentences : [];
    const rowsValid = rows.length > 0 && rows.every((row) => Number.isFinite(Number(row.startSec)) && Number.isFinite(Number(row.endSec)) && typeof row.text === 'string' && row.text.trim());
    const wordsValid = captionSettings.style !== 'karaoke' || rows.every((row) => Array.isArray(row.words) && row.words.length > 0);
    if (Math.abs(Number(timing.durationSeconds) - durationSeconds) > 0.5 || !rowsValid || !wordsValid) {
      throw new Error(captionSettings.style === 'karaoke'
        ? 'Word timing data does not match the current narration WAV. Align this WAV or provide reviewed word timings.'
        : 'Phrase subtitle timings do not match the current narration WAV. Provide reviewed phrase timings for this WAV.');
    }
  }

  const coverSeconds = projectManifest.coverSeconds ?? 1;
  const renderDuration = durationSeconds + (voiceStartsAtZero ? 0 : coverSeconds) + 3;
  const browserExecutable = findBrowserExecutable();
  const tempDir = mkdtempSync(join(tmpdir(), `oneline-${slug}-`));
  mkdirSync(outputDir, {recursive: true});
  let browser;
  try {
    try {
      browser = await chromium.launch({headless: true, ...(browserExecutable ? {executablePath: browserExecutable} : {}), args: ['--disable-dev-shm-usage']});
    } catch (error) {
      error.code = 'ONELINE_BROWSER_UNAVAILABLE';
      throw error;
    }
    const context = await browser.newContext({viewport: {width: 720, height: 1280}, deviceScaleFactor: 1, reducedMotion: 'no-preference', recordVideo: {dir: tempDir, size: {width: 720, height: 1280}}});
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(pathToFileURL(htmlPath).href, {waitUntil: 'load'});
    await page.waitForFunction(() => typeof window.setNarrationTiming === 'function' && typeof window.startLive === 'function');
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => {})));
      if (document.fonts?.ready) await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await page.evaluate(({data, captions}) => window.setNarrationTiming(data, captions), {data: timing, captions: captionSettings});
    await page.evaluate(() => window.startLive());
    console.log(`Recording ${slug}: ${voiceStartsAtZero ? 'voiceover from frame zero with a 1 second animated cover' : '1 second silent hook cover'}, ${durationSeconds.toFixed(1)} seconds of narration, and 3 second closing hold.`);
    await page.waitForTimeout(Math.ceil(renderDuration * 1000) + 500);
    if (pageErrors.length) throw new Error(`Page errors during render: ${pageErrors.join('; ')}`);
    const video = page.video();
    await page.close();
    await context.close();
    const webmPath = await video.path();
    await browser.close();
    browser = null;

    const blankLeadInSeconds = detectBlankLeadIn(ffmpegPath, webmPath);
    if (blankLeadInSeconds > 0.1) console.log(`Removing ${blankLeadInSeconds.toFixed(3)} seconds of blank browser startup.`);

    const videoFilter = voiceStartsAtZero
      ? "select='gte(n,1)',setpts=PTS-STARTPTS,fps=30,scale=720:1280:flags=lanczos,format=yuv420p"
      : "select='gte(n,1)',setpts=PTS-STARTPTS,tpad=start=1:start_mode=clone,fps=30,scale=720:1280:flags=lanczos,format=yuv420p";
    run(ffmpegPath, [
      '-y', ...(blankLeadInSeconds > 0 ? ['-ss', blankLeadInSeconds.toFixed(3)] : []), '-i', webmPath,
      ...(voiceStartsAtZero ? [] : ['-itsoffset', String(coverSeconds)]), '-i', audioPath,
      '-map', '0:v:0', '-map', '1:a:0',
      '-vf', videoFilter,
      '-af', `apad=whole_dur=${renderDuration.toFixed(3)}`,
      '-t', renderDuration.toFixed(3), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', outputPath,
    ]);

    const outputProbe = spawnSync(ffprobePath, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate', '-of', 'json', outputPath], {encoding: 'utf8', windowsHide: true});
    if (outputProbe.status !== 0) throw new Error(`Could not inspect rendered video: ${outputProbe.stderr}`);
    const metadata = JSON.parse(outputProbe.stdout);
    const videoStream = metadata.streams.find((stream) => stream.codec_type === 'video');
    const audioStream = metadata.streams.find((stream) => stream.codec_type === 'audio');
    if (videoStream?.width !== 720 || videoStream?.height !== 1280 || videoStream?.r_frame_rate !== '30/1' || !audioStream) throw new Error('Rendered video is missing the expected 720x1280 30 fps picture or audio.');
    if (Math.abs(Number(metadata.format.duration) - renderDuration) > 0.35) throw new Error('Rendered video duration does not include the cover and closing hold.');
    const result = {project: projectName, outputPath, duration: Number(metadata.format.duration), coverSeconds, video: videoStream, audio: audioStream};
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    if (browser) await browser.close().catch(() => {});
    rmSync(tempDir, {recursive: true, force: true});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const projectPath = process.argv[2];
  if (!projectPath) throw new Error('Pass one standalone project folder path.');
  await renderProject(projectPath);
}
