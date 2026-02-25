#!/usr/bin/env node
/**
 * Voice Record - Records audio and transcribes using Whisper
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const RECORDINGS_DIR = path.join(process.env.HOME || '/tmp', '.popebot', 'recordings');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function recordAudio(duration = 5, device = 'default') {
  ensureDir(RECORDINGS_DIR);
  
  const filename = path.join(RECORDINGS_DIR, `recording_${getTimestamp()}.wav`);
  
  // Check if arecord is available
  try {
    execSync('which arecord', { stdio: 'ignore' });
    
    console.log(`Recording ${duration}s to ${filename}...`);
    execSync(`arecord -D ${device} -f S16_LE -r 16000 -c 1 -d ${duration} "${filename}"`, {
      stdio: 'inherit'
    });
    
    return filename;
  } catch (err) {
    // Fallback to ffmpeg
    try {
      execSync('which ffmpeg', { stdio: 'ignore' });
      console.log(`Recording ${duration}s using ffmpeg...`);
      execSync(`ffmpeg -f alsa -i ${device} -t ${duration} -ar 16000 -ac 1 "${filename}" -y`, {
        stdio: 'inherit'
      });
      return filename;
    } catch (ffmpegErr) {
      throw new Error('No recording tool found (arecord or ffmpeg required)');
    }
  }
}

function transcribeWithOpenAI(audioPath) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const FormData = require('form-data');
  const axios = require('axios');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(audioPath));
  form.append('model', 'whisper-1');
  
  return axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${apiKey}`
    }
  }).then(response => response.data);
}

function transcribeWithWhisperCPP(audioPath) {
  const whisperPath = process.env.WHISPER_CPP_PATH || 'whisper-cli';
  const modelPath = process.env.WHISPER_MODEL_PATH || path.join(process.env.HOME || '/tmp', '.popebot', 'models', 'ggml-base.en.bin');
  
  if (!fs.existsSync(modelPath)) {
    console.warn(`Model not found at ${modelPath}, using default`);
  }
  
  try {
    const output = execSync(`${whisperPath} -m "${modelPath}" -f "${audioPath}" --no-timestamps -otxt -`, {
      encoding: 'utf8',
      timeout: 60000
    });
    return { text: output.trim() };
  } catch (err) {
    throw new Error(`Whisper.cpp transcription failed: ${err.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const duration = parseInt(args.find(a => a.startsWith('--duration='))?.split('=')[1] || '5');
  const device = args.find(a => a.startsWith('--device='))?.split('=')[1] || 'default';
  const useLocal = args.includes('--local');
  const outputJson = args.includes('--json');
  
  try {
    const audioFile = recordAudio(duration, device);
    
    let result;
    if (useLocal) {
      result = transcribeWithWhisperCPP(audioFile);
    } else {
      result = await transcribeWithOpenAI(audioFile);
    }
    
    const output = {
      transcription: result.text,
      confidence: result.confidence || 0.9,
      language: result.language || 'en',
      duration: duration,
      audioFile: audioFile,
      timestamp: new Date().toISOString()
    };
    
    if (outputJson) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log('Transcription:', result.text);
    }
    
    return output;
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { recordAudio, transcribeWithOpenAI, transcribeWithWhisperCPP };
