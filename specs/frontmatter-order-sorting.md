# Implementační plán: řazení sidebaru přes `order` ve frontmatteru

Zdroj: feature request Kateřiny Severové (Slack, 20. 8. 2026).

Generátor sidebaru a nav řadí položky výhradně abecedně přes `localeCompare(name, "cs")`,
s jedinou výjimkou `index.md`, které je vždy první. Frontmatter se čte jen kvůli `title`.
Jediný funkční způsob, jak pořadí řídit, je číselný prefix v názvu souboru (`001-`), který
funguje jen jako vedlejší efekt abecedního řazení.

Přitom `order:` už tenhle repozitář produkuje: mají ho index soubory v `playground/docs`
a generují ho boilerplate skilly `docs-technical-from-code` a `docs-functional-from-code`,
jejichž `SKILL.md` ho popisují jako oficiální mechanismus. Konvence tedy existuje, chybí
k ní implementace.

Cíl: `order` se stane skutečným řadicím klíčem na všech úrovních, povinným polem hlídaným
lintem, a `normalize` ho umí doplnit do existujícího stromu beze změny vykresleného pořadí.

## Klíčová rozhodnutí

- **Sdílený primitiv, ne sdílený průchod.** Vzniká `src/shared/` s čtečkou frontmatteru a
  řazením sourozenců; sidebar i `build-print-page` si nechávají vlastní walker a mění jen
  volání `sort`. Varianta, kdy by `build-print-page` konzumoval výstup `generateSidebar()`,
  je zamítnutá: sidebar vrací URL, print potřebuje cesty na disku a zpětné mapování je
  křehké (unified režim, sekce bez `index.md`, root stránky) za cenu výrazně většího zásahu,
  než je samotná feature.
- **`validate-docs` přejde na stejnou čtečku frontmatteru.** Dokud má lint svůj parser a
  generátor svůj, může lint schválit hodnotu, kterou sidebar ignoruje. Není to drive-by
  refactor, ale podmínka správnosti.
- **Verze se přes `order` neřadí.** `getVersions` zůstává abecední, protože `v1`, `v2`, `v3`
  je zároveň chronologické.
- **Žádný vlastní migrační příkaz.** Doplnění `order` obstará `normalize`. Obecný `migrate`
  s registrem verzovaných kroků by dnes měl jediný krok a překrýval by se se `sync`, který
  už roli „tvoje repo vs aktuální baseline" drží pro deploy a config soubory.
- **Přejmenování prefixů není ve scope.** Odstranění `001-` mění URL, tedy rozbíjí interní
  i externí odkazy. Zůstane popsané v `MIGRATIONS.md` jako volitelný ruční úklid.
- **Bez cachování.** `extractTitle` už dnes čte každý soubor při stavbě sidebaru; nově se
  u podsložek přečte `index.md` ještě jednou během řazení. U stromu o desítkách až nižších
  stovkách souborů je to zanedbatelné, zatímco cache klíčovaná cestou by se ve `vitepress dev`
  rozešla s realitou při editaci.
- **Žádná nová závislost.** Ruční parsování frontmatteru zůstává, `gray-matter` se nezavádí.

## Pravidla řazení

`order` je celé číslo. Platná hodnota odpovídá `/^-?\d+$/`; cokoli jiného (`abc`, `1.5`,
prázdno) se v runtime chová jako chybějící `order` a lint na to hlásí chybu.

Ve složce `D` jsou položky soubory `*.md` kromě `index.md` plus podsložky (mimo `.vitepress`,
`node_modules`, `public` a tečkové):

1. `index.md` složky `D` se vloží první a o pozici nesoutěží.
2. Klíč položky: u souboru `x.md` jeho vlastní `order`, u podsložky `sub/` order z
   `sub/index.md`.
3. Nejdřív položky s platným `order` vzestupně. Při shodě rozhoduje `localeCompare(name, "cs")`,
   takže duplicita nikdy neprodukuje nedeterministický výstup, jen ji nahlásí lint.
4. Pak položky bez platného `order`, mezi sebou `localeCompare(name, "cs")`.

Soubory a podsložky sdílí jeden číselný prostor: `order: 2` na stránce a `order: 2` na
podsložce ve stejné složce je kolize.

Pravidlo se aplikuje na pěti místech, dnes všech čistě abecedních:

