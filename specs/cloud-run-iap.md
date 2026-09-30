# Volitelné IAP na Cloud Run službě

**Cíl:** Terraform modul `infra/terraform` umí zapnout Identity-Aware Proxy před
službou `docs`, aniž by změnil chování pro stávající konzumenty (výchozí je vypnuto).

## Rozhodnutí

- Proměnné `iap_enabled` (bool, `false`) a `iap_members` (list(string), `[]`).
- Vzájemné vyloučení s `public` řeší `lifecycle { precondition }` na službě, ne
  validace napříč proměnnými, aby zůstalo `required_version = ">= 1.5"`.
- Provider `hashicorp/google` je `>= 7.21, < 8.0`: argument `iap_enabled` na
  `google_cloud_run_v2_service` existuje od 7.21.0. Je to breaking change i s vypnutým IAP.
- Spravovaný OAuth klient Googlu: žádný `google_iap_brand` ani `google_iap_client`
  (API vypnuto v březnu 2026). Pustí jen účty z organizace projektu.
- Servisní agent IAP zakládá ruční `gcloud beta services identity create`, protože
  `google_project_service_identity` je jen v google-beta.

## Zdroje

- `google_project_service.apis`: přidá `iap.googleapis.com` při zapnutém IAP.
- `data.google_project.this`: číslo projektu pro adresu servisního agenta.
- `google_cloud_run_v2_service_iam_member.iap_invoker`: `roles/run.invoker` pro agenta.
- `google_iap_web_cloud_run_service_iam_member.iap_accessor`: jeden na člena.

## Ověření

`terraform validate` s výchozími hodnotami i s `iap_enabled = true`, `terraform fmt -check`,
`pnpm format:check && pnpm lint`. Návod pro konzumenty: `docs/MIGRATIONS.md`, sekce 0.6.
