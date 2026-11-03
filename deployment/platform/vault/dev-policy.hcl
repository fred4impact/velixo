# Read-only policy for the ecommerce-dev role — scoped to this app's own
# secrets path, nothing else in Vault. Matches the AWS Secrets Manager path
# convention already used (ecommerce/dev/*), so switching
# externalSecrets.auth between "static"/"irsa" and "vault" doesn't require
# renaming anything on the app side (see values.yaml
# backend.externalSecret.secretsManagerKey / devServices.*.externalSecretKey).
path "internal/data/ecommerce/dev/*" {
  capabilities = ["read"]
}
