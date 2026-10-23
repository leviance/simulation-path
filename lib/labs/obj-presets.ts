export const OBJ_PRESETS = {
  cube: `# Cube: 8 position, 6 quad -> 12 triangle
o Cube
v -1 -1 -1
v 1 -1 -1
v 1 1 -1
v -1 1 -1
v -1 -1 1
v 1 -1 1
v 1 1 1
v -1 1 1
f 1 4 3 2
f 5 6 7 8
f 1 5 8 4
f 2 3 7 6
f 1 2 6 5
f 4 8 7 3`,
  triangle: `# Triangle có slash token
v -1 -1 0
v 1 -1 0
v 0 1 0
vt 0 0
vt 1 0
vt 0.5 1
vn 0 0 -1
f 1/1/1 2/2/1 3/3/1`,
  rocket: `# Low-poly rocket — created for Simulation Path, CC0-1.0
o LowPolyRocket

# Lower ring, clockwise when viewed from above
v 0.500000 -0.800000 0.000000
v 0.353553 -0.800000 0.353553
v 0.000000 -0.800000 0.500000
v -0.353553 -0.800000 0.353553
v -0.500000 -0.800000 0.000000
v -0.353553 -0.800000 -0.353553
v 0.000000 -0.800000 -0.500000
v 0.353553 -0.800000 -0.353553

# Upper ring
v 0.500000 0.800000 0.000000
v 0.353553 0.800000 0.353553
v 0.000000 0.800000 0.500000
v -0.353553 0.800000 0.353553
v -0.500000 0.800000 0.000000
v -0.353553 0.800000 -0.353553
v 0.000000 0.800000 -0.500000
v 0.353553 0.800000 -0.353553

v 0.000000 1.800000 0.000000
v 0.000000 -0.800000 0.000000

# Body sides
f 1 9 10
f 1 10 2
f 2 10 11
f 2 11 3
f 3 11 12
f 3 12 4
f 4 12 13
f 4 13 5
f 5 13 14
f 5 14 6
f 6 14 15
f 6 15 7
f 7 15 16
f 7 16 8
f 8 16 9
f 8 9 1

# Nose cone
f 9 17 10
f 10 17 11
f 11 17 12
f 12 17 13
f 13 17 14
f 14 17 15
f 15 17 16
f 16 17 9

# Base cap
f 1 2 18
f 2 3 18
f 3 4 18
f 4 5 18
f 5 6 18
f 6 7 18
f 7 8 18
f 8 1 18`,
  slash: `# Cùng position, token có UV/normal
v -1 -1 0
v 1 -1 0
v 1 1 0
v -1 1 0
vt 0 1
vt 1 1
vt 1 0
vt 0 0
vn 0 0 -1
f 1/1/1 2/2/1 3/3/1 4/4/1`,
  negative: `# Pentagon dùng index tương đối
v 0 -1 0
v 0.95 -0.3 0
v 0.6 0.9 0
v -0.6 0.9 0
v -0.95 -0.3 0
f -5 -4 -3 -2 -1`,
  malformed: `# Ba lỗi có line rõ ràng
v 0 0 0
v 1 nope 0
f 1 0 2
f 1 2 99`,
} as const;

export type ObjPreset = keyof typeof OBJ_PRESETS;
