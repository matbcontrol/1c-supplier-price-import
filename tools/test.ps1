# Прогон автотестов. Тесты пишут в базу, поэтому до и после прогона база восстанавливается из эталона:
# побайтовой копии 1Cv8.1CD той же базы (путь внутри совпадает, и БСП не спрашивает «база перемещена?»).
# Пример: tools\test.ps1 -Base C:\1C\UNF_demo -Reference C:\1C\UNF_ref\1Cv8.1CD [-Build] [-Volume]
param(
    [string]$Base = $env:UNF_BASE,
    [string]$Reference = $env:UNF_REFERENCE,
    [switch]$Build, [switch]$Volume, [int]$TimeoutMin = 25,
    [string]$User = "Администратор",
    [string]$Platform = "C:\Program Files (x86)\1cv8t\8.5.1.1150\bin\1cv8t.exe"
)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot
if (Get-Process 1cv8t, 1cv8, 1cv8c, 1cv8ct -ErrorAction SilentlyContinue) { "Закройте 1С: учебная версия пускает одно подключение"; exit 1 }
if ($Build) {
    & "$PSScriptRoot\build_epf.ps1" -Src "$root\src\ЗагрузкаПрайсаПоставщика.xml" -Out "$root\build\ЗагрузкаПрайсаПоставщика.epf" -Base $Base -User $User -Platform $Platform | Select-Object -Last 1
    & "$PSScriptRoot\build_epf.ps1" -Src "$root\tests\src\ТестыЗагрузкиПрайса.xml" -Out "$root\tests\build\ТестыЗагрузкиПрайса.epf" -Base $Base -User $User -Platform $Platform | Select-Object -Last 1
}
Copy-Item $Reference "$Base\1Cv8.1CD" -Force
$report = "$root\tests\last_run.txt"
if (Test-Path $report) { Remove-Item $report }
$mode = if ($Volume) { "Объем" } else { "СЗаписью" }
$args = "ENTERPRISE /F `"$Base`" /N `"$User`" /DisableStartupDialogs /DisableStartupMessages /Execute `"$root\tests\build\ТестыЗагрузкиПрайса.epf`" /C `"Тесты;$root\build\ЗагрузкаПрайсаПоставщика.epf;$root;$report;$mode`""
$p = Start-Process $Platform -ArgumentList $args -PassThru
if (-not $p.WaitForExit($TimeoutMin * 60000)) { Stop-Process -Id $p.Id -Force; Start-Sleep 2; "TIMEOUT" }
Copy-Item $Reference "$Base\1Cv8.1CD" -Force
"база восстановлена из эталона"
if (Test-Path $report) { Get-Content $report -Encoding UTF8 } else { "НЕТ ОТЧЁТА, exit=$($p.ExitCode)" }
