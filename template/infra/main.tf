# Infrastructure for the docs site. Wraps the shared module from
# @techfides/tf-doc-vault (Cloud Run, Artifact Registry, IAM).

terraform {
  required_version = ">= 1.5"

  # tfstate lives in GCS, one bucket per project (`<gcp-project>-tfstate`).
  # Bootstrap it once before `terraform init`:
  #   gcloud storage buckets create gs://__GCP_PROJECT__-tfstate \
  #     --project=__GCP_PROJECT__ --location=europe-west1 \
  #     --uniform-bucket-level-access
  #   gcloud storage buckets update gs://__GCP_PROJECT__-tfstate --versioning
  backend "gcs" {
    bucket = "__GCP_PROJECT__-tfstate"
    prefix = "docs-web"
  }
}

module "docs" {
  source = "../node_modules/@techfides/tf-doc-vault/infra/terraform"

  project_id    = var.project_id
  region        = var.region
  service_name  = var.service_name
  cpu           = var.cpu
  memory        = var.memory
  min_instances = var.min_instances
  max_instances = var.max_instances
  public        = var.public
}
