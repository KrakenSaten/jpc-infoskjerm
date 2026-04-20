param(
  [int]$Port = 8181,
  [string]$StartPage = "index.html",
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = "http://localhost:$Port/"
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)

$mimeTypes = @{
  ".css"  = "text/css; charset=utf-8"
  ".csv"  = "text/csv; charset=utf-8"
  ".html" = "text/html; charset=utf-8"
  ".ico"  = "image/x-icon"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".svg"  = "image/svg+xml"
  ".txt"  = "text/plain; charset=utf-8"
}

function Send-Response {
  param(
    [Parameter(Mandatory = $true)]
    [System.IO.Stream]$Stream,
    [int]$StatusCode,
    [string]$ReasonPhrase,
    [byte[]]$BodyBytes,
    [string]$ContentType = "text/plain; charset=utf-8"
  )

  $headerText = @(
    "HTTP/1.1 $StatusCode $ReasonPhrase"
    "Content-Type: $ContentType"
    "Content-Length: $($BodyBytes.Length)"
    "Connection: close"
    ""
    ""
  ) -join "`r`n"

  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerText)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($BodyBytes.Length -gt 0) {
    $Stream.Write($BodyBytes, 0, $BodyBytes.Length)
  }
  $Stream.Flush()
}

function Send-TextResponse {
  param(
    [Parameter(Mandatory = $true)]
    [System.IO.Stream]$Stream,
    [int]$StatusCode,
    [string]$ReasonPhrase,
    [string]$Body
  )

  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
  Send-Response -Stream $Stream -StatusCode $StatusCode -ReasonPhrase $ReasonPhrase -BodyBytes $bodyBytes
}

function Get-RequestLine {
  param(
    [Parameter(Mandatory = $true)]
    [System.IO.Stream]$Stream
  )

  $buffer = New-Object byte[] 4096
  $builder = New-Object System.Text.StringBuilder

  while ($Stream.CanRead) {
    $bytesRead = $Stream.Read($buffer, 0, $buffer.Length)

    if ($bytesRead -le 0) {
      break
    }

    [void]$builder.Append([System.Text.Encoding]::ASCII.GetString($buffer, 0, $bytesRead))

    if ($builder.ToString().Contains("`r`n`r`n")) {
      break
    }
  }

  return ($builder.ToString() -split "`r`n")[0]
}

try {
  $listener.Start()
} catch {
  Write-Error "Kunne ikke starte lokal server paa $prefix. Sjekk om porten er i bruk."
  exit 1
}

if (-not $NoBrowser) {
  Start-Process "$prefix$StartPage" | Out-Null
}

Write-Host "Serverer $root paa $prefix"
Write-Host "Trykk Ctrl+C for aa stoppe."

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()

    try {
      $stream = $client.GetStream()
      $requestLine = Get-RequestLine -Stream $stream

      if (-not $requestLine) {
        Send-TextResponse -Stream $stream -StatusCode 400 -ReasonPhrase "Bad Request" -Body "Bad request"
        continue
      }

      $requestParts = $requestLine.Split(" ")
      $method = if ($requestParts.Length -ge 1) { $requestParts[0] } else { "" }
      $rawPath = if ($requestParts.Length -ge 2) { $requestParts[1] } else { "/" }

      if ($method -ne "GET") {
        Send-TextResponse -Stream $stream -StatusCode 405 -ReasonPhrase "Method Not Allowed" -Body "Method not allowed"
        continue
      }

      $relativePath = [System.Uri]::UnescapeDataString(($rawPath -split "\?")[0].TrimStart("/"))

      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = "index.html"
      }

      if ($relativePath.Contains("..")) {
        Send-TextResponse -Stream $stream -StatusCode 403 -ReasonPhrase "Forbidden" -Body "Forbidden"
        continue
      }

      $fullPath = Join-Path $root $relativePath

      if ((Test-Path $fullPath) -and (Get-Item $fullPath).PSIsContainer) {
        $fullPath = Join-Path $fullPath "index.html"
      }

      if (-not (Test-Path $fullPath -PathType Leaf)) {
        Send-TextResponse -Stream $stream -StatusCode 404 -ReasonPhrase "Not Found" -Body "Not found"
        continue
      }

      $extension = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
      $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($fullPath)
      Send-Response -Stream $stream -StatusCode 200 -ReasonPhrase "OK" -BodyBytes $bytes -ContentType $contentType
    } finally {
      if ($stream) {
        $stream.Dispose()
      }
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
