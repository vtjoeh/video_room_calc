# Speaker Reach: improvement plan

Implementation brief for the hidden Speaker Reach feature. Everything here
stays behind `isAudioTestMode()` (`?audio` / `?test`); a user without the
flag must see no change at all. Written after a verification pass on the
current code; the numbers in "Acceptance" were computed independently and
are what the finished work must reproduce.

Ground rules that apply to every phase:

- Bump `BUILD_VERSION` per change. The user runs git; give commands only.
  One commit per phase.
- No em dashes or hyphens breaking sentences in strings, comments or docs.
- Comments to a minimum; the reasoning lives in CLAUDE.md, not inline.
- No new `data_*` attribute unless a phase says so. Every field below
  already exists and already rides the four-place rule and the URL codes.
- The wire values `data_speakerCalc = 'cone' | 'spl'` and the URL codes
  (`sm`, `sr`, `sg`, `sn`, `sh`, `sq`, `sw`, `st`) do NOT change. Only
  labels change. A saved room or link from today must load identically.
- Update the "Speaker Reach" section of CLAUDE.md at the end of each phase.
- Verify live through the real dialog (preview server, SW cache cleared),
  not by calling functions in isolation. The 180 degree bug was only
  provable that way.

---

## Phase 1: fixes

Small, self-contained, ship first.

1. **Clamp the coverage angle.** `tan(90°)` is 1.6e16 in floating point,
   and 180 is on the spinner grid (min 10, max 180, step 5 from 90), so
   the current result is an 8e16 ft radius that commits, stores and
   round-trips. Clamp to `[10, 170]` in `speakerResolveSettings()` (the
   input `max` is advisory only), and clamp again in the `sn` URL decoder.
   Set the input `max` to 170 to match.
2. **Warn when the speaker is at or below ear level.** `Math.max(0, …)`
   rightly stops a negative radius but the dialog then reads
   "0 ft radius" with no explanation. Add `#spkrOutWarning`, the mirror of
   `#discasOutWarning`, shown in cone mode when `zPos <= earLevel`:
   "The speaker is at or below ear level, so its coverage cone never
   reaches the listening plane. Raise the mounting height."
3. **Fix the ear level labels.** 1500 mm is 59 in, not 62. Correct the
   speaker dialog tooltip to "1200 mm (47 in) seated, 1500 mm (59 in)
   standing". Keep sharing the DISCAS constants: ear sits about 100 mm
   below eye standing, which is inside planning tolerance, so do NOT add
   speaker-specific constants. (The same wrong inch figure is in the
   `DISCAS_EYE_STANDING_M` comment and possibly the DISCAS tooltip; that
   is outside the audio gate, so flag it in the report rather than fix it
   unasked.)
4. `radius * 1.414` becomes `radius * Math.SQRT2`.
5. **Ceiling never uses `'spl'`.** The dialog never offers it to a ceiling
   mount, but `speakerComputeGeometry()` would honour it from a URL or an
   import. Fall back to `'cone'` for a ceiling mount so the drawn circle
   can never be a level-derived radius on a speaker whose distance is
   fixed by geometry.

---

## Phase 2: attribution and naming

The display feature cites a numbered standard (ANSI/AVIXA V201.01). The
audio feature brands trigonometry and the inverse-square law as "AVIXA"
methods, which overclaims. Keep the math, change what it is called, and
let tooltips carry the provenance truthfully.

| Now | Becomes |
|---|---|
| Simplified Reach | Manual reach |
| AVIXA Coverage Cone (ceiling) | Coverage cone (mounting height × angle) |
| AVIXA SPL (loudness) | Sound level (sensitivity, power, distance) |

- Tooltip provenance, cone: "The ceiling speaker layout method taught in
  AVIXA CTS coursework." That is a true statement about origin, not a
  claim of authorship.
- The three spacing pattern names (edge-to-edge, minimum overlap,
  edge-to-center) stay exactly as they are; integrators recognise them.
- The footer drops its AVIXA sentence. The "not affiliated" line goes
  with it, since nothing left needs it. Reserve the word AVIXA for a
  future uniformity readout that cites ANSI/AVIXA A102.01 (Phase 6).
- **Manual reach shows its provenance.** Under the input, one line:
  "Cisco published reach: 4.5 m" for a Cisco device, "Default: 1.5 m"
  for the three generic ones (`speaker`, `loudspeaker`, `frontSpeaker`;
  a small `SPKR_GENERIC_DEVICE_IDS` set decides). A typed value is an
  override and the storage rule is unchanged (spec value is not stored).

---

## Phase 3: two groups, and loudness for ceiling speakers

