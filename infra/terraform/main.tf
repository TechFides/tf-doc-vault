terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "< 8.7"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ── APIs ──────────────────────────────────────────────────────────────────────

resource "google_project_service" "apis" {
  for_each = toset(concat(
    [
      "artifactregistry.googleapis.com",
      "run.googleapis.com",
      "iam.googleapis.com",
    ],
    var.iap_enabled ? ["iap.googleapis.com"] : [],
  ))
  service            = each.key
  disable_on_destroy = false
}

# ── Artifact Registry ─────────────────────────────────────────────────────────

resource "google_artifact_registry_repository" "docs" {
  depends_on    = [google_project_service.apis]
  repository_id = var.service_name
  format        = "DOCKER"
  location      = var.region
  description   = "Docker images for ${var.service_name}"
}

# ── CI/CD service account ─────────────────────────────────────────────────────

resource "google_service_account" "ci" {
  account_id   = "${var.service_name}-ci"
  display_name = "${var.service_name} CI/CD"
  description  = "Service account for the build pipeline: push image, deploy Cloud Run"
}

resource "google_artifact_registry_repository_iam_member" "ci_writer" {
  repository = google_artifact_registry_repository.docs.repository_id
  location   = var.region
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.ci.email}"
}

resource "google_project_iam_member" "ci_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.ci.email}"
}

resource "google_project_iam_member" "ci_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.ci.email}"
}

resource "google_service_account_key" "ci" {
  service_account_id = google_service_account.ci.name
}

# ── Cloud Run ─────────────────────────────────────────────────────────────────

data "google_project" "this" {
  count      = var.iap_enabled ? 1 : 0
  project_id = var.project_id
}

locals {
  registry_path = "${var.region}-docker.pkg.dev/${var.project_id}/${var.service_name}"
  initial_image = "us-docker.pkg.dev/cloudrun/container/hello"
}

resource "google_cloud_run_v2_service" "docs" {
  depends_on  = [google_project_service.apis]
  name        = var.service_name
  location    = var.region
  ingress     = "INGRESS_TRAFFIC_ALL"
  iap_enabled = var.iap_enabled

  template {
    containers {
      image = local.initial_image
      ports {
        container_port = 8080
      }
      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle = true
      }
    }
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
  }

  lifecycle {
    precondition {
      condition     = !(var.iap_enabled && var.public)
      error_message = "iap_enabled and public cannot both be true: an allUsers invoker defeats IAP. Set public = false."
    }
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }
}

# ── Public access ─────────────────────────────────────────────────────────────

resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.public ? 1 : 0
  name     = google_cloud_run_v2_service.docs.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ── IAP access ────────────────────────────────────────────────────────────────

# Without this invoker grant the sign-in succeeds and the browser then gets 403.
# The IAP service agent does not exist until someone runs
# `gcloud beta services identity create --service=iap.googleapis.com --project=<project>`;
# google_project_service_identity is google-beta only, so that step stays manual.
resource "google_cloud_run_v2_service_iam_member" "iap_invoker" {
  count    = var.iap_enabled ? 1 : 0
  name     = google_cloud_run_v2_service.docs.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:service-${data.google_project.this[0].number}@gcp-sa-iap.iam.gserviceaccount.com"
}

resource "google_iap_web_cloud_run_service_iam_member" "iap_accessor" {
  for_each               = var.iap_enabled ? toset(var.iap_members) : toset([])
  project                = var.project_id
  location               = var.region
  cloud_run_service_name = google_cloud_run_v2_service.docs.name
  role                   = "roles/iap.httpsResourceAccessor"
  member                 = each.key
}

# Scoped to this service: the same setting on projects/<n>/iap_web would switch every IAP resource in
# the project to this client.
resource "google_iap_settings" "oauth" {
  count = var.iap_enabled && var.iap_oauth_client_id != null ? 1 : 0
  name  = "projects/${data.google_project.this[0].number}/iap_web/cloud_run-${var.region}/services/${google_cloud_run_v2_service.docs.name}"

  access_settings {
    oauth_settings {
      client_id     = var.iap_oauth_client_id
      client_secret = var.iap_oauth_client_secret
    }
  }

  lifecycle {
    precondition {
      condition     = var.iap_oauth_client_secret != null
      error_message = "iap_oauth_client_id is set without iap_oauth_client_secret."
    }
  }
}
