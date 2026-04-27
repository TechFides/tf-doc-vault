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
  description = "Cloud Run service name (also Artifact Registry repo)"
  type        = string
  default     = "docs-web"
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "256Mi"
}

variable "min_instances" {
  type    = number
  default = 0
}

variable "max_instances" {
  type    = number
  default = 3
}

variable "public" {
  type        = bool
  default     = true
  description = "Allow allUsers to invoke. Set false for IAM-protected setups."
}
