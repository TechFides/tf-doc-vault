output "service_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.docs.uri
}

output "registry_path" {
  description = "Artifact Registry path (use as IMAGE_REGISTRY in CI/CD)"
  value       = local.registry_path
}

output "ci_service_account_email" {
  description = "CI/CD service account email"
  value       = google_service_account.ci.email
}

output "ci_service_account_key" {
  description = "Base64-encoded JSON key for the CI/CD service account; store as secret GCP_SA_KEY"
  value       = google_service_account_key.ci.private_key
  sensitive   = true
}

output "setup_instructions" {
  description = "Instructions for completing the CI/CD setup"
  value       = <<-EOT
    ── Terraform apply complete ─────────────────────────────────────────────────

    1. Save the CI/CD service account key as a GitLab CI/CD secret:
       terraform output -raw ci_service_account_key | base64 -d > /tmp/sa-key.json
       # Copy /tmp/sa-key.json contents into the GCP_SA_KEY variable

    2. Set GitLab CI/CD variables:
       GCP_SA_KEY     = JSON key contents (see step 1)
       GCP_PROJECT    = ${var.project_id}
       GCP_REGION     = ${var.region}
       SERVICE_NAME   = ${var.service_name}

    3. Push to the default branch; the pipeline deploys the image to Cloud Run.

    4. Service URL:
       ${google_cloud_run_v2_service.docs.uri}
  EOT
}
