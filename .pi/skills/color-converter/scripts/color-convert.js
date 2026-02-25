#!/usr/bin/env node
/**
 * Color Converter - Transform colors between hex, rgb, hsl, hsv formats
 */

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    inputType: args[0],
    inputValue: args[1],
    targetFormat: args.includes('--format') ? args[args.indexOf('--format') + 1] : 'all'
  };
}

function parseHex(hex) {
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

function parseRgb(rgbStr) {
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return null;
  return {
    r: parseInt(match[0]),
    g: parseInt(match[1]),
    b: parseInt(match[2])
  };
}

function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function hsvToRgb(h, s, v) {
  h /= 360; s /= 100; v /= 100;
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

const namedColors = {
  red: '#FF0000', green: '#00FF00', blue: '#0000FF',
  white: '#FFFFFF', black: '#000000', yellow: '#FFFF00',
  cyan: '#00FFFF', magenta: '#FF00FF', silver: '#C0C0C0',
  gray: '#808080', grey: '#808080', maroon: '#800000',
  olive: '#808000', lime: '#00FF00', aqua: '#00FFFF',
  teal: '#008080', navy: '#000080', fuchsia: '#FF00FF',
  purple: '#800080', orange: '#FFA500'
};

function convert(inputType, inputValue) {
  let rgb = null;
  
  switch (inputType.toLowerCase()) {
    case 'hex':
      rgb = parseHex(inputValue);
      break;
    case 'rgb':
      rgb = parseRgb(inputValue);
      break;
    case 'hsl':
      const hslValues = parseRgb(inputValue);
      if (hslValues) rgb = hslToRgb(hslValues.r, hslValues.g, hslValues.b);
      break;
    case 'hsv':
      const hsvValues = parseRgb(inputValue);
      if (hsvValues) rgb = hsvToRgb(hsvValues.r, hsvValues.g, hsvValues.b);
      break;
    case 'name':
      const hex = namedColors[inputValue.toLowerCase()];
      if (hex) rgb = parseHex(hex);
      break;
    default:
      return null;
  }
  
  if (!rgb) return null;
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  
  return { rgb, hsl, hsv, hex };
}

function main() {
  const { inputType, inputValue, targetFormat } = parseArgs();
  
  if (!inputType || !inputValue) {
    console.log('Usage: color-convert.js <hex|rgb|hsl|hsv|name> <value> [--format <hex|rgb|hsl|hsv>]');
    process.exit(1);
  }
  
  const result = convert(inputType, inputValue);
  
  if (!result) {
    console.error('Error: Invalid color format');
    process.exit(1);
  }
  
  if (targetFormat === 'all') {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const fmt = targetFormat.toLowerCase();
    switch (fmt) {
      case 'hex': console.log(result.hex); break;
      case 'rgb': console.log(`rgb(${result.rgb.r}, ${result.rgb.g}, ${result.rgb.b})`); break;
      case 'hsl': console.log(`hsl(${result.hsl.h}, ${result.hsl.s}%, ${result.hsl.l}%)`); break;
      case 'hsv': console.log(`hsv(${result.hsv.h}, ${result.hsv.s}%, ${result.hsv.v}%)`); break;
      default: console.error('Unknown format:', targetFormat);
    }
  }
}

main();