{{/* Common labels applied to every resource. */}}
{{- define "ecommerce.labels" -}}
app.kubernetes.io/part-of: ecommerce
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
ecommerce.io/env: {{ .Values.env }}
{{- end -}}
