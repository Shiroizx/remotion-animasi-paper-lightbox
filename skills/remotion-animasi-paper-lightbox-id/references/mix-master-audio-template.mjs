/**
 * Audio Mixer & Two-Pass EBU R128 (-14 LUFS) Mastering Script
 *
 * Dapat dijalankan langsung via CLI:
 *   node scripts/mix-master-audio.mjs --config scripts/audio-mix.json
 *   node scripts/mix-master-audio.mjs --narration public/audio/narasi.mp3 --output public/audio/narasi-master.wav
 *
 * Atau diimpor secara programatik:
 *   import { mixMasterAudio } from './mix-master-audio.mjs';
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const COMPOSITOR_PACKAGES = [
  '@remotion/compositor-win32-x64-msvc',
  '@remotion/compositor-darwin-arm64',
  '@remotion/compositor-darwin-x64',
  '@remotion/compositor-linux-x64-gnu',
  '@remotion/compositor-linux-x64-musl',
  '@remotion/compositor-linux-arm64-gnu',
  '@remotion/compositor-linux-arm64-musl',
];

function resolveBinaryPath(toolName) {
  const binName = process.platform === 'win32' ? `${toolName}.exe` : toolName;

  // 1. Resolusi lewat module graph @remotion/renderer (bekerja untuk npm, pnpm, yarn, dan monorepo)
  try {
    const projectRequire = createRequire(path.resolve('package.json'));
    const rendererPkgJson = projectRequire.resolve('@remotion/renderer/package.json');
    const rendererRequire = createRequire(rendererPkgJson);
    for (const pkg of COMPOSITOR_PACKAGES) {
      try {
        const pkgDir = path.dirname(rendererRequire.resolve(`${pkg}/package.json`));
        const candidate = path.join(pkgDir, binName);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      } catch {
        // Paket platform lain tidak terpasang — lanjutkan ke kandidat berikutnya
      }
    }
  } catch {
    // Abaikan jika @remotion/renderer belum ada atau cwd belum memiliki package.json
  }

  // 2. Fallback scan langsung di node_modules/@remotion/compositor-*
  const remotionDir = path.resolve('node_modules/@remotion');
  if (fs.existsSync(remotionDir)) {
    const dirs = fs.readdirSync(remotionDir).filter((dir) => dir.startsWith('compositor-'));
    for (const dir of dirs) {
      const candidate = path.join(remotionDir, dir, binName);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  // 3. Fallback ke binary global pada PATH
  return toolName;
}

function runTool(binPath, args, captureOutput = false) {
  try {
    return execFileSync(binPath, args, {
      encoding: 'utf8',
      stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        `Binary "${binPath}" tidak ditemukan. Pastikan paket Remotion terpasang ("npm install") atau FFmpeg tersedia di PATH.`
      );
    }
    if (captureOutput && err.stderr) {
      return `${err.stdout || ''}\n${err.stderr}`;
    }
    throw err;
  }
}

function probeDurationSec(ffprobePath, filePath) {
  const out = execFileSync(
    ffprobePath,
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ],
    { encoding: 'utf8' }
  ).trim();
  const parsed = Number.parseFloat(out);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Gagal membaca durasi audio yang valid dari: ${filePath}`);
  }
  return parsed;
}

function supportsFilter(ffmpegPath, filterName) {
  try {
    const out = execFileSync(ffmpegPath, ['-hide_banner', '-filters'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return new RegExp(`\\b${filterName}\\b`).test(out);
  } catch {
    return false;
  }
}

function detectVoiceIntervals(ffmpegPath, narrationPath, narrationStartSec, maxDuration) {
  let stderr = '';
  try {
    execFileSync(
      ffmpegPath,
      ['-hide_banner', '-i', narrationPath, '-af', 'silencedetect=noise=-35dB:d=0.25', '-f', 'null', '-'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } catch (err) {
    stderr = err.stderr || '';
  }

  // execFileSync sukses juga menulis log filter ke stderr; ambil via spawn/combined jika perlu:
  if (!stderr) {
    const res = runTool(
      ffmpegPath,
      ['-hide_banner', '-i', narrationPath, '-af', 'silencedetect=noise=-35dB:d=0.25', '-f', 'null', '-'],
      true
    );
    stderr = typeof res === 'string' ? res : '';
  }

  const silences = [];
  let currentStart = null;
  for (const line of stderr.split(/\r?\n/)) {
    const mStart = line.match(/silence_start:\s*([0-9.+-]+)/);
    if (mStart) {
      currentStart = Number.parseFloat(mStart[1]);
    }
    const mEnd = line.match(/silence_end:\s*([0-9.+-]+)/);
    if (mEnd) {
      const sEnd = Number.parseFloat(mEnd[1]);
      silences.push([currentStart ?? 0, sEnd]);
      currentStart = null;
    }
  }
  if (currentStart !== null) {
    silences.push([currentStart, maxDuration]);
  }

  const active = [];
  let cursor = 0;
  for (const [sStart, sEnd] of silences) {
    if (sStart - cursor > 0.05) {
      active.push([
        Math.max(0, narrationStartSec + cursor - 0.12),
        narrationStartSec + sStart + 0.18,
      ]);
    }
    cursor = Math.max(cursor, sEnd);
  }
  if (maxDuration - cursor > 0.05) {
    active.push([
      Math.max(0, narrationStartSec + cursor - 0.12),
      narrationStartSec + maxDuration + 0.18,
    ]);
  }
  return active;
}

function buildSilenceExpr(silenceBeats) {
  if (!Array.isArray(silenceBeats) || silenceBeats.length === 0) {
    return null;
  }
  const parts = silenceBeats
    .filter((b) => Number.isFinite(b?.startSec) && Number.isFinite(b?.durationSec) && b.durationSec > 0)
    .map((b) => `between(t,${b.startSec.toFixed(3)},${(b.startSec + b.durationSec).toFixed(3)})`);
  return parts.length > 0 ? `gt(${parts.join('+')},0)` : null;
}

function parseLoudnormJson(logText) {
  const match = logText.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function mixMasterAudio({
  narrationPath,
  narrationStartSec = 0,
  narrationVolume = 1.0,
  outputPath,
  musicTracks = [],
  ambienceTracks = [],
  sfxTracks = [],
  silenceBeats = [],
  duckDb = -10,
  targetDurationSec = null,
}) {
  if (!narrationPath || !fs.existsSync(narrationPath)) {
    throw new Error(`File narasi tidak ditemukan: ${narrationPath}`);
  }
  if (!outputPath) {
    throw new Error('Parameter outputPath wajib diisi.');
  }

  const ffmpegPath = resolveBinaryPath('ffmpeg');
  const ffprobePath = resolveBinaryPath('ffprobe');

  const narrationDur = probeDurationSec(ffprobePath, narrationPath);
  const effectiveDuration =
    Number.isFinite(targetDurationSec) && targetDurationSec > 0
      ? targetDurationSec
      : null;

  const allTracks = [
    ...musicTracks.map((t) => ({ ...t, duck: t.duck ?? true })),
    ...ambienceTracks.map((t) => ({ ...t, duck: t.duck ?? true })),
    ...sfxTracks.map((t) => ({ ...t, duck: t.duck ?? false })),
  ];

  for (const track of allTracks) {
    if (!track?.file || !fs.existsSync(track.file)) {
      throw new Error(`File audio pendukung tidak ditemukan: ${track?.file}`);
    }
  }

  const outDir = path.dirname(path.resolve(outputPath));
  fs.mkdirSync(outDir, { recursive: true });
  const preMixPath = `${outputPath}.premix.tmp.wav`;

  try {
    const inputs = ['-i', narrationPath];
    const filterParts = [];

    const narrDelayMs = Math.max(0, Math.round(narrationStartSec * 1000));
    const narrDelayFilter = narrDelayMs > 0 ? `,adelay=${narrDelayMs}|${narrDelayMs}` : '';
    filterParts.push(
      `[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo${narrDelayFilter},volume=${narrationVolume}[narr_base]`
    );

    const duckedLabels = [];
    const drySilenceLabels = [];
    const dryKeepLabels = [];

    allTracks.forEach((track, idx) => {
      const inputIdx = idx + 1;
      const startSec = Math.max(0, Number(track.startSec ?? 0));
      const delayMs = Math.round(startSec * 1000);
      const volume = Number(track.volume ?? 1.0);
      const label = `[trk${idx}]`;

      const finiteCap =
        Number.isFinite(track.durationSec) && track.durationSec > 0
          ? track.durationSec
          : effectiveDuration
            ? Math.max(0.1, effectiveDuration - startSec)
            : narrationStartSec + narrationDur + 4.5;

      if (track.loop) {
        inputs.push('-stream_loop', '-1', '-i', track.file);
      } else {
        inputs.push('-i', track.file);
      }

      const chain = [
        `[${inputIdx}:a]aresample=48000`,
        'aformat=sample_fmts=fltp:channel_layouts=stereo',
      ];
      if (track.loop || Number.isFinite(track.durationSec)) {
        chain.push(`atrim=0:${finiteCap.toFixed(3)}`);
      }
      if (delayMs > 0) {
        chain.push(`adelay=${delayMs}|${delayMs}`);
      }
      chain.push(`volume=${volume}${label}`);
      filterParts.push(chain.join(','));

      if (track.duck) {
        duckedLabels.push(label);
      } else if (track.keepDuringSilence) {
        dryKeepLabels.push(label);
      } else {
        drySilenceLabels.push(label);
      }
    });

    const mixInputs = [];
    const silenceExpr = buildSilenceExpr(silenceBeats);

    if (duckedLabels.length > 0) {
      let bedLabel = duckedLabels[0];
      if (duckedLabels.length > 1) {
        filterParts.push(
          `${duckedLabels.join('')}amix=inputs=${duckedLabels.length}:duration=longest:normalize=0[bed_sum]`
        );
        bedLabel = '[bed_sum]';
      }

      if (silenceExpr) {
        filterParts.push(`${bedLabel}volume='if(${silenceExpr},0,1)':eval=frame[bed_sil]`);
        bedLabel = '[bed_sil]';
      }

      const canSidechain = supportsFilter(ffmpegPath, 'sidechaincompress');
      if (canSidechain) {
        filterParts.push('[narr_base]asplit=2[narr_mix][narr_sc]');
        filterParts.push(
          `${bedLabel}[narr_sc]sidechaincompress=threshold=0.015:ratio=6:attack=25:release=350:makeup=1[bed_ducked]`
        );
        mixInputs.push('[narr_mix]', '[bed_ducked]');
      } else {
        const duckGain = Math.pow(10, duckDb / 20).toFixed(4);
        const intervals = detectVoiceIntervals(
          ffmpegPath,
          narrationPath,
          narrationStartSec,
          narrationDur
        );
        if (intervals.length > 0) {
          const cond = intervals
            .map(([s, e]) => `between(t,${s.toFixed(3)},${e.toFixed(3)})`)
            .join('+');
          filterParts.push(
            `${bedLabel}volume='if(gt(${cond},0),${duckGain},1)':eval=frame[bed_ducked]`
          );
          mixInputs.push('[narr_base]', '[bed_ducked]');
        } else {
          mixInputs.push('[narr_base]', bedLabel);
        }
      }
    } else {
      mixInputs.push('[narr_base]');
    }

    if (drySilenceLabels.length > 0) {
      let dryLabel = drySilenceLabels[0];
      if (drySilenceLabels.length > 1) {
        filterParts.push(
          `${drySilenceLabels.join('')}amix=inputs=${drySilenceLabels.length}:duration=longest:normalize=0[dry_sum]`
        );
        dryLabel = '[dry_sum]';
      }
      if (silenceExpr) {
        filterParts.push(`${dryLabel}volume='if(${silenceExpr},0,1)':eval=frame[dry_sil]`);
        dryLabel = '[dry_sil]';
      }
      mixInputs.push(dryLabel);
    }

    for (const label of dryKeepLabels) {
      mixInputs.push(label);
    }

    let finalMixLabel = mixInputs[0];
    if (mixInputs.length > 1) {
      filterParts.push(
        `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=longest:normalize=0[mixed_raw]`
      );
      finalMixLabel = '[mixed_raw]';
    }

    if (effectiveDuration) {
      filterParts.push(
        `${finalMixLabel}apad=whole_dur=${effectiveDuration.toFixed(3)},atrim=0:${effectiveDuration.toFixed(3)}[pre_out]`
      );
    } else {
      filterParts.push(`${finalMixLabel}acopy[pre_out]`);
    }

    // Tahap 1: Render premix WAV tanpa clipping
    runTool(ffmpegPath, [
      '-y',
      ...inputs,
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[pre_out]',
      '-c:a',
      'pcm_s16le',
      '-ar',
      '48000',
      '-ac',
      '2',
      preMixPath,
    ]);

    // Tahap 2: Analisis loudness Pass 1
    let measureLog = '';
    try {
      measureLog = execFileSync(
        ffmpegPath,
        [
          '-hide_banner',
          '-nostats',
          '-i',
          preMixPath,
          '-af',
          'loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json',
          '-f',
          'null',
          '-',
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (err) {
      measureLog = `${err.stdout || ''}\n${err.stderr || ''}`;
    }
    if (!measureLog.includes('"input_i"')) {
      const combined = runTool(
        ffmpegPath,
        [
          '-hide_banner',
          '-nostats',
          '-i',
          preMixPath,
          '-af',
          'loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json',
          '-f',
          'null',
          '-',
        ],
        true
      );
      measureLog = typeof combined === 'string' ? combined : measureLog;
    }

    const stats = parseLoudnormJson(measureLog);
    const hasValidStats =
      stats &&
      [stats.input_i, stats.input_tp, stats.input_lra, stats.input_thresh, stats.target_offset].every(
        (v) => v !== undefined && !String(v).includes('inf') && !String(v).includes('nan')
      );

    // Tahap 3: Two-pass linear loudnorm ke -14 LUFS / -1.2 dBTP
    const loudnormFilter = hasValidStats
      ? `loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true`
      : 'loudnorm=I=-14:TP=-1.2:LRA=11';

    runTool(ffmpegPath, [
      '-y',
      '-i',
      preMixPath,
      '-af',
      loudnormFilter,
      '-c:a',
      'pcm_s16le',
      '-ar',
      '48000',
      '-ac',
      '2',
      outputPath,
    ]);

    return {
      outputPath,
      ffmpegPath,
      twoPass: Boolean(hasValidStats),
      measuredInputLufs: stats?.input_i ?? null,
    };
  } finally {
    if (fs.existsSync(preMixPath)) {
      fs.unlinkSync(preMixPath);
    }
  }
}

function parseCliArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--config' || token === '-c') {
      args.config = argv[++i];
    } else if (token === '--narration' || token === '-n') {
      args.narration = argv[++i];
    } else if (token === '--output' || token === '-o') {
      args.output = argv[++i];
    } else if (token === '--duration' || token === '-d') {
      args.duration = Number.parseFloat(argv[++i]);
    } else if (token === '--help' || token === '-h') {
      args.help = true;
    }
  }
  return args;
}

const isCliEntry =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isCliEntry) {
  const cli = parseCliArgs(process.argv.slice(2));
  if (cli.help) {
    console.log(
      'Penggunaan:\n  node scripts/mix-master-audio.mjs --config scripts/audio-mix.json\n  node scripts/mix-master-audio.mjs --narration public/audio/narasi.mp3 --output public/audio/narasi-master.wav [--duration 60]'
    );
    process.exit(0);
  }

  let payload = null;
  const defaultConfigs = ['scripts/audio-mix.json', 'audio-mix.json'];
  const configPath = cli.config || defaultConfigs.find((p) => fs.existsSync(p));

  if (configPath) {
    if (!fs.existsSync(configPath)) {
      console.error(`File konfigurasi audio tidak ditemukan: ${configPath}`);
      process.exit(1);
    }
    payload = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else if (cli.narration && cli.output) {
    payload = {
      narrationPath: cli.narration,
      outputPath: cli.output,
      targetDurationSec: cli.duration ?? null,
    };
  } else {
    console.error(
      'Tidak ada --config maupun pasangan --narration & --output. Jalankan dengan --help untuk melihat format penggunaan.'
    );
    process.exit(1);
  }

  const result = mixMasterAudio(payload);
  console.log(
    `Mastering audio selesai -> ${result.outputPath} (twoPass=${result.twoPass}, inputLUFS=${result.measuredInputLufs ?? 'n/a'})`
  );
}
