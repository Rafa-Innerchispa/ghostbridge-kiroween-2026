/**
 * Synthetic fixture data for the offline Legacy Bridge demo.
 *
 * Authored by Kiro (Kiroween 2026, feat/cross-source-cases).
 *
 * These are verbatim copies of the files in /fixtures/.  They are embedded
 * here so the static GitHub Pages site can run the demo without a server.
 * Content is identical — no additional secrets or real data.
 */

export const RELAY_NIGHT_CSV =
`event_id,at,relay,state,duration_seconds
R001,2026-11-08T22:00:00Z,north-door,OPEN,185
R002,2026-11-08T22:01:00Z,north-door,CLOSED,
R003,2026-11-08T22:05:00Z,north-door,OPEN,130
R004,2026-11-08T22:10:00Z,north-door,CLOSED,`;

export const ACCESS_DENIED_JSON = {
  event_id: 'A001',
  at: '2026-11-08T22:00:30Z',
  reader: 'archive-reader',
  decision: 'DENIED',
};
