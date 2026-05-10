---
"eyecite-ts": patch
---

test: expand corpus-sourced regression tests with 12 additional captions

Follow-up to the earlier 22-caption real-world test set: an expanded corpus mining sweep (more reporters, more volumes per reporter, broader patterns) recovered captions for several stems that were missed in the first pass. Adds 12 more verbatim captions covering: `hldgs` (NY 1st Dep't, 3d Cir.), `hldg` (singular), `telecomms` (Erie Telecomms., Denver Area Educ. Telecomms.), `cmtys` (Residential Cmtys.), `scis` (Health Scis. Ctr.), `conserv` (Soil & Water Conserv. Dist. v. United States ex rel. Wilson), `insp` (Grain Insp. Serv.), `reins` (Bellefonte Reins., Gerling Global Reins.), and `appx` (United States v. Stenson, F. App'x).

Total real-world test count: 34 captions across 21 distinct stems. Combined with the synthetic tests from the earlier commits, the new abbreviation stems are now exercised by both stylistically diverse synthetic captions and verbatim real-world citations from the Harvard Caselaw Access Project corpus.

A few stems remain without corpus matches in the volumes sampled — typically because the abbreviated form doesn't appear in published opinions (e.g., `supers` for "Supers." is rare in PA appellate text where "Supervisors" is usually spelled out; `vol` for "Vol. Fire" appears as "Volunteer Fire" in real text). These remain covered by synthetic tests and are still valid set entries for any future opinion that does use the abbreviated form.
