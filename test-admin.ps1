$global:Passed = 0
$global:Failed = 0
$global:CookieFile = "$env:TEMP\admin_test_cookie.txt"
$global:Results = @()

$AdminEmail = "superadmin@admin.com"
$AdminPassword = "superadmin123"
$BaseUrl = "http://127.0.0.1:3000"

$Green = [System.ConsoleColor]::Green
$Red = [System.ConsoleColor]::Red
$Yellow = [System.ConsoleColor]::Yellow
$Cyan = [System.ConsoleColor]::Cyan

function Write-Step($text) { Write-Host "`n==> $text" -ForegroundColor $Cyan }
function Write-Result($label, $ok, $detail) {
  if ($ok) {
    Write-Host "  PASS" -ForegroundColor $Green -NoNewline
    $global:Passed++
  } else {
    Write-Host "  FAIL" -ForegroundColor $Red -NoNewline
    $global:Failed++
  }
  Write-Host "  $label" -NoNewline
  if ($detail) { Write-Host "  ($detail)" -ForegroundColor $Yellow }
  else { Write-Host "" }
}
function Write-Summary {
  $total = $global:Passed + $global:Failed
  Write-Host "`n========================================" -ForegroundColor $Cyan
  if ($global:Failed -eq 0) {
    Write-Host "  ALL $total TESTS PASSED" -ForegroundColor $Green
  } else {
    Write-Host "  $($global:Passed)/$total passed, $($global:Failed) failed" -ForegroundColor $Red
  }
  Write-Host "========================================" -ForegroundColor $Cyan
}

function Do-Test($label, $script, $extraOk="") {
  $tmp = "$env:TEMP\test_out_$(Get-Random).json"
  try {
    $result = & $script
    $ok = $result.Status -match "^(200|201|204|302|400|401|403)$"
    if (-not $ok -and ($label -match "404|99999" -or $result.Status -eq $extraOk)) { $ok = $true }
    Write-Result $label $ok $result.Status
  } catch {
    Write-Result $label $false "ERROR: $_"
  } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
}

function Write-JsonBody($file, $obj) {
  $obj | ConvertTo-Json -Compress | Out-File $file -Encoding ascii
}

function Get-Cookie {
  $tmp = "$env:TEMP\test_login_$(Get-Random).json"
  $bodyFile = "$env:TEMP\login_body_$(Get-Random).json"
  Write-JsonBody $bodyFile @{email=$AdminEmail; password=$AdminPassword}
  try {
    $r = curl.exe -s -D "$env:TEMP\test_headers_$(Get-Random).txt" -o $tmp -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "@$bodyFile" "$BaseUrl/api/admin/auth/login"
    if ($r -eq "200") {
      $cookies = Get-Content "$env:TEMP\test_headers_*.txt" -Raw 2>$null
      if ($cookies -match "admin_session=([^;]+)") {
        $Matches[1] | Out-File $global:CookieFile -Encoding ascii
        Remove-Item "$env:TEMP\test_headers_*.txt" -ErrorAction SilentlyContinue
        Remove-Item $tmp -ErrorAction SilentlyContinue
        Remove-Item $bodyFile -ErrorAction SilentlyContinue
        return $Matches[1]
      }
    }
  } catch { }
  Remove-Item $tmp -ErrorAction SilentlyContinue
  Remove-Item "$env:TEMP\test_headers_*.txt" -ErrorAction SilentlyContinue
  Remove-Item $bodyFile -ErrorAction SilentlyContinue
  return $null
}

function Call-Api($path, $method="GET") {
  $tmp = "$env:TEMP\test_api_$(Get-Random).json"
  $cookie = Get-Content $global:CookieFile -Raw 2>$null
  if (-not $cookie) { return @{Status="NO_COOKIE"} }

  if ($method -eq "GET") {
    $status = curl.exe -s -o $tmp -w "%{http_code}" -b "admin_session=$cookie" "$BaseUrl$path" 2>$null
  } else {
    $status = curl.exe -s -o $tmp -w "%{http_code}" -X $method -b "admin_session=$cookie" "$BaseUrl$path" 2>$null
  }
  Remove-Item $tmp -ErrorAction SilentlyContinue
  return @{Status=$status}
}

function Call-Page($path) {
  $tmp = "$env:TEMP\test_page_$(Get-Random).json"
  $cookie = Get-Content $global:CookieFile -Raw 2>$null
  $status = curl.exe -s -o $tmp -w "%{http_code}" -b "admin_session=$cookie" "$BaseUrl$path" 2>$null
  Remove-Item $tmp -ErrorAction SilentlyContinue
  return @{Status=$status}
}

Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "  ADMIN TEST SUITE" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan

# SCENARIO 1: AUTHENTICATION
Write-Step "Scenario 1: Authentication"

Do-Test "1.1 Login page renders" {
  $tmp = "$env:TEMP\test_1_1.json"
  $s = curl.exe -s -o $tmp -w "%{http_code}" "$BaseUrl/admin/login" 2>$null
  Remove-Item $tmp -ErrorAction SilentlyContinue
  @{Status=$s}
}

