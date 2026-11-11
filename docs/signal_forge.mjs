/**
 * GhostBridge Signal Forge: deterministic, user-controlled SYNTHETIC event contract.
 * Authored by ChatGPT's direct GitHub review workflow, November 2026.
 * Not a Kiro IDE contribution. Reuses existing GhostBridge validation and correlator.
 */
import {WINDOW_SECONDS, DOOR_HELD_THRESHOLD} from './correlator.mjs';

export const FORGE_ANCHOR_UTC = '2026-11-08T22:00:30Z';
export const FORGE_DEFAULTS = Object.freeze({
  delaySeconds: 270,
  holdSeconds: 130,
  cameraOffline: false,
});
export const FORGE_BOUNDS = Object.freeze({delayMin: 1, delayMax: 360, holdMin: 60, holdMax: 240});

function integerInRange(value, label, min, max) {
  if (typeof value === 'string' && !/^[0-9]{1,4}$/.test(value)) {
    throw new Error(label + ' must contain decimal digits only');
  }
  const v = Number(value);
  if (!Number.isSafeInteger(v) || v < min || v > max) {
    throw new Error(label + ' must be an integer between ' + min + ' and ' + max);
  }
  return v;
}
export function normalizeForgeConfig(config = FORGE_DEFAULTS) {
  if (!config || Array.isArray(config) || typeof config !== 'object') throw new Error('Invalid forge configuration');
  const delaySeconds = integerInRange(config.delaySeconds, 'Delay', FORGE_BOUNDS.delayMin, FORGE_BOUNDS.delayMax);
  const holdSeconds = integerInRange(config.holdSeconds, 'Hold', FORGE_BOUNDS.holdMin, FORGE_BOUNDS.holdMax);
  if (typeof config.cameraOffline !== 'boolean') throw new Error('cameraOffline must be boolean');
  return {delaySeconds, holdSeconds, cameraOffline: config.cameraOffline};
}
const utc = offset => new Date(Date.parse(FORGE_ANCHOR_UTC) + offset * 1000).toISOString().replace('.000Z', 'Z');
const evt = (id,device,type,at,seconds) => ({
  id,device,type,at,data:seconds===undefined?{}:{duration_seconds:seconds}
});
/** Return validated-contract-shaped events without mutating any existing ledger. */
export function makeForgeEvents(input = FORGE_DEFAULTS) {
  const {delaySeconds,holdSeconds,cameraOffline} = normalizeForgeConfig(input);
  const events = [
    evt('forge:earlier-door', 'door-01', 'door.open', utc(-30), 185),
    evt('forge:denied', 'reader-01', 'access.denied', FORGE_ANCHOR_UTC),
    evt('forge:later-door', 'door-01', 'door.open', utc(delaySeconds), holdSeconds),
  ];
  if (cameraOffline) events.push(evt('forge:camera-offline','camera-01','camera.offline',utc(delaySeconds+5)));
  return events;
}
/** Forecast from explicit rule constants, never passed off as an actual case. */
export function evaluateForge(input = FORGE_DEFAULTS) {
  const config=normalizeForgeConfig(input);
  const windowPass=config.delaySeconds<=WINDOW_SECONDS;
  const holdPass=config.holdSeconds>=DOOR_HELD_THRESHOLD;
  const explanation=windowPass&&holdPass
    ? `The denied access is followed ${config.delaySeconds} seconds later by a door held ${config.holdSeconds} seconds. Both conditions pass.`
    : [
      !windowPass?`The door opens ${config.delaySeconds} seconds after denial, outside the ${WINDOW_SECONDS}-second correlation window.`:null,
      !holdPass?`The door is held for ${config.holdSeconds} seconds, below the ${DOOR_HELD_THRESHOLD}-second threshold.`:null,
    ].filter(Boolean).join(' ');
  return {config,windowPass,holdPass,willCorrelate:windowPass&&holdPass,explanation};
}
