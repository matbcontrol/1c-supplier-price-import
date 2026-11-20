# Собирает .epf из XML-исходников через конфигуратор (нужна любая база с той же конфигурацией).
# Пример: tools\build_epf.ps1 -Src src\ЗагрузкаПрайсаПоставщика.xml -Out build\ЗагрузкаПрайсаПоставщика.epf -Base C:\1C\UNF_demo
param(
    [string]$Src, [string]$Out,
    [string]$Base = $env:UNF_BASE,
    [string]$User = "Администратор",
    [string]$Platform = "C:\Program Files (x86)\1cv8t\8.5.1.1150\bin\1cv8t.exe"
)
$log = [System.IO.Path]::ChangeExtension($Out, ".build.log")
if (Test-Path $Out) { Remove-Item $Out }
$args = "DESIGNER /F `"$Base`" /N `"$User`" /DisableStartupDialogs /DisableStartupMessages /LoadExternalDataProcessorOrReportFromFiles `"$Src`" `"$Out`" /Out `"$log`""
$p = Start-Process $Platform -ArgumentList $args -Wait -PassThru
Get-Content $log -Encoding Default
Remove-Item $log -ErrorAction SilentlyContinue
if (Test-Path $Out) { "OK " + (Get-Item $Out).Length + " bytes" } else { "NO EPF, exit=$($p.ExitCode)"; exit 1 }
