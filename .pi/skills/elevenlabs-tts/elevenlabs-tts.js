#!/usr/bin/env node

/**
 * ElevenLabs Text-to-Speech Skill
 * Generate speech from text using ElevenLabs API
 */

const https = require('https');
const fs = require('fs');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

// Common voice IDs
const VOICES = {
  rachel: 'Rachel',
  drew: 'Drew',
  clive: 'Clive',
  bella: 'Bella',
  antoni: 'Antoni',
  charlie: 'Charlie',
  fin: 'Fin',
  josh: 'Josh',
  arnold: 'Arnold',
  gerald: 'Gerald'
};

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ statusCode: res.statusCode, headers: res.headers, data: buffer });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function listVoices() {
  const options = {
    hostname: 'api.elevenlabs.io',
    path: '/v1/voices',
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Accept': 'application/json'
    }
  };

  const response = await makeRequest(options);
  
  if (response.statusCode !== 200) {
    throw new Error(`API error: ${response.statusCode}`);
  }
  
  const result = JSON.parse(response.data.toString());
  return result.voices;
}

async function textToSpeech(text, outputFile, voiceId = 'Rachel') {
  // If voice is a short name, look it up
  let targetVoiceId = voiceId;
  if (VOICES[voiceId.toLowerCase()]) {
    targetVoiceId = VOICES[voiceId.toLowerCase()];
  }
  
  const options = {
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${targetVoiceId}`,
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    }
  };

  const postData = JSON.stringify({
    text: text,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5
    }
  });

  const response = await makeRequest(options, postData);
  
  if (response.statusCode !== 200) {
    const error = JSON.parse(response.data.toString());
    throw new Error(`TTS error: ${error.detail?.message || response.statusCode}`);
  }
  
  // Write audio to file
  fs.writeFileSync(outputFile, response.data);
  return outputFile;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (!ELEVENLABS_API_KEY) {
    console.error('Error: ELEVENLABS_API_KEY environment variable not set.');
    process.exit(1);
  }
  
  if (args.length === 0 || args[0] === '--list-voices') {
    try {
      const voices = await listVoices();
      console.log('Available voices:');
      voices.forEach(v => {
        console.log(`  ${v.voice_id} - ${v.name}${v.category ? ` (${v.category})` : ''}`);
      });
      process.exit(0);
    } catch (error) {
      console.error(`Error listing voices: ${error.message}`);
      process.exit(1);
    }
  }
  
  if (args.length < 2) {
    console.error('Usage: elevenlabs-tts.js <text> <output_file> [voice_id]');
    console.error('       elevenlabs-tts.js --list-voices');
    process.exit(1);
  }
  
  const text = args[0];
  const outputFile = args[1];
  const voiceId = args[2] || 'Rachel';
  
  try {
    console.log(`Generating speech with voice: ${voiceId}`);
    await textToSpeech(text, outputFile, voiceId);
    console.log(`Audio saved to: ${outputFile}`);
    console.log(`MEDIA:${outputFile}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
