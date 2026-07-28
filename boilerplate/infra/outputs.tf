output "service_url" {
  value = module.docs.service_url
}

output "registry_path" {
  value = module.docs.registry_path
}

output "ci_service_account_email" {
  value = module.docs.ci_service_account_email
}

output "ci_service_account_key" {
  value     = module.docs.ci_service_account_key
  sensitive = true
}

output "setup_instructions" {
  value = module.docs.setup_instructions
}