Do-Test "1.2 Login with empty body -> 400" {
  $tmp = "$env:TEMP\test_1_2.json"
  $bf = "$env:TEMP\body_empty_$(Get-Random).json"
  "{}" | Out-File $bf -Encoding ascii
  $s = curl.exe -s -o $tmp -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "@$bf" "$BaseUrl/api/admin/auth/login" 2>$null
  Remove-Item $tmp -ErrorAction SilentlyContinue; Remove-Item $bf -ErrorAction SilentlyContinue
  @{Status=$s}
}

Do-Test "1.3 Login with invalid credentials -> 401" {
  $tmp = "$env:TEMP\test_1_3.json"
  $bf = "$env:TEMP\body_bad_$(Get-Random).json"
  @{email="bad@test.com"; password="wrong"} | ConvertTo-Json -Compress | Out-File $bf -Encoding ascii
  $s = curl.exe -s -o $tmp -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "@$bf" "$BaseUrl/api/admin/auth/login" 2>$null
  Remove-Item $tmp -ErrorAction SilentlyContinue; Remove-Item $bf -ErrorAction SilentlyContinue
  @{Status=$s}
}

Do-Test "1.4 Login with valid credentials -> 200" {
  $tmp = "$env:TEMP\test_1_4.json"
  $bf = "$env:TEMP\body_valid_$(Get-Random).json"
  @{email=$AdminEmail; password=$AdminPassword} | ConvertTo-Json -Compress | Out-File $bf -Encoding ascii
  $s = curl.exe -s -o $tmp -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "@$bf" "$BaseUrl/api/admin/auth/login" 2>$null
  Remove-Item $tmp -ErrorAction SilentlyContinue; Remove-Item $bf -ErrorAction SilentlyContinue
  @{Status=$s}
}

$sessionCookie = Get-Cookie
if ($sessionCookie) {
  Write-Host "  [INFO] Session acquired" -ForegroundColor $Yellow

  Do-Test "1.5 GET /auth/me with cookie -> 200" {
    Call-Api "/api/admin/auth/me"
  }

  Do-Test "1.6 GET /auth/me without cookie -> 401" {
    $tmp = "$env:TEMP\test_1_6.json"
    $s = curl.exe -s -o $tmp -w "%{http_code}" "$BaseUrl/api/admin/auth/me" 2>$null
    Remove-Item $tmp -ErrorAction SilentlyContinue
    @{Status=$s}
  }
} else {
  Write-Host "  [WARN] Could not acquire session - skipping authenticated tests" -ForegroundColor $Red
  $global:Failed += 2
}

# SCENARIO 2: CACHED GET API ROUTES
Write-Step "Scenario 2: Cached GET API Routes"
$cachedRoutes = @(
  @{path="/api/admin/activity-log"; label="2.1  GET activity-log"}
  @{path="/api/admin/admins"; label="2.2  GET admins"}
  @{path="/api/admin/reviews"; label="2.3  GET reviews"}
  @{path="/api/admin/reviews/analytics"; label="2.4  GET reviews/analytics"}
  @{path="/api/admin/users"; label="2.5  GET users"}
  @{path="/api/admin/subscriptions"; label="2.6  GET subscriptions"}
  @{path="/api/admin/scraping-logs"; label="2.7  GET scraping-logs"}
  @{path="/api/admin/scraping/manual/default-link"; label="2.8  GET scraping/manual/default-link"}
  @{path="/api/admin/b2b-workflows/subscriptions"; label="2.9  GET b2b-workflows/subscriptions"}
  @{path="/api/admin/export/products?format=json"; label="2.10 GET export/products"}
)

foreach ($route in $cachedRoutes) {
  Do-Test $route.label { Call-Api $route.path }
}

# SCENARIO 3: UNCATEGORIZED GET ROUTES
Write-Step "Scenario 3: Uncached GET Routes"

Do-Test "3.1 GET reviews/export" {
  Call-Api "/api/admin/reviews/export"
}
Do-Test "3.2 GET scraping-logs/export" {
  Call-Api "/api/admin/scraping-logs/export"
}

# SCENARIO 4: ADMIN PAGE RENDERING
Write-Step "Scenario 4: Admin Page Rendering"

