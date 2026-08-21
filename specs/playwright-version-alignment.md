# Playwright: udržet obě závislosti na stejné verzi

**Cíl:** obnova locku (Renovate `lockFileMaintenance`) už nikdy nesmí rozejít
verze `playwright` a `@playwright/test`. Rozjezd shodí celý smoke tier.

## Mechanismus poruchy

`package.json` deklaruje Playwright dvakrát a s jinou strategií:

- `dependencies.playwright: "^1.59.1"`: runtime závislost publikovaného balíčku,
  používá ji `src/scripts/export-pdf.ts`. Rozsah je pro knihovnu správný, protože
  konzumenti si mají verzi dedupovat sami.
- `devDependencies["@playwright/test"]`: Renovate ji přes `config:best-practices`
  (a v něm `:pinDevDependencies`) drží připíchnutou na přesné verzi.

`@playwright/test@X` závisí na `playwright@X` přesně. Obnova locku sahá jen na
lock, ne na `package.json`: `playwright` proto vyplave na nejnovější 1.x, zatímco
připíchnutý `@playwright/test` zůstane, kde byl. pnpm pak drží dvě kopie
Playwrightu a runner odmítne posbírat testy s hlášením
`two different versions of @playwright/test`.

Takhle padl PR #40 (lock file maintenance): lock vyplaval `playwright` na 1.62.1
proti připíchnutému `@playwright/test` 1.60.0. Merge PR #39 to vyřešil jen shodou
okolností, protože zvedl pin na 1.62.1. Příští obnova locku by chybu vyrobila
znovu.

## Zvažované varianty

| varianta                                                          | zabrání rozjezdu při obnově locku? | poznámka                                                                                      |
| ----------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| seskupit obě závislosti do jednoho PR                             | ne                                 | obnova locku rozsahy obnovuje bez ohledu na seskupení; pomůže jen u běžných update PR         |
| `@playwright/test` na rozsah `^`, výjimka z pinování devDeps      | **ano**                            | obě závislosti pak plavou na stejnou nejnovější 1.x, protože Playwright je vydává v lockstepu |
| `pnpm.overrides` vynucující `playwright` podle `@playwright/test` | ano                                | funguje, ale přidává další mechanismus a musí se držet v synchronu; těžší než potřeba         |
| připíchnout runtime `playwright` přesně                           | ano                                | pro publikovanou knihovnu nevhodné: svazuje verzi konzumentům                                 |
| nechat být a opravovat ručně                                      | ne                                 | opakuje se každou obnovu locku, tedy potenciálně každý týden                                  |

## Zvolené řešení

1. `package.json`: `@playwright/test` z `1.62.1` na `^1.62.1`.
2. `renovate.json`: packageRule s `rangeStrategy: "replace"` pro
   `@playwright/test`, aby ho `:pinDevDependencies` nepřipíchlo zpátky. Popis
   pravidla nese důvod, protože jinak to vypadá jako odchylka od konvence repa.
3. `renovate.json`: druhé pravidlo seskupuje `playwright` a `@playwright/test`
   pro **major** update do jednoho PR. Non-major už drží pohromadě
   `group:allNonMajor`; u majoru by ale sloučení jednoho bez druhého rozjezd
   vyrobilo znovu.
4. `docs/TESTING.md`: odstavec u smoke tieru, aby někdo pin nevrátil zpátky.

Lock se přegeneruje `pnpm install` (mění se jen specifikátor u importera).

## Ověření

- `pnpm ls playwright @playwright/test` ukáže jedinou verzi obou.
- Simulace obnovy locku (smazat `pnpm-lock.yaml`, `pnpm install`) skončí opět
  s jedinou verzí, což je vlastní test opravy.
- `pnpm test:smoke` projde.

## Mimo rozsah

Zbytek `renovate.json` se nemění. Redundantní `security:minimumReleaseAgeNpm`
a vlastní blok `lockFileMaintenance` (obojí už přichází z
`config:best-practices`) zůstávají, jak jsou; je to samostatné téma.
