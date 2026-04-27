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
  description = "If true, allow allUsers to invoke the Cloud Run service. For private+basic-auth setups set to true and rely on htpasswd; for IAM-protected setups set to false."
  type        = bool
  default     = true
}
