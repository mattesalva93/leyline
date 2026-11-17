# Print-and-cut sheets for Silhouette and Brother machines

The generator does not lay out sheets for Silhouette (Studio "Print & Cut") or Brother ScanNCut machines: no registration marks, no fixed machine grids, no matching cut files.

Cricut is served differently: its Design Space lays out the sheet itself from single images, so the generator exports one PNG per copy and needs no machine-specific geometry.

## Why this is out of scope

These machines read registration marks printed at positions their software expects, and cut along a cut file (`.studio3` for Silhouette) that has to match the card positions exactly. That means:

- a fixed grid per paper size, unlike our centred grid that follows from one minimum margin (ADR 0009);
- mark geometry for which neither vendor publishes a numeric spec, so it can only be measured against sheets their own software prints;
- cut templates drawn by hand in the vendor's app, since `.studio3` cannot be generated from code;
- a real machine to check every change, which no automated test can replace.

Without a machine to verify against, the feature would ship untested and fail on the one thing it promises: a cut that lands on the card's edge. It can come back if the maintainer gets access to such a machine; the starting point would be silhouette-card-maker (https://github.com/Alan-Cha/silhouette-card-maker), licence to be checked.

## Prior requests

- #90: "Funzioni da aggiungere alla vista del foglio"
