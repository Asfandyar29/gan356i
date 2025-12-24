// GAN Cube AES-128 Encryption/Decryption
// Based on the official GAN protocol implementation

import LZString from 'lz-string';

// AES S-Box and related tables
const Sbox = [99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22];

const ShiftTabI = [0, 13, 10, 7, 4, 1, 14, 11, 8, 5, 2, 15, 12, 9, 6, 3];

// Initialize SboxI (inverse S-Box)
const SboxI: number[] = new Array(256);
for (let i = 0; i < 256; i++) {
  SboxI[Sbox[i]] = i;
}

// Initialize xtime table
const xtime: number[] = new Array(256);
for (let i = 0; i < 128; i++) {
  xtime[i] = i << 1;
  xtime[128 + i] = (i << 1) ^ 0x1b;
}

// Compressed encryption keys for GAN cubes
const KEYS = [
  "NoRgnAHANATADDWJYwMxQOxiiEcfYgSK6Hpr4TYCs0IG1OEAbDszALpA",
  "NoNg7ANATFIQnARmogLBRUCs0oAYN8U5J45EQBmFADg0oJAOSlUQF0g",
  "NoRgNATGBs1gLABgQTjCeBWSUDsYBmKbCeMADjNnXxHIoIF0g",
  "NoRg7ANAzBCsAMEAsioxBEIAc0Cc0ATJkgSIYhXIjhMQGxgC6QA",
  "NoVgNAjAHGBMYDYCcdJgCwTFBkYVgAY9JpJYUsYBmAXSA",
  "NoRgNAbAHGAsAMkwgMyzClH0LFcArHnAJzIqIBMGWEAukA"
];

class AES128 {
  private key: number[];

  constructor(key: number[]) {
    this.key = this.expandKey(key);
  }

  private expandKey(key: number[]): number[] {
    const exKey = key.slice();
    let rcon = 1;
    
    for (let i = 16; i < 176; i += 4) {
      let temp = exKey.slice(i - 4, i);
      
      if (i % 16 === 0) {
        temp = [
          Sbox[temp[1]] ^ rcon,
          Sbox[temp[2]],
          Sbox[temp[3]],
          Sbox[temp[0]]
        ];
        rcon = xtime[rcon];
      }
      
      for (let j = 0; j < 4; j++) {
        exKey[i + j] = exKey[i + j - 16] ^ temp[j];
      }
    }
    
    return exKey;
  }

  private static addRoundKey(state: number[], key: number[]): void {
    for (let i = 0; i < 16; i++) {
      state[i] ^= key[i];
    }
  }

  private static shiftSubAdd(state: number[], key: number[]): void {
    const temp = state.slice();
    for (let i = 0; i < 16; i++) {
      state[i] = SboxI[temp[ShiftTabI[i]]] ^ key[i];
    }
  }

  private static mixColumnsInv(state: number[]): void {
    for (let i = 0; i < 16; i += 4) {
      const s0 = state[i + 0];
      const s1 = state[i + 1];
      const s2 = state[i + 2];
      const s3 = state[i + 3];
      const h = s0 ^ s1 ^ s2 ^ s3;
      const xh = xtime[h];
      const h1 = xtime[xtime[xh ^ s0 ^ s2]] ^ h;
      const h2 = xtime[xtime[xh ^ s1 ^ s3]] ^ h;
      state[i + 0] ^= h1 ^ xtime[s0 ^ s1];
      state[i + 1] ^= h2 ^ xtime[s1 ^ s2];
      state[i + 2] ^= h1 ^ xtime[s2 ^ s3];
      state[i + 3] ^= h2 ^ xtime[s3 ^ s0];
    }
  }

  decrypt(data: number[]): number[] {
    const state = data.slice(0, 16);
    
    AES128.addRoundKey(state, this.key.slice(160, 176));
    
    for (let i = 144; i >= 16; i -= 16) {
      AES128.shiftSubAdd(state, this.key.slice(i, i + 16));
      AES128.mixColumnsInv(state);
    }
    
    AES128.shiftSubAdd(state, this.key.slice(0, 16));
    
    for (let i = 0; i < 16; i++) {
      data[i] = state[i];
    }
    
    return data;
  }
}

export class GanCubeDecoder {
  private decoder: AES128 | null = null;
  private iv: number[] = [];

