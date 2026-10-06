variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run and Artifact Registry"
  type        = string
  default     = "europe-west1"
}

variable "service_name" {
  description = "Name of the Cloud Run service and Artifact Registry repository"
  type        = string
  default     = "docs-web"
}

variable "cpu" {
  description = "Cloud Run CPU limit"
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Cloud Run memory limit"
  type        = string
  default     = "256Mi"
}

variable "min_instances" {
  description = "Minimum Cloud Run instances (0 = scale to zero)"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
  default     = 3
}

variable "public" {
  description = "If true, allow allUsers to invoke the Cloud Run service. Set to true when the site is public or protected by basic auth (htpasswd); set to false for IAM-protected setups and whenever iap_enabled is true."
  type        = bool
  default     = true
}

variable "iap_enabled" {
  description = "If true, put Identity-Aware Proxy in front of the Cloud Run service. Requires public = false. Without iap_oauth_client_id it uses Google's managed OAuth client, which lets in only accounts of the project's organization."
  type        = bool
  default     = false
}

variable "iap_members" {
  description = "IAM principals granted roles/iap.httpsResourceAccessor when iap_enabled is true, e.g. domain:example.com or user:a@example.com"
  type        = list(string)
  default     = []
}

variable "iap_oauth_client_id" {
  description = "Custom OAuth client for IAP on this service, needed to let in accounts outside the project's organization. Null keeps Google's managed client."
  type        = string
  default     = null
}

variable "iap_oauth_client_secret" {
  description = "Secret of iap_oauth_client_id. Ends up in the Terraform state."
  type        = string
  default     = null
  sensitive   = true
}
