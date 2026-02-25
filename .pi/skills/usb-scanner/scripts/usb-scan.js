#!/usr/bin/env node
/**
 * USB Scanner - Scan USB devices
 */
const fs = require('fs');
const path = require('path');

const USB_DEVICES_PATH = '/dev/bus/usb';
const SYS_USB_PATH = '/sys/bus/usb/devices';

const USB_CLASSES = {
  0x00: 'Use interface class',
  0x01: 'Audio',
  0x02: 'Communications',
  0x03: 'Human Interface Device',
  0x05: 'Physical Interface',
  0x06: 'Image',
  0x07: 'Printer',
  0x08: 'Mass Storage',
  0x09: 'Hub',
  0x0A: 'CDC Data',
  0x0B: 'Smart Card',
  0x0D: 'Content Security',
  0x0E: 'Video',
  0x0F: 'Personal Healthcare',
  0x10: 'Audio/Video',
  0xDC: 'Diagnostic Device',
  0xE0: 'Wireless Controller',
  0xEF: 'Miscellaneous',
  0xFE: 'Application Specific',
  0xFF: 'Vendor Specific'
};

const VENDOR_IDS = {
  '0781': 'SanDisk',
  '0951': 'Kingston',
  '0BDA': 'Realtek',
  '05AC': 'Apple',
  '046D': 'Logitech',
  '04F2': 'Chicony',
  '0424': 'Standard Microsystems',
  '8087': 'Intel',
  '1D6B': 'Linux Foundation',
  '0CF3': 'Qualcomm Atheros',
  '1004': 'LG Electronics',
  '04E8': 'Samsung'
};

function parseArgs(args) {
  const result = {
    command: null,
    device: null,
    vendor: null,
    product: null,
    class: null,
    json: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--command': result.command = args[++i]; break;
      case '--device': result.device = args[++i]; break;
      case '--vendor': result.vendor = args[++i]; break;
      case '--product': result.product = args[++i]; break;
      case '--class': result.class = args[++i]; break;
      case '--json': result.json = true; break;
    }
  }
  return result;
}

function readUsbDescriptorData(path) {
  try {
    const data = fs.readFileSync(path);
    if (data.length < 18) return null; // Too short
    
    // USB descriptor format
    const bLength = data[0];
    const bDescriptorType = data[1];
    const bcdUSB = data.readUInt16LE(2);
    const bDeviceClass = data[4];
    const bDeviceSubClass = data[5];
    const bDeviceProtocol = data[6];
    const bMaxPacketSize = data[7];
    const idVendor = data.readUInt16LE(8);
    const idProduct = data.readUInt16LE(10);
    const bcdDevice = data.readUInt16LE(12);
    const iManufacturer = data[14];
    const iProduct = data[15];
    const iSerialNumber = data[16];
    const bNumConfigurations = data[17];
    
    return {
      idVendor,
      idProduct,
      vendorName: VENDOR_IDS[idVendor.toString(16).toUpperCase().padStart(4, '0')] || 'Unknown',
      deviceClass: bDeviceClass,
      deviceClassName: USB_CLASSES[bDeviceClass] || 'Unknown',
      maxPacketSize: bMaxPacketSize,
      numConfigurations: bNumConfigurations
    };
  } catch (e) {
    return null;
  }
}

function scanUsbBus(busPath) {
  const devices = [];
  
  try {
    const entries = fs.readdirSync(busPath);
    
    for (const entry of entries) {
      const devicePath = path.join(busPath, entry);
      
      if (fs.statSync(devicePath).isFile()) {
        const descriptor = readUsbDescriptorData(devicePath);
        if (descriptor) {
          devices.push({
            bus: path.basename(busPath),
            device: entry,
            path: devicePath,
            ...descriptor
          });
        }
      }
    }
  } catch (e) {
    // Permission denied or other error
  }
  
  return devices;
}

function scanUsbDevices() {
  const devices = [];
  
  if (!fs.existsSync(USB_DEVICES_PATH)) {
    // Try alternative method via /sys
    return scanViaSys();
  }
  
  try {
    const buses = fs.readdirSync(USB_DEVICES_PATH);
    
    for (const bus of buses) {
      const busPath = path.join(USB_DEVICES_PATH, bus);
      if (fs.statSync(busPath).isDirectory()) {
        const busDevices = scanUsbBus(busPath);
        devices.push(...busDevices);
      }
    }
  } catch (e) {
    // Try alternative
    return scanViaSys();
  }
  
  return devices;
}

