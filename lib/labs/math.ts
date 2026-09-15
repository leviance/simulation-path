// Compatibility barrel for tests and non-visual consumers.
// Canvas components import the focused module they need so unrelated math stays out of their chunk.
export * from "./geometry.ts";
export * from "./angle.ts";
export * from "./turret.ts";
export * from "./transform.ts";
export * from "./normal.ts";
export * from "./projection.ts";
export * from "./rotation3d.ts";
export * from "./wireframe-cube.ts";
export * from "./fps-camera.ts";
export * from "./pipeline3d.ts";
export * from "./triangle-raster.ts";
export * from "./z-buffer.ts";
export * from "./obj-viewer.ts";
export * from "./stroke.ts";
export * from "./raster.ts";
export * from "./coordinate.ts";
export * from "./perspective-texture.ts";
export * from "./projectile.ts";
export * from "./integrator-race.ts";
export * from "./collision-tank.ts";
export * from "./spring-chain.ts";
export * from "./double-pendulum-chaos.ts";
export * from "./brute-force-particle-query.ts";
export * from "./spatial-grid.ts";
export * from "./quadtree.ts";
