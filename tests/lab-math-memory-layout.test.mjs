import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultConfig, emptyParticle, spawnParticle, randomUnit, integrateParticle,
  advanceParticle, planEmission, fixedDt, makeParticlesAoS, makeParticlesSoA,
  maximumLayoutDifference, validSoA, updateAoSRange, updateSoARange,
  particleChecksum, readParticle, finiteParticle, modelTraffic, validateConfig,
} from "../lib/labs/fountain/state.ts";
import { createFountain, beginPhysics, beginConversion, tickPending, cancelPending } from "../lib/labs/fountain/scene.ts";

test("P32 independent emission, gravity and respawn fixtures", () => {
  const config = defaultConfig();
  config.emissionRate = 64;
  assert.deepEqual(planEmission(1, 20, 0.5, config, 1 / 32), { active: 3, remainder: 0.5 });
  assert.deepEqual(planEmission(4, 5, 0.5, config, 1 / 32), { active: 5, remainder: 0 });
  assert.equal(randomUnit(0, 0, 0, 0), 0);
  const particle = emptyParticle(7);
  Object.assign(particle, { velocityX: 1, velocityY: 2, velocityZ: 3, age: 0.25 });
  integrateParticle(particle, 1 / 32, -8);
  assert.deepEqual([particle.velocityY, particle.positionX, particle.positionY, particle.positionZ, particle.age], [1.75, 0.03125, 0.0546875, 0.09375, 0.28125]);
  Object.assign(particle, spawnParticle(7, 4, config));
  particle.age = particle.lifetime - 1 / 64;
  assert.equal(advanceParticle(particle, config, 1 / 32), true);
  assert.equal(particle.id, 7);
  assert.equal(particle.generation, 5);
  assert.ok(Math.abs(particle.age - 1 / 64) < 1e-6);
});

test("P32 all eleven fields round-trip; both float32 kernels agree through repeated respawns", () => {
  const config = defaultConfig(), initial = makeParticlesAoS(257, config);
  const copy = makeParticlesAoS(257, config);
  assert.deepEqual(copy, initial);
  for (const workload of ["gravity-only", "full-lifecycle"]) {
    const aos = structuredClone(initial), soa = makeParticlesSoA(initial);
    assert.equal(maximumLayoutDifference(aos, soa), 0);
    for (let step = 0; step < 400; step++) {
      updateAoSRange(aos, 0, aos.length, config, workload, aos.length);
      updateSoARange(soa, 0, soa.id.length, config, workload, soa.id.length);
    }
    assert.equal(maximumLayoutDifference(aos, soa), 0);
    assert.equal(aos.reduce((sum,p)=>sum+particleChecksum(p),0), Array.from({length:soa.id.length},(_,i)=>particleChecksum(readParticle(soa,i))).reduce((a,b)=>a+b,0));
    if (workload === "full-lifecycle") assert.ok(aos[0].generation > 0);
    else {
      assert.equal(aos[0].age, initial[0].age);
      assert.equal(aos[0].positionY, initial[0].positionY);
    }
  }
  const corrupt = makeParticlesSoA(initial);
  corrupt.generation[3]++;
  assert.equal(maximumLayoutDifference(initial, corrupt), Infinity);
  corrupt.generation = corrupt.generation.slice(1);
  assert.equal(validSoA(corrupt), false);
});

test("P32 Canvas commits a full 20000-target step atomically and cancels incomplete work", () => {
  const scene = createFountain(8, 2), original = structuredClone(scene.aos);
  let time = 0;
  scene.singleStep = true;
  beginPhysics(scene, time);
  tickPending(scene, ()=>++time, 0);
  assert.equal(scene.pending.cursor, 512);
  assert.equal(scene.steps, 0);
  assert.deepEqual(scene.aos, original);
  cancelPending(scene);
  assert.deepEqual(scene.aos, original);
  scene.singleStep = true;
  beginPhysics(scene, time);
  let ticks = 0;
  while (scene.pending) {
    tickPending(scene, ()=>++time, 0);
    assert.ok(++ticks < 1000);
  }
  assert.equal(scene.committedUpdated, 20000);
  assert.equal(scene.time, fixedDt);
  for (let i=0;i<scene.count;i++) {
    const old=original[i], next=scene.aos[i], remaining=Math.fround(old.lifetime-old.age);
    assert.equal(next.id,i);
    assert.equal(next.generation,old.generation+Number(fixedDt>=remaining));
    assert.equal(next.age,fixedDt>=remaining?Math.fround(fixedDt-remaining):Math.fround(old.age+fixedDt));
    assert.ok(finiteParticle(next));
  }
  beginConversion(scene, time);
  tickPending(scene, ()=>++time, 0);
  assert.equal(scene.layout,"aos");
  cancelPending(scene);
  assert.equal(scene.layout,"aos");
  beginConversion(scene,time);
  while(scene.pending) tickPending(scene,()=>++time,0);
  assert.equal(scene.layout,"soa");
  assert.equal(maximumLayoutDifference(scene.aos,scene.soa),0);
});

test("P32 cold pool preserves emission carry across conversion and reuses stable slots", () => {
  const scene=createFountain(8,0);
  let now=0, births=0;
  for(let step=0;step<300;step++) {
    scene.singleStep=true;
    beginPhysics(scene,now);
    while(scene.pending) tickPending(scene,()=>++now,0);
    births+=scene.born;
    if(step===0) {
      const carry=scene.emissionRemainder, before=structuredClone(scene.aos);
      beginConversion(scene,now);
      while(scene.pending) tickPending(scene,()=>++now,0);
      assert.equal(scene.emissionRemainder,carry);
      assert.equal(maximumLayoutDifference(before,scene.soa),0);
    }
  }
  assert.equal(scene.active,256);
  assert.equal(births,256);
  for(let i=0;i<scene.active;i++) assert.equal(readParticle(scene.soa,i).id,i);
  const before=scene.time;
  scene.singleStep=true;
  beginPhysics(scene,0);
  tickPending(scene,()=>20000,0);
  assert.equal(scene.pending,null);
  assert.equal(scene.time,before);
  assert.match(scene.notice,/15 giây/);
});

test("P32 bounds, precision and declared cache-line assumptions", () => {
  assert.throws(()=>makeParticlesAoS(1_000_000),/Canvas particle budget/);
  assert.throws(()=>validateConfig({...defaultConfig(),gravity:NaN}),/Non-finite/);
  assert.throws(()=>validateConfig(defaultConfig(),1),/budget/);
  validateConfig(defaultConfig(),Math.fround(1/30));
  assert.deepEqual(modelTraffic(64,"aos","gravity-only"),{usefulBytes:256,uniqueLines:44,loadedBytes:2816,upperBound:false});
  assert.equal(modelTraffic(64,"soa","gravity-only").uniqueLines,4);
  assert.equal(modelTraffic(64,"soa","full-lifecycle").upperBound,true);
  const soa=makeParticlesSoA(makeParticlesAoS(17));
  assert.equal(Object.values(soa).reduce((sum,array)=>sum+array.byteLength,0),17*44);
});
