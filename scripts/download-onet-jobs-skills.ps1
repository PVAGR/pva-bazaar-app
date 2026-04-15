param(
  [string]$OutputPath = "backend/data/seed/onet-jobs-professions-skills.json",
  [string]$SourceUrl = "https://www.onetcenter.org/dl_files/database/db_30_2_text.zip"
)

$ErrorActionPreference = "Stop"

function Ensure-Directory([string]$path) {
  $dir = Split-Path -Parent $path
  if (-not [string]::IsNullOrWhiteSpace($dir) -and -not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

function First-ExistingFile([string]$root, [string[]]$candidates) {
  foreach ($candidate in $candidates) {
    $direct = Join-Path $root $candidate
    if (Test-Path $direct) { return $direct }
    $match = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -ieq $candidate } |
      Select-Object -First 1
    if ($match) { return $match.FullName }
  }
  throw "Missing expected file. Tried: $($candidates -join ', ')"
}

$tempRoot = Join-Path $env:TEMP ("onet-seed-" + [guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tempRoot "onet.zip"
$extractPath = Join-Path $tempRoot "extract"

New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
New-Item -ItemType Directory -Path $extractPath -Force | Out-Null

Write-Host "Downloading O*NET database from $SourceUrl"
Invoke-WebRequest -Uri $SourceUrl -OutFile $zipPath

Write-Host "Extracting O*NET archive"
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

$occupationFile = First-ExistingFile $extractPath @(
  "Occupation Data.txt",
  "Occupation Data.TXT"
)
$skillsFile = First-ExistingFile $extractPath @(
  "Skills.txt",
  "Skills.TXT"
)
$contentModelFile = First-ExistingFile $extractPath @(
  "Content Model Reference.txt",
  "Content Model Reference.TXT"
)
$jobZonesFile = First-ExistingFile $extractPath @(
  "Job Zones.txt",
  "Job Zones.TXT"
)
$alternateTitlesFile = First-ExistingFile $extractPath @(
  "Alternate Titles.txt",
  "Alternate Titles.TXT"
)

Write-Host "Parsing O*NET files"
$occupationsRaw = Import-Csv -Path $occupationFile -Delimiter "`t"
$skillsRaw = Import-Csv -Path $skillsFile -Delimiter "`t"
$contentRaw = Import-Csv -Path $contentModelFile -Delimiter "`t"
$jobZonesRaw = Import-Csv -Path $jobZonesFile -Delimiter "`t"
$alternateTitlesRaw = Import-Csv -Path $alternateTitlesFile -Delimiter "`t"

$contentById = @{}
foreach ($row in $contentRaw) {
  $id = [string]$row.'Element ID'
  if ([string]::IsNullOrWhiteSpace($id)) { continue }
  $contentById[$id] = [pscustomobject]@{
    id = $id
    name = [string]$row.'Element Name'
    description = [string]$row.Description
  }
}

$jobZoneByCode = @{}
foreach ($row in $jobZonesRaw) {
  $code = [string]$row.'O*NET-SOC Code'
  if ([string]::IsNullOrWhiteSpace($code)) { continue }
  $jobZoneByCode[$code] = [string]$row.'Job Zone'
}

$altTitlesByCode = @{}
foreach ($row in $alternateTitlesRaw) {
  $code = [string]$row.'O*NET-SOC Code'
  $alt = [string]$row.'Alternate Title'
  if ([string]::IsNullOrWhiteSpace($code) -or [string]::IsNullOrWhiteSpace($alt)) { continue }
  if (-not $altTitlesByCode.ContainsKey($code)) {
    $altTitlesByCode[$code] = New-Object System.Collections.Generic.List[string]
  }
  if (-not $altTitlesByCode[$code].Contains($alt)) {
    $altTitlesByCode[$code].Add($alt)
  }
}

$skillsByOccupation = @{}
foreach ($row in $skillsRaw) {
  $code = [string]$row.'O*NET-SOC Code'
  $elementId = [string]$row.'Element ID'
  $scaleId = [string]$row.'Scale ID'
  $valueRaw = [string]$row.'Data Value'
  if ([string]::IsNullOrWhiteSpace($code) -or [string]::IsNullOrWhiteSpace($elementId)) { continue }
  if (-not $contentById.ContainsKey($elementId)) { continue }

  $value = 0.0
  if (-not [double]::TryParse($valueRaw, [ref]$value)) { continue }

  if (-not $skillsByOccupation.ContainsKey($code)) {
    $skillsByOccupation[$code] = @{}
  }
  if (-not $skillsByOccupation[$code].ContainsKey($elementId)) {
    $skillsByOccupation[$code][$elementId] = [ordered]@{
      id = $elementId
      name = $contentById[$elementId].name
      description = $contentById[$elementId].description
      importance = $null
      level = $null
    }
  }

  if ($scaleId -eq "IM") {
    $skillsByOccupation[$code][$elementId].importance = [math]::Round($value, 2)
  } elseif ($scaleId -eq "LV") {
    $skillsByOccupation[$code][$elementId].level = [math]::Round($value, 2)
  }
}

$occupations = New-Object System.Collections.Generic.List[object]
foreach ($row in $occupationsRaw) {
  $code = [string]$row.'O*NET-SOC Code'
  if ([string]::IsNullOrWhiteSpace($code)) { continue }

  $skills = @()
  if ($skillsByOccupation.ContainsKey($code)) {
    $skills = $skillsByOccupation[$code].Values |
      Sort-Object @{ Expression = { if ($null -eq $_.importance) { -1 } else { $_.importance } }; Descending = $true }, `
                  @{ Expression = { if ($null -eq $_.level) { -1 } else { $_.level } }; Descending = $true } |
      Select-Object -First 15
  }

  $sampleTitles = @()
  if ($altTitlesByCode.ContainsKey($code)) {
    $sampleTitles = @($altTitlesByCode[$code] | Select-Object -First 8)
  }

  $occupations.Add([ordered]@{
    onetSocCode = $code
    title = [string]$row.Title
    description = [string]$row.Description
    jobZone = if ($jobZoneByCode.ContainsKey($code)) { $jobZoneByCode[$code] } else { $null }
    sampleTitles = $sampleTitles
    topSkills = $skills
  })
}

$uniqueSkills = @{}
foreach ($occ in $occupations) {
  foreach ($skill in $occ.topSkills) {
    if (-not $uniqueSkills.ContainsKey($skill.id)) {
      $uniqueSkills[$skill.id] = [ordered]@{
        id = $skill.id
        name = $skill.name
        description = $skill.description
      }
    }
  }
}

$payload = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("o")
  source = [ordered]@{
    name = "O*NET Database"
    version = "30.2"
    sourceUrl = $SourceUrl
    license = "CC BY 4.0"
    attribution = "Contains information from the O*NET 30.2 Database by USDOL/ETA, used under CC BY 4.0."
  }
  summary = [ordered]@{
    occupations = $occupations.Count
    skillConcepts = $uniqueSkills.Keys.Count
  }
  professions = $occupations
  skillsCatalog = @($uniqueSkills.Values | Sort-Object name)
}

Ensure-Directory $OutputPath
$payload | ConvertTo-Json -Depth 8 | Out-File -FilePath $OutputPath -Encoding utf8

Write-Host "Wrote starter dataset to $OutputPath"
Write-Host "Occupations: $($occupations.Count) | Skills: $($uniqueSkills.Keys.Count)"

try {
  Remove-Item -Path $tempRoot -Recurse -Force
} catch {
  Write-Warning "Temporary files kept at $tempRoot"
}
