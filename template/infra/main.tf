# Infrastructure for the docs site — wraps the shared module from
# @techfides/ana-docs (Cloud Run + Artifact Registry + IAM).

terraform {
  required_version = ">= 1.5"
}

module "docs" {
  # Use the version published with the consumed @techfides/ana-docs release.
  # Until we publish a stable v1.0.0 you can also reference a pinned commit:
  # source = "git::ssh://git@gitlab.com/techfides/tf-analysis/ana-docs.git//infra/terraform?ref=v0.1.0"
  source = "../node_modules/@techfides/ana-docs/infra/terraform"

  project_id    = var.project_id
  region        = var.region
  service_name  = var.service_name
  cpu           = var.cpu
  memory        = var.memory
  min_instances = var.min_instances
  max_instances = var.max_instances
  public        = var.public
}
