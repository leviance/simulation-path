import test from "node:test";
import assert from "node:assert/strict";
import {
  compareDepth,
  defaultElevation,
  initialShutter,
  makeDepthStrip,
  makeSection,
  nearestProbe,
  presets,
  probePoint,
  raySegment,
  referenceSpot,
  sunlightBands,
  sunHorizontalSlope,
  traceProbe,
} from "../lib/labs/shutter-preview.ts";

const near = (actual, wanted, eps = 1e-8) =>
  assert.ok(Math.abs(actual - wanted) <= eps, actual + " != " + wanted);
const point = (z, y) => ({ z, y });

test("P35: ray/segment intersection handles an oblique ray, endpoint, parallel and behind", () => {
  near(raySegment(point(2, 0), point(-1, 1), point(0, 1), point(2, 1)), 1);
  near(raySegment(point(0, 0), point(1, 0), point(2, 0), point(3, 1)), 2);
  assert.equal(raySegment(point(0, 1), point(1, 0), point(0, 0), point(2, 0)), null);
  assert.equal(raySegment(point(2, 0), point(1, 0), point(1, -1), point(1, 1)), null);
});

test("P35: same native points identify slat four, a gap and a movable crate", () => {
  for (const [spot, blocker] of [
    ["slat", "blade"],
    ["gap", undefined],
    ["crate", "crate"],
  ]) {
    const { scene, probe } = referenceSpot(spot);
    const section = makeSection(scene),
      p = probePoint(section, probe),
      r = traceProbe(section, p);
    near(section.elevation, defaultElevation);
    near(section.slopeX, sunHorizontalSlope);
    near(scene.sliceX + section.slopeX * p.z, spot === "crate" ? 1.03 : -0.8);
    assert.equal(r.hit?.kind, blocker);
    if (spot === "slat") assert.equal(r.hit.index, 4);
    if (spot === "crate") {
      const moved = makeSection({ ...scene, boxX: -1.4 });
      assert.equal(moved.crate, null);
      assert.equal(traceProbe(moved, p).lit, true);
    }
  }
});

test("P35: tilt changes actual floor coverage; no preset substitutes a baked stripe image", () => {
  const totals = {};
  for (const [name, tilt] of Object.entries(presets)) {
    let lit = 0;
    for (let i = 0; i <= 300; i++) {
      const z = 1.6 + 0.005 * i;
      const section = makeSection({
        ...initialShutter(),
        tilt,
        boxX: 1.8,
        sliceX: -0.4 - sunHorizontalSlope * z,
      });
      if (traceProbe(section, point(z, 0)).lit) lit++;
    }
    totals[name] = lit;
  }
  assert.equal(totals.closed, 0);
  assert.ok(totals.half > 100 && totals.half < 155);
  assert.ok(totals.open > 225 && totals.open < 280);
  const open = makeSection({ ...initialShutter(), tilt: 42 });
  const closed = makeSection({ ...initialShutter(), tilt: -38 });
  assert.ok(sunlightBands(open).some((b) => b.receiver === "floor"));
  assert.ok(sunlightBands(open).some((b) => b.receiver === "crate"));
  assert.deepEqual(sunlightBands(closed), []);
  assert.equal(makeSection(initialShutter(), false).slats.length, 0);
});

test("P35: finite depth samples may disagree with the geometric ray; PCF compares before averaging", () => {
  const { scene, probe } = referenceSpot("gap"),
    s = makeSection(scene),
    p = probePoint(s, probe);
  const coarse = makeDepthStrip(s, 32),
    fine = makeDepthStrip(s, 512);
  const c = compareDepth(s, coarse, p, 0.025),
    f = compareDepth(s, fine, p, 0.025);
  assert.equal(c.lit, true);
  assert.equal(c.mapLit, false);
  assert.equal(f.mapLit, true);
  assert.ok(c.nearest < c.depth);
  assert.ok(f.nearest >= f.depth - 0.025);
  near(c.filtered, 1 / 3);
  assert.ok(fine.values.some((v) => v === null));
  assert.ok(fine.values.some((v) => v !== null));
  assert.equal(compareDepth(s, coarse, p, c.depth - c.nearest + 0.001).mapLit, true);
  assert.equal(compareDepth(s, coarse, p, c.depth - c.nearest + 0.001).lit, true);
  const outside = compareDepth(s, coarse, point(-10, 0), 0);
  assert.equal(outside.bin, -1);
  assert.equal(outside.nearest, null);
  assert.equal(outside.mapLit, true);
  assert.equal(outside.filtered, 1);
});

test("P35: a surface probe snaps to the real crate face and azimuth changes the section, not floor Lambert", () => {
  const s = makeSection(initialShutter());
  const probe = nearestProbe(s, point(2.2, 1.06));
  assert.equal(probe.surface, "top");
  near(probePoint(s, probe).y, 1);
  const right = probePoint(s, { surface: "far", t: 0.45 });
  assert.equal(traceProbe(s, right).hit?.kind, "crate");
  near(traceProbe(s, right).hit.t, 0);
  const turned = makeSection({ ...initialShutter(), sun: 22 });
  assert.ok(turned.elevation > s.elevation);
  assert.ok(turned.slopeX > s.slopeX);
  near(turned.sunY, s.sunY);
  const clear = makeSection({ ...initialShutter(), boxX: -2 });
  assert.equal(clear.crate, null);
  assert.equal(nearestProbe(clear, point(2.2, 1.06)).surface, "floor");
});
