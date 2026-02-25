#!/usr/bin/env node

/**
 * sherpa-onnx-tts - Local text-to-speech CLI wrapper
 * 
 * Usage: sherpa-onnx-tts.js [options]
 * 
 * Options:
 *   -t, --text <text>    Text to synthesize
 *   -o, --output <file>  Output WAV file (default: stdout)
 *   --speed <speed>      Speech speed 0.5-2.0 (default: 1.0)
 *   --pitch <pitch>      Pitch adjustment -10 to 10 (default: 0)
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function parseArgs(args) {
  const options = {
    text: '',
    output: '',
    speed: 1.0,
    pitch: 0
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-t':
      case '--text':
        options.text = args[++i];
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '--speed':
        options.speed = parseFloat(args[++i]) || 1.0;
        break;
      case '--pitch':
        options.pitch = parseFloat(args[++i]) || 0;
        break;
    }
  }
  
  return options;
}

function runSherpaOnnx(options) {
  const runtimeDir = process.env.SHERPA_ONNX_RUNTIME_DIR;
  const modelDir = process.env.SHERPA_ONNX_MODEL_DIR;
  
  if (!runtimeDir || !modelDir) {
    return {
      success: false,
      error: 'SHERPA_ONNX_RUNTIME_DIR and SHERPA_ONNX_MODEL_DIR must be set'
    };
  }
  
  const binPath = path.join(runtimeDir, 'bin', 'sherpa-onnx-offline-tts');
  const modelPath = path.join(modelDir);
  
  // Find the actual model file
  let modelFile = '';
  let tokensFile = '';
  
  try {
    const files = fs.readdirSync(modelPath);
    modelFile = files.find(f => f.endsWith('.onnx')) || '';
    tokensFile = files.find(f => f === 'tokens.txt') || '';
  } catch (e) {
    return { success: false, error: `Cannot read model directory: ${e.message}` };
  }
  
  if (!modelFile) {
    return { success: false, error: 'No .onnx model file found in model directory' };
  }
  
  const args = [
    '--model', path.join(modelPath, modelFile),
    '--output', options.output || '/dev/stdout'
  ];
  
  if (tokensFile) {
    args.push('--tokens', path.join(modelPath, tokensFile));
  }
  
  // Add text input via stdin
  try {
    const result = spawnSync(binPath, args, {
      input: options.text,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024
    });
    
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    
    if (result.status !== 0) {
      return { 
        success: false, 
        error: result.stderr || `Process exited with code ${result.status}` 
      };
    }
    
    return { 
      success: true, 
      output: options.output ? `Saved to ${options.output}` : 'WAV data output'
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.error('Usage:');
    console.error('  sherpa-onnx-tts.js -t "Hello" -o output.wav');
    console.error('');
    console.error('Options:');
    console.error('  -t, --text <text>    Text to synthesize (required)');
    console.error('  -o, --output <file> Output WAV file');
    console.error('  --speed <speed>      Speech speed 0.5-2.0 (default: 1.0)');
    console.error('  --pitch <pitch>      Pitch adjustment -10 to 10 (default: 0)');
    console.error('');
    console.error('Environment:');
    console.error('  SHERPA_ONNX_RUNTIME_DIR   Path to sherpa-onnx runtime');
    console.error('  SHERPA_ONNX_MODEL_DIR     Path to voice model');
    process.exit(1);
  }
  
  const options = parseArgs(args);
  
  if (!options.text) {
    console.error('Error: --text is required');
    process.exit(1);
  }
  
  const result = runSherpaOnnx(options);
  console.log(JSON.stringify(result, null, 2));
  
  if (!result.success) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runSherpaOnnx, parseArgs };
