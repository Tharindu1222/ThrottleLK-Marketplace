# ThrottleLK API smoke checks (PowerShell)
# Usage: from repo root, with API on :3001
#   powershell -File scripts/smoke-api.ps1

$ErrorActionPreference = 'Stop'
$api = $env:API_URL
if (-not $api) { $api = 'http://localhost:3001' }

function Assert-Ok($name, $cond) {
  if (-not $cond) { throw "FAIL: $name" }
  Write-Output "OK: $name"
}

$health = Invoke-RestMethod "$api/health"
Assert-Ok 'health' ($health.success -eq $true)

$brands = Invoke-RestMethod "$api/api/v1/brands"
Assert-Ok 'brands' ($brands.data.Count -gt 0)

$listings = Invoke-RestMethod "$api/api/v1/listings"
Assert-Ok 'listings' ($null -ne $listings.data)

$email = "smoke-$(Get-Random)@throttlelk.test"
$reg = Invoke-RestMethod -Uri "$api/api/v1/auth/register" -Method POST -ContentType 'application/json' -Body (@{
  firstName = 'Smoke'
  lastName = 'Tester'
  email = $email
  password = 'SmokeTest12!'
} | ConvertTo-Json)
Assert-Ok 'register' ($reg.data.accessToken)

$login = Invoke-RestMethod -Uri "$api/api/v1/auth/login" -Method POST -ContentType 'application/json' -Body (@{
  email = $email
  password = 'SmokeTest12!'
} | ConvertTo-Json)
$token = $login.data.accessToken
Assert-Ok 'login' ($token)

$logout = Invoke-RestMethod -Uri "$api/api/v1/auth/logout" -Method POST -ContentType 'application/json' -Body (@{
  refreshToken = $login.data.refreshToken
} | ConvertTo-Json)
Assert-Ok 'logout' ($logout.success -eq $true)

$admin = Invoke-RestMethod -Uri "$api/api/v1/auth/login" -Method POST -ContentType 'application/json' -Body (@{
  email = 'admin@throttlelk.lk'
  password = 'ChangeMeAdmin1!'
} | ConvertTo-Json)
$ah = @{ Authorization = "Bearer $($admin.data.accessToken)" }
$dash = Invoke-RestMethod -Uri "$api/api/v1/admin/dashboard" -Headers $ah
Assert-Ok 'admin dashboard' ($null -ne $dash.data.users)

Write-Output 'Smoke checks passed.'
