# Fleisig et al. (2002) Figure 5 — digitization trial

Status: **figure inspected, axes calibrated, one provisional reading tested;
NO validated 3D time-series extracted**.

## The exact source inspected

- Paper: Fleisig GS, Zheng N, Stodden DF, Andrews JR.
  *Relationship between bat mass properties and bat velocity*,
  Sports Engineering 5:1–8 (2002), doi:10.1046/j.1460-2687.2002.00096.x.
- Original Figure 5: https://www.academia.edu/figures/48188523/figure-5-digitized-motion-of-lefthanded-baseball-bat-swing
- Full text: https://www.academia.edu/33073663/Relationship_between_bat_mass_properties_and_bat_velocity
- Original Figure 5 image, linked externally (not redistributed):
  https://figures.academia-assets.com/53176736/figure_005.jpg
- Research page: [fleisig-figure5-digitizer.html](fleisig-figure5-digitizer.html)
- Pixel calibration and **unverified** example:
  [fleisig-figure5-seed.json](fleisig-figure5-seed.json)
- Check: `node research/verify-fleisig-figure5.mjs`

## Source-derived facts

- Figure 5 shows **the same single left-handed swing** in two projections.
- (a): X horizontal, Y vertical, viewed from overhead.
- (b): X horizontal, Z vertical, viewed from the side.
- Each short segment depicts the position between the two bat markers
  captured at 200 Hz = **5 ms per sample**.
- The paper's method describes two reflective markers: one on the barrel
  end and a narrow band **56 cm toward the handle** from the barrel end.
  The highlighted start and ball-contact bat depictions may show the
  **full bat**, not solely this ~56 cm marker span.
- The article reports baseball bats of roughly **81–86.4 cm** total length
  across the study; the particular sample bat model in Figure 5 is not
  indicated in the figure.
- The experiment used four synchronized 200 Hz cameras to obtain the
  actual 3D positions; **the figure alone** does not publish numeric
  time-to-3D point correspondence or the complete raw recordings.

## Pixel-axis calibration (estimated from the rendered 591×1000 figure)

| Plot | Axis | Tick A | Tick B |
|---|---|---|---|
| (a) overhead | X | 0m → px 72 | 3m → px 581 |
| (a) overhead | Y | -1m → px 437 | 2m → px 36 |
| (b) side | X | 0m → px 72 | 3m → px 581 |
| (b) side | Z | 0m → px 954 | 1.4m → px 551 |

These are approximate image-pixel calibrations, not original sensor metadata.

## Attempted first line reading

A rough manually sighted dark line in each projection is retained
**only as an unverified visual candidate** in the seed JSON.

It gives the following *illustrative calculation* when naively combined:

- Apparent 3D segment length: **~0.838m**.
- Disagreement of independent X projections for one end: **~0.077m**.
- Disagreement for the other end: **~0.112m**.

Although apparent total length is in the range of a full bat, the
**7.7–11.2cm cross-projection discrepancy** fails the viewer's 6cm
screen-reading tolerance. More importantly, the segment's identity,
which end is grip vs barrel, and whether the two panels show that
**same instant** have not been established.

Thus **zero confirmed points** and **zero trusted motion frames**.
Do not infer a 3D swing animation from this candidate or silently fit
it to a 56/85cm length constraint.

## Implemented review procedure

The browser digitizer draws the original image from the external host
and supports uploading the image if direct embedding is blocked.
It lets the reviewer:
1. Select one candidate line and click grip-side/barrel-side pixels
   in the overhead and side panels.
2. Convert pixels to meter coordinates using the calibrated axes.
3. Compare the two independent X values for the same putative
   physical marker; check whether the reconstructed length is
   consistent with either a short marker-to-marker segment (~56cm)
   or a full bat (~85cm).
4. Explicitly confirm that both projected lines represent the same
   instant. Only cross-checked confirmed points are shown in 3D or
   exported as a CSV for numerical modeling.
5. Export all raw annotations plus metadata as JSON for review.

**No frames have been forcibly assigned a time of impact or a 5ms index.**
The sequence number in the UI is an annotation ID, not confirmed time.

## Limitations and recommendation

Because dozens of marker-to-marker lines overlap and are not numbered,
manual identification of exactly corresponding 5ms frames from these
two drawings is intrinsically ambiguous. Figure 5 is useful as a
**geometric reference/quality constraint**, not sufficient by itself to
reconstruct an authoritative full 3D bat motion.

For the game, continue separately with the CMU-commercial-use measured
body motion and look for a less ambiguous source with frame IDs,
timestamps, two synchronized videos, or original numerical marker
data under commercial-use terms. Do not incorporate unpublished
Figure-5-derived motion in a commercial release without verifying
the rights for this use.

## Repository isolation

Only the research-real-swing-motion-20261114 research branch was
modified. `main` and PR #2 remain untouched.
