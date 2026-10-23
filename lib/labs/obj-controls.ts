export interface ObjViewerState {
  angleX: number;
  angleY: number;
  cameraYaw: number;
  cameraPitch: number;
  distance: number;
  cameraDrag: boolean;
  paused: boolean;
  solid: boolean;
  normals: boolean;
  culling: boolean;
  reverse: boolean;
  debug: boolean;
  grid: boolean;
}

export function initialObjViewer(stage = 8): ObjViewerState {
  return {
    angleX: -0.35,
    angleY: 0.65,
    cameraYaw: 0,
    cameraPitch: 0,
    distance: 4.2,
    cameraDrag: false,
    paused: true,
    solid: stage >= 6,
    normals: false,
    culling: stage >= 6,
    reverse: false,
    debug: true,
    grid: true,
  };
}

export function turnObjViewer(state: ObjViewerState, horizontal: number, vertical: number) {
  if (![horizontal, vertical].every(Number.isFinite)) return state;
  if (state.cameraDrag)
    return {
      ...state,
      paused: true,
      cameraYaw: (state.cameraYaw + horizontal) % (2 * Math.PI),
      cameraPitch: Math.max(-1.3, Math.min(1.3, state.cameraPitch + vertical)),
    };
  return {
    ...state,
    paused: true,
    angleY: (state.angleY + horizontal) % (2 * Math.PI),
    angleX: (state.angleX + vertical) % (2 * Math.PI),
  };
}

export function advanceObjViewer(state: ObjViewerState, dt: number, singleStep = false) {
  if (!Number.isFinite(dt) || (state.paused && !singleStep)) return state;
  return {
    ...state,
    angleY: (state.angleY + Math.max(0, Math.min(0.05, dt)) * 0.45) % (2 * Math.PI),
  };
}