function scanViaSys() {
  const devices = [];
  
  if (!fs.existsSync(SYS_USB_PATH)) {
    return devices;
  }
  
  try {
    const entries = fs.readdirSync(SYS_USB_PATH);
    
    for (const entry of entries) {
      if (entry.includes(':')) continue; // Skip interface entries
      
      const devicePath = path.join(SYS_USB_PATH, entry);
      try {
        const idVendor = fs.readFileSync(path.join(devicePath, 'idVendor'), 'utf8').trim();
        const idProduct = fs.readFileSync(path.join(devicePath, 'idProduct'), 'utf8').trim();
        const bDeviceClass = parseInt(fs.readFileSync(path.join(devicePath, 'bDeviceClass'), 'utf8').trim());
        
        devices.push({
          bus: entry.substring(0, 3),
          device: entry,
          path: devicePath,
          idVendor: parseInt(idVendor, 16),
          idProduct: parseInt(idProduct, 16),
          vendorName: VENDOR_IDS[idVendor.toUpperCase()] || 'Unknown',
          deviceClass: bDeviceClass,
          deviceClassName: USB_CLASSES[bDeviceClass] || 'Unknown',
          productName: 'USB Device'
        });
      } catch (e) {
        // Skip incomplete entries
      }
    }
  } catch (e) {
    // Cannot scan
  }
  
  return devices;
}

function filterDevices(devices, filters) {
  return devices.filter(d => {
    if (filters.vendor && !d.vendorName.toLowerCase().includes(filters.vendor.toLowerCase()) && 
        d.idVendor.toString(16).toUpperCase() !== filters.vendor.toUpperCase()) {
      return false;
    }
    if (filters.class && d.deviceClassName.toLowerCase().replace(/\s+/g, '_') !== filters.class.toLowerCase() &&
        d.deviceClassName.toLowerCase() !== filters.class.toLowerCase()) {
      return false;
    }
    return true;
  });
}

function getDeviceInfo(devicePath) {
  const devices = scanUsbDevices();
  return devices.find(d => d.path === devicePath || d.device === path.basename(devicePath));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  
  if (!args.command) {
    console.log('USB Scanner');
    console.log('Usage: usb-scan.js --command <cmd> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  list            List USB devices');
    console.log('  info            Get device info');
    console.log('');
    console.log('Options:');
    console.log('  --vendor <code>   Filter by vendor');
    console.log('  --class <type>    Filter by device class');
    console.log('  --json            Output as JSON');
    process.exit(1);
  }
  
  switch (args.command) {
    case 'list': {
      const devices = scanUsbDevices();
      const filtered = filterDevices(devices, { vendor: args.vendor, class: args.class });
      
      if (args.json) {
        console.log(JSON.stringify(filtered, null, 2));
      } else {
        console.log('USB Devices');
        console.log('═══════════');
        console.log('');
        
        if (filtered.length === 0) {
          console.log('No USB devices found');
          console.log('Note: This command may require elevated permissions');
        } else {
          for (const d of filtered) {
            console.log(`Bus ${d.bus.padStart(3)} Device ${d.device.padEnd(3)}`);
            console.log(`  Vendor: ${d.vendorName} (${d.idVendor.toString(16).toUpperCase().padStart(4, '0')})`);
            console.log(`  Product: ${d.idProduct.toString(16).toUpperCase().padStart(4, '0')}`);
            console.log(`  Class: ${d.deviceClassName}`);
            console.log('');
          }
        }
        
        console.log(`Found: ${filtered.length} device(s)`);
      }
      break;
    }
    
    case 'info': {
      if (!args.device) {
        console.error('Error: --device required');
        process.exit(1);
      }
      
      const device = getDeviceInfo(args.device);
      
      if (!device) {
        console.error('Device not found');
        process.exit(1);
      }
      
      if (args.json) {
        console.log(JSON.stringify(device, null, 2));
      } else {
        console.log('Device Information');
        console.log('══════════════════');
        console.log(`Path: ${device.path}`);
        console.log(`Bus: ${device.bus}`);
        console.log(`Device: ${device.device}`);
        console.log(`Vendor ID: 0x${device.idVendor.toString(16).toUpperCase().padStart(4, '0')}`);
        console.log(`Vendor Name: ${device.vendorName}`);
        console.log(`Product ID: 0x${device.idProduct.toString(16).toUpperCase().padStart(4, '0')}`);
        console.log(`Class: ${device.deviceClassName} (${device.deviceClass})`);
      }
      break;
    }
    
    default:
      console.error(`Unknown command: ${args.command}`);
      process.exit(1);
  }
}

main();