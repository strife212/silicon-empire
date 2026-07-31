// Room layout shared by world (geometry) and placement (anchors).
// Rooms line up along +x; floor at y=0; back wall at z = -d/2.
export const ROOMS = [
  { era: 0, name: 'Garage',        x: 0,    w: 9,  d: 8,  wall: 0x4a4238, floor: 0x3a352c, light: 0xffd9a0, lightInt: 30 },
  { era: 1, name: 'Home Office',   x: 10.5, w: 10, d: 8,  wall: 0x56504a, floor: 0x4a4038, light: 0xfff2cc, lightInt: 35 },
  { era: 2, name: 'Office',        x: 24,   w: 16, d: 10, wall: 0x525a62, floor: 0x3e4448, light: 0xeef3ff, lightInt: 55 },
  { era: 3, name: 'Startup Loft',  x: 41.5, w: 16, d: 10, wall: 0x5e3f38, floor: 0x35302c, light: 0xffd9e8, lightInt: 45 },
  { era: 4, name: 'Server Room',   x: 59.5, w: 18, d: 12, wall: 0x39424e, floor: 0x2b3138, light: 0xdfe8ff, lightInt: 60 },
  { era: 5, name: 'Datacenter',    x: 86,   w: 32, d: 18, wall: 0x1d232b, floor: 0x171b20, light: 0xcfe0ff, lightInt: 90 },
  { era: 6, name: 'Quantum Vault', x: 113,  w: 12, d: 12, wall: 0x131820, floor: 0x0e1218, light: 0x8fb4ff, lightInt: 35 },
];