| místo                                  | co řadí                                     |
| -------------------------------------- | ------------------------------------------- |
| `generateNav`                          | sekce ve verzi (order z `<sekce>/index.md`) |
| `generateNav`, větev bez sekcí         | root `.md` soubory verze                    |
| `generateSidebar`, multi-section větev | root položky verze                          |
| `buildSidebarItems`                    | rekurzivně soubory i podsložky              |
| `build-print-page`                     | vlastní `subDirs` a `mdFilesIn`             |

## Moduly a dotčené soubory

Nové interní moduly, mimo `exports` v `package.json`:

- `src/shared/frontmatter.ts`: `readFrontmatter(filePath)`, `readTitle(filePath)`
  (`title` s fallbackem na název souboru), `parseOrder(raw)` (celé číslo nebo `null`)
- `src/shared/ordering.ts`: `sortSiblings(dir, entries)` a `orderOf(dir, entry)`, kde
  `entries` je cokoli s `name` a `isDirectory()`, takže `fs.Dirent` sedí přímo

| soubor                            | změna                                                              |
| --------------------------------- | ------------------------------------------------------------------ |
| `src/sidebar/index.ts`            | vlastní `extractTitle` a tři `sort` volání nahrazeny sdílenými     |
| `src/scripts/build-print-page.ts` | vlastní `extractTitle` a dvě `sort` volání nahrazeny sdílenými     |
| `src/scripts/validate-docs.ts`    | vlastní `parseFrontmatter` nahrazen sdíleným, nová skupina kontrol |
| `src/scripts/normalize-docs.ts`   | `order` do `FIELD_ORDER` za `updated_at`, doplňování hodnot        |
| `src/cli/import-confluence.ts`    | `order` do zapisovaného frontmatteru                               |

`normalize-docs` si svůj blokový parser nechává: dělá něco jiného, zachovává víceřádkové
bloky kvůli přepisu souboru.

Publikovaná API se nemění. `generateNav`, `generateSidebar` a `getVersions` mají stejné
signatury, konzumentský `.vitepress/config.ts` nikdo nesahá. PDF export se sveze
s `build-print-page`, protože renderuje už postavenou `/print` stránku.

## Lint

Do `validate-docs.ts` přibude samostatná skupina **Order** vedle stávajících pěti, aby
z výstupu šlo poznat, že padá právě řazení.

1. `order` je povinný u každého `.md`. Výjimka jsou dva kořeny bez sourozenců:
   `<root>/index.md` a `<root>/*/index.md` (verze).
2. Hodnota musí být celé číslo. `order: abc` i `order: 1.5` je chyba, ne tichý fallback.
3. Unikátnost mezi sourozenci. Pro složku `P` se sbírá `order` z každého `P/*.md` kromě
   `P/index.md`, plus `order` z každého `P/<sub>/index.md`. Kolize se hlásí s oběma cestami.
4. Podsložka bez `index.md` je chyba: nemá kam `order` zapsat, takže vždy spadne do
   abecedního ocasu. Výjimkou jsou složky verzí (`<root>/*/`), které se přes `order`
   neřadí, takže `index.md` mít nemusí.

Formát výstupu, exit kód i `--root=` zůstávají beze změny:

```text
✗ Order (2 issues)
  v1/tokens/002-typography.md: duplicate order 2 (also in v1/tokens/003-spacing.md)
  v1/tokens/index.md: missing required field: order
```

## Doplňování `order` v `normalize`

`normalize` dnes jede po plochém seznamu z `allMdFiles`; nově se nejdřív projde strom
a spočítá přiřazení po složkách, pak už běží stávající zápisová smyčka.

Položkou složky je soubor `*.md` i podsložka; podsložce se hodnota zapisuje do jejího
`index.md`, stejně jako ji odtud čte generátor.

Pro každou složku se nové hodnoty přidávají **za nejvyšší existující `order` v té složce**,
v tom abecedním pořadí, v jakém ocas složky stojí i dnes. Existující platná hodnota se nikdy
nepřepisuje; neplatná (`order: abc`) se z pohledu přiřazení chová jako chybějící
a přepíše se, jinak by na ní lint padal napořád. To padne přesně na runtime pravidlo (položky bez `order` jdou na konec
abecedně), takže vykreslené pořadí je před i po `normalize` totožné. Ve složce, kde `order`
nemá nikdo, to degeneruje na `1..N` abecedně.