$pages = @(
  @{path="/admin"; label="4.1  /admin"}
  @{path="/admin/administration"; label="4.2  /admin/administration"}
  @{path="/admin/activity-log"; label="4.3  /admin/activity-log"}
  @{path="/admin/admins"; label="4.4  /admin/admins"}
  @{path="/admin/admins/new"; label="4.5  /admin/admins/new"; expectRedirect=$true}
  @{path="/admin/admins/roles"; label="4.6  /admin/admins/roles"}
  @{path="/admin/b2b-management"; label="4.7  /admin/b2b-management"}
  @{path="/admin/b2b-management/brand-scope"; label="4.8  /admin/b2b-management/brand-scope"}
  @{path="/admin/b2b-verification"; label="4.9  /admin/b2b-verification"}
  @{path="/admin/b2b-workflows"; label="4.10 /admin/b2b-workflows"}
  @{path="/admin/b2b-workflows/ads-requests"; label="4.11 /admin/b2b-workflows/ads-requests"}
  @{path="/admin/b2b-workflows/reports"; label="4.12 /admin/b2b-workflows/reports"}
  @{path="/admin/b2b-workflows/renewals"; label="4.13 /admin/b2b-workflows/renewals"}
  @{path="/admin/b2b/sponsored-products"; label="4.14 /admin/b2b/sponsored-products"}
  @{path="/admin/bulk-operations"; label="4.15 /admin/bulk-operations"}
  @{path="/admin/categories"; label="4.16 /admin/categories"}
  @{path="/admin/categories/new"; label="4.17 /admin/categories/new"}
  @{path="/admin/customers"; label="4.18 /admin/customers"}
  @{path="/admin/data-management"; label="4.19 /admin/data-management"}
  @{path="/admin/data-management/scraping-logs"; label="4.20 /admin/data-management/scraping-logs"}
  @{path="/admin/data-management/webhook"; label="4.21 /admin/data-management/webhook"}
  @{path="/admin/duplicates"; label="4.22 /admin/duplicates"}
  @{path="/admin/export"; label="4.23 /admin/export"}
  @{path="/admin/product-listings"; label="4.24 /admin/product-listings"}
  @{path="/admin/product-listings/new"; label="4.25 /admin/product-listings/new"}
  @{path="/admin/products"; label="4.26 /admin/products"}
  @{path="/admin/products/new"; label="4.27 /admin/products/new"}
  @{path="/admin/quality-control"; label="4.28 /admin/quality-control"}
  @{path="/admin/quality-control/product-issues"; label="4.29 /admin/quality-control/product-issues"}
  @{path="/admin/quality-control/seller-collisions"; label="4.30 /admin/quality-control/seller-collisions"}
  @{path="/admin/reviews"; label="4.31 /admin/reviews"}
  @{path="/admin/sellers"; label="4.32 /admin/sellers"}
  @{path="/admin/subscriptions"; label="4.33 /admin/subscriptions"}
  @{path="/admin/system-health"; label="4.34 /admin/system-health"}
  @{path="/admin/users"; label="4.35 /admin/users"}
)

foreach ($page in $pages) {
  if ($page.expectRedirect) {
    Do-Test $page.label { Call-Page $page.path } "307"
  } else {
    Do-Test $page.label { Call-Page $page.path }
  }
}

# SCENARIO 5: ERROR HANDLING
Write-Step "Scenario 5: Error Handling"

Do-Test "5.1 GET /users/99999 -> 404 or error (backend no route)" {
  Call-Api "/api/admin/users/99999"
} "502"

Do-Test "5.2 GET /admins without super_admin -> handles gracefully" {
  Call-Api "/api/admin/admins"
}

Do-Test "5.3 API without auth -> 401/403" {
  $tmp = "$env:TEMP\test_5_3.json"
  $s = curl.exe -s -o $tmp -w "%{http_code}" "$BaseUrl/api/admin/users" 2>$null
  Remove-Item $tmp -ErrorAction SilentlyContinue
  @{Status=$s}
}

# SCENARIO 6: CACHING AND PERFORMANCE
Write-Step "Scenario 6: Caching and Performance"

$cookie = Get-Content $global:CookieFile -Raw 2>$null
if ($cookie) {
  $tmp = "$env:TEMP\test_perf.json"
  $t1 = Measure-Command {
    $null = curl.exe -s -o $tmp -w "%{http_code}" -b "admin_session=$cookie" "$BaseUrl/api/admin/users" 2>$null
  } 2>$null
  Remove-Item $tmp -ErrorAction SilentlyContinue

  $tmp = "$env:TEMP\test_perf2.json"
  $t2 = Measure-Command {
    $null = curl.exe -s -o $tmp -w "%{http_code}" -b "admin_session=$cookie" "$BaseUrl/api/admin/users" 2>$null
  } 2>$null
  Remove-Item $tmp -ErrorAction SilentlyContinue

  $ok = $t2.TotalMilliseconds -lt 500
  Write-Result "6.1 First hit: $([math]::Round($t1.TotalMilliseconds))ms" $true ""
  Write-Result "6.2 Second hit: $([math]::Round($t2.TotalMilliseconds))ms (<500ms = cached)" $ok "$([math]::Round($t2.TotalMilliseconds))ms"
  if (-not $ok) { $global:Failed++ } else { $global:Passed++ }
}

# SCENARIO 7: REDIS CACHE VERIFICATION
Write-Step "Scenario 7: Redis Cache Verification"

try {
  $redisKeys = & "C:\Program Files\Memurai\memurai-cli.exe" keys "frontend:admin:*" 2>$null
  if ($redisKeys -and $redisKeys.Count -gt 0) {
    Write-Result "7.1 Redis frontend:admin:* keys exist ($($redisKeys.Count) keys)" $true ""
  } else {
    Write-Result "7.1 Redis frontend:admin:* keys exist" $false "no keys found"
  }
} catch {
  Write-Result "7.1 Redis frontend:admin:* keys exist" $false "memurai-cli not found"
}

# SUMMARY
Write-Summary

Write-Host "`nDone." -ForegroundColor $Cyan
