---
"eyecite-ts": minor
---

Add `sessionLaw` citation type for state session laws (#350, #779)

California Statutes (`Stats. 1992, ch. 726, § 2, p. 3523`) and Nevada session laws (`2003 Nev. Stat., ch. 427, §§ 25-26, at 2590-95`) now extract as `type: "sessionLaw"`, carrying `jurisdiction` (`CA`/`NV`), `code` (`Stats.`/`Nev. Stat.`), `year`, `chapter`, and section/page fields — single (`§ 2`), list (`§§ 6, 7, 8` → `sections`), and range (`§§ 25-26` → `sectionRange`; `pp. 3038-3039` / `at 2590-95` → `pageRange`) forms. The federal `statutesAtLarge` form (`100 Stat. 2085`) and Nevada `NRS`/`NAC` statutes are unchanged.