Duplicity `normalize` neopravuje, to je chyba pro člověka a hlásí ji `validate`. Podsložku
bez `index.md` vypíše jako přeskočenou.

Upgrade konzumentského repa je pak:

```bash
pnpm docs:normalize && pnpm docs:validate
```

## Confluence importér

`import-confluence` zapíše `order` podle pozice mezi sourozenci ve stromu. `children`
z `GET /wiki/api/v2/pages/{id}/children` chodí v pořadí stromu a `Promise.all` s `filter`
v `buildTree` to pořadí zachovává.

Číslují se až přežívající děti, tedy `1..N` po odfiltrování stránek, které se nepodařilo
stáhnout; jinak by ve výstupu vznikly díry a při větším výpadku i nejasnosti.

Vedlejší efekt, který dnes chybí: import zachová pořadí z Confluence. Teď se ztrácí
a soubory se řadí abecedně podle názvu.

## Testy

| tier                                          | co přibude                                                                                                                                                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/shared/`                          | nový soubor na `parseOrder` a `sortSiblings`                                                                                                                                                                                          |
| `tests/unit/sidebar/sidebar.test.ts`          | order vzestupně, `index.md` první i proti nižšímu `order`, míchaná složka, duplicita s deterministickým tiebreakem, pořadí sekce z jejího `index.md`, neplatná hodnota jako chybějící, strom bez jediného `order` vrací dnešní výstup |
| `tests/unit/scripts/validate-docs.test.ts`    | chybějící `order`, výjimka u obou kořenů, neplatná hodnota, duplicita s výpisem obou souborů, podsložka bez `index.md`                                                                                                                |
| `tests/unit/scripts/normalize-docs.test.ts`   | doplnění za nejvyšší existující, idempotence, nepřepsání existujících hodnot                                                                                                                                                          |
| `tests/unit/scripts/build-print-page.test.ts` | nový soubor, subprocess vzor podle `validate-docs.test.ts`                                                                                                                                                                            |

`playground/docs` a `templates/*/docs` se proženou novým `normalize`, aby vlastní
`docs:validate` prošel. Prefixy `001-` zůstávají; hodí se jako důkaz, že `order` funguje
i vedle nich.

## Dokumentace

- `boilerplate/CLAUDE.md`: `order` do tabulky povinných polí i do příkladu frontmatteru
- `boilerplate/README.md`: příklad frontmatteru
- `docs/updating-docs.md`: pravidla řazení, role `index.md`, unikátnost
- `docs/MIGRATIONS.md`: nová sekce s tím, že `docs:validate` v existujícím repu začne padat,
  dokud neproběhne `docs:normalize`; prefixy jako volitelný ruční úklid
- `docs/confluence-import.md`: importér zapisuje `order` a zachovává pořadí z Confluence
- `boilerplate/.claude/skills/docs-from-code/resources/frontmatter-template.md`: šablona
  obsahové stránky `order` nemá, doplnit
- `AGENTS.md`: `src/shared/` do repo mapy

## Dopad na existující repozitáře

Chování knihovny je zpětně kompatibilní; jediné, co se v existujícím repu rozbije, je
`docs:validate`, dokud neproběhne `docs:normalize`. Přesně tohle musí `MIGRATIONS.md`
říct nahlas.

## Mimo scope

- Přejmenování číselných prefixů a přepis odkazů
- Obecný `migrate` příkaz s registrem verzovaných kroků
- Řazení verzí přes `order`
- Přechodný režim lintu (warning místo chyby)

## Akceptační kritéria

| #   | kritérium                                                                 | kde se plní                                   |
| --- | ------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | `order: 2` v `index.md` sekce ji přesune v top menu na pozici 2           | `generateNav` přes `sortSiblings`             |
| 2   | `index.md` je v sidebaru vždy první, i proti nižšímu `order`              | pravidlo 1 v řazení                           |
| 3   | `01-foo.md` → `foo.md` plus `order: 1` nezmění pozici                     | pravidla 2 a 3 v řazení                       |
| 4   | soubor bez `order` generátor nerozbije, ale `validate` na něj hlásí chybu | pravidlo 4 v řazení, kontrola 1 v lintu       |
| 5   | dva soubory se shodným `order` → `validate` vypíše oba                    | kontrola 3 v lintu                            |
| 6   | repo bez jediného `order` má sidebar identický před i po upgradu          | pravidlo 4 v řazení, doplňování v `normalize` |