The dialog's first sentence defines the feature as "pick a radius", and
every awkwardness follows from that: the dropdown that relabels itself by
mount, and loudness being unaddressed for the one speaker class where the
distance is fixed. Every speaker has two questions. Which one draws the
overlay depends on the mount:

| | Coverage (where the pattern is) | Loudness (is it enough) |
|---|---|---|
| Ceiling | **draws the circle**: cone at the ear plane | readout |
| Front / Cisco | readout: the dispersion wedge | **draws the reach**: inverse square to a target |

### Layout

Two labelled groups, **Coverage** and **Loudness**. The one that drives
the drawing carries "(draws the overlay)" in its heading. The method
dropdown moves INSIDE the driving group and offers only honest options:
ceiling gets Manual reach / Coverage cone; front gets Manual reach /
Sound level. The relabel-by-mount trick goes away because the options
list itself differs per mount.

Rewrite the opening sentence: "Where this speaker's coverage is drawn on
the room canvas, and whether it is loud enough there. Nothing here is
sent to the Workspace Designer."

### Ceiling loudness readouts (new)

Inputs live in the Loudness group and reuse existing fields:
`data_speakerSensitivity` (dB at 1 W / 1 m), `data_speakerPower` relabelled
**Transformer tap (W)** with 70V presets 0.5 / 1 / 2 / 4 / 8 / 16 offered
beside a free entry box (100V taps differ, and 3.75 W exists, so never a
closed list), and `data_speakerTargetSpl` relabelled **Design program
level (dB SPL)**, the same field the front method already solves toward.

Readouts, with `Δh = mount − ear` and `θ` the coverage angle:

```
SPL_centre = Sens + 10·log10(P) − 20·log10(Δh)
d_edge     = Δh / cos(θ/2)
SPL_edge   = Sens + 10·log10(P) − 20·log10(d_edge) − 6
drop       = SPL_centre − SPL_edge
headroom   = SPL_centre − program level
```

The −6 dB is the coverage angle's own definition (measured at constant
radius), and the edge point is also farther away, so the two add and do
not double count. Show four lines: centre level, edge level, centre to
edge drop, headroom over the program level. Headroom is the answer to
"is this speaker big enough"; do NOT show a raw signal-to-noise figure
against ambient, it flatters and answers nothing.

**Storage rule changes here.** `applySpeakerValuesToTarget()` currently
deletes the three loudness fields unless `calc === 'spl'`. They must now
persist (non-default only, as always) for a ceiling speaker in cone mode
too, or the readouts reset every time the dialog reopens.

### Front speaker parity (optional, small)

One readout in the Coverage group: the wedge angle it draws. One in
Loudness: level at 1 m directly in front (`Sens + 10·log10(P)`), the
"is it uncomfortable up close" number. Nothing else; the target level is
already the reach's definition.

---

## Phase 4: Cisco devices

No Cisco-specific formula. Cisco's published reach IS the formula, so
Manual reach with the Cisco provenance line (Phase 2) is the default and
the Sound level method is the override. Remove the "their own formula
comes later" note from CLAUDE.md when this lands.

---

## Phase 5: settings surface

The user is happy with `?audio` for now. Do not add a Settings checkbox
in this pass. Leave the `localStorage.audio` flag, the `#test` span
reveal and the force-hide in `speakerCoverageVisible()` exactly as they
are.

---

## Phase 6: out of scope, recorded so the design points there

VRC knows every ceiling speaker's position, so room-wide uniformity (the
actual ANSI/AVIXA A102.01 metric) is computable: a heat map over the
seating plane summing every speaker's contribution, the same technique as
the Wireless AP Planner prototype. The A102.01 citation belongs to that
readout and nowhere else. Not in this plan.

---

## Acceptance

Room in feet, generic ceiling speaker, mount 9 ft, seated ear (3.94 ft):

| Angle | Radius | Edge-to-edge | Min overlap | Edge-to-centre |
|---|---|---|---|---|
| 90° | 5.06 ft | 10.13 | 7.16 | 5.06 |
| 110° | 7.23 ft | 14.46 | 10.22 | 7.23 |
| 180° typed | clamps to 170°; radius finite, warning free | | | |
| mount 2 ft | radius 0 AND the warning shows | | | |

Room in metres, 2.7 m ceiling, 1.2 m ear, 90° cone, 89 dB sensitivity:

| Tap | Centre | Edge | Drop | Headroom over 75 dB |
|---|---|---|---|---|
| 1 W | 85.5 | 76.5 | 9.0 | 10.5 |
| 2 W | 88.5 | 79.5 | 9.0 | 13.5 |
| 4 W | 91.5 | 82.5 | 9.0 | 16.5 |

Also: a link saved today with `sm1sn900` loads to the same circle; with
the flag off, the toolbar button, the Details button and every string
above are absent; no console errors through the whole dialog flow.