  initDecoder(macAddress: string, keyVersion: number = 0): boolean {
    try {
      // Parse MAC address to bytes
      const macBytes: number[] = [];
      const parts = macAddress.split(/[:-]/);
      if (parts.length !== 6) {
        console.error('[GAN] Invalid MAC address format');
        return false;
      }
      
      for (let i = 0; i < 6; i++) {
        macBytes.push(parseInt(parts[i], 16));
      }
      
      // Get keys from compressed data
      const keyIndex = 2 + keyVersion * 2;
      const ivIndex = 3 + keyVersion * 2;
      
      if (keyIndex >= KEYS.length || ivIndex >= KEYS.length) {
        console.error('[GAN] Invalid key version');
        return false;
      }
      
      const keyData = JSON.parse(LZString.decompressFromEncodedURIComponent(KEYS[keyIndex]) || '[]');
      const ivData = JSON.parse(LZString.decompressFromEncodedURIComponent(KEYS[ivIndex]) || '[]');
      
      if (!keyData.length || !ivData.length) {
        console.error('[GAN] Failed to decompress keys');
        return false;
      }
      
      // Derive actual key and IV using MAC address
      const derivedKey: number[] = [];
      const derivedIv: number[] = [];
      
      for (let i = 0; i < 6; i++) {
        derivedKey[i] = (keyData[i] + macBytes[5 - i]) % 255;
        derivedIv[i] = (ivData[i] + macBytes[5 - i]) % 255;
      }
      
      // Pad to 16 bytes
      for (let i = 6; i < 16; i++) {
        derivedKey[i] = keyData[i] || 0;
        derivedIv[i] = ivData[i] || 0;
      }
      
      this.decoder = new AES128(derivedKey);
      this.iv = derivedIv;
      
      console.log('[GAN] Decoder initialized successfully');
      return true;
    } catch (e) {
      console.error('[GAN] Failed to init decoder:', e);
      return false;
    }
  }

  decode(data: DataView): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < data.byteLength; i++) {
      bytes[i] = data.getUint8(i);
    }
    
    if (!this.decoder) {
      return bytes; // Return raw if no decoder
    }
    
    // Decrypt using AES with IV
    if (bytes.length > 16) {
      const offset = bytes.length - 16;
      const tail = this.decoder.decrypt(bytes.slice(offset));
      for (let i = 0; i < 16; i++) {
        bytes[i + offset] = tail[i] ^ (this.iv[i] || 0);
      }
    }
    
    this.decoder.decrypt(bytes);
    
    for (let i = 0; i < 16; i++) {
      bytes[i] ^= (this.iv[i] || 0);
    }
    
    return bytes;
  }

  isInitialized(): boolean {
    return this.decoder !== null;
  }
}

// Helper to convert bytes to binary string for bit-level parsing
export function bytesToBinaryString(bytes: number[]): string {
  return bytes.map(b => (b + 256).toString(2).slice(1)).join('');
}

// Parse V2 protocol data
export interface V2ParsedData {
  type: number;
  gyro?: { x: number; y: number; z: number };
  moves?: { move: string; timestamp: number }[];
  moveCount?: number;
  battery?: number;
  facelet?: string;
}

export function parseV2Data(bytes: number[], prevMoveCnt: number): V2ParsedData {
  const binary = bytesToBinaryString(bytes);
  const msgType = parseInt(binary.slice(0, 4), 2);
  
  const result: V2ParsedData = { type: msgType };
  
  if (msgType === 1) {
    // Gyro data
    const x = parseInt(binary.slice(8, 16), 2) - 128;
    const y = parseInt(binary.slice(16, 24), 2) - 128;
    const z = parseInt(binary.slice(24, 32), 2) - 128;
    result.gyro = { x, y, z };
  } else if (msgType === 2) {
    // Move data
    const moveCnt = parseInt(binary.slice(4, 12), 2);
    result.moveCount = moveCnt;
    
    if (moveCnt !== prevMoveCnt && prevMoveCnt !== -1) {
      result.moves = [];
      for (let i = 0; i < 7; i++) {
        const moveCode = parseInt(binary.slice(12 + i * 5, 17 + i * 5), 2);
        const timestamp = parseInt(binary.slice(47 + i * 16, 63 + i * 16), 2);
        
        if (moveCode < 12) {
          const face = "URFDLB".charAt(moveCode >> 1);
          const dir = moveCode & 1 ? "'" : "";
          result.moves.push({ move: `${face}${dir}`, timestamp });
        }
      }
    }
  } else if (msgType === 9) {
    // Battery level
    result.battery = parseInt(binary.slice(8, 16), 2);
  }
  
  return result;
}
