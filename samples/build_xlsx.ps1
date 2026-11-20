param([string]$Json, [string]$OutDir)
# Собирает прайс-листы поставщика в Excel по описанию из make_pricelists.js. Нужен установленный Excel.
$data = Get-Content $Json -Encoding UTF8 -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force $OutDir | Out-Null
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false; $xl.DisplayAlerts = $false
try {
foreach ($list in $data.lists) {
    $wb = $xl.Workbooks.Add(); $ws = $wb.Worksheets.Item(1); $ws.Name = "Прайс"
    $ws.Cells.Font.Name = "Arial"; $ws.Cells.Font.Size = 9
    $ws.Range("A1:I1").Merge(); $ws.Cells.Item(1,1).Value2 = $data.supplier.name; $ws.Cells.Item(1,1).Font.Size = 16; $ws.Cells.Item(1,1).Font.Bold = $true
    $ws.Range("A2:I2").Merge(); $ws.Cells.Item(2,1).Value2 = "Оптовая торговля хозяйственными товарами"; $ws.Cells.Item(2,1).Font.Italic = $true; $ws.Cells.Item(2,1).Font.Color = 0x666666
    $ws.Range("A3:I3").Merge(); $ws.Cells.Item(3,1).Value2 = "Прайс-лист от " + $list.date; $ws.Cells.Item(3,1).Font.Size = 12; $ws.Cells.Item(3,1).Font.Bold = $true
    $ws.Range("A4:I4").Merge(); $ws.Cells.Item(4,1).Value2 = "Цены в рублях с НДС. Минимальный заказ 5 000 руб. Остатки на складе ориентировочные."
    $headers = @("№","Код","Артикул","Штрихкод","Наименование","Ед.","Цена опт, руб.","РРЦ, руб.","Остаток")
    for ($c = 0; $c -lt $headers.Count; $c++) { $ws.Cells.Item(6, $c + 1).Value2 = $headers[$c] }
    $h = $ws.Range("A6:I6"); $h.Font.Bold = $true; $h.Interior.Color = 0xD9D9D9; $h.WrapText = $true; $h.VerticalAlignment = -4108; $h.HorizontalAlignment = -4108
    $row = 7; $n = 0; $cat = ""
    $ws.Range("D:D").NumberFormat = "@"; $ws.Range("B:C").NumberFormat = "@"
    foreach ($r in $list.rows) {
        if ($r.cat -ne $cat) {
            $cat = $r.cat
            $g = $ws.Range("A$($row):I$($row)"); $g.Merge(); $ws.Cells.Item($row, 1).Value2 = $cat
            $g.Font.Bold = $true; $g.Interior.Color = 0xCCF2FF
            $row++
        }
        $n++
        $ws.Cells.Item($row, 1).Value2 = [double]$n
        $ws.Cells.Item($row, 2).Value2 = $r.code
        $ws.Cells.Item($row, 3).Value2 = $r.article
        $ws.Cells.Item($row, 4).Value2 = $r.barcode
        $ws.Cells.Item($row, 5).Value2 = $r.name
        $ws.Cells.Item($row, 6).Value2 = $r.unit
        if ($r.price -is [string]) { $ws.Cells.Item($row, 7).Value2 = $r.price; $ws.Cells.Item($row, 7).HorizontalAlignment = -4152 }
        else { $ws.Cells.Item($row, 7).Value2 = [double]$r.price }
        $ws.Cells.Item($row, 8).Value2 = [double]$r.rrp
        $ws.Cells.Item($row, 9).Value2 = [double]$r.stock
        $row++
    }
    $last = $row - 1
    $ws.Range("G7:G$last").NumberFormat = "# ##0,00"
    $ws.Range("H7:H$last").NumberFormat = "# ##0"
    $ws.Range("A6:I$last").Borders.LineStyle = 1; $ws.Range("A6:I$last").Borders.Color = 0xBFBFBF
    $row++
    $ws.Range("A$($row):I$($row)").Merge(); $ws.Cells.Item($row, 1).Value2 = "Цены действительны 14 дней. Позиции с ценой «по запросу» уточняйте у менеджера."; $ws.Cells.Item($row, 1).Font.Italic = $true
    $widths = @(5, 10, 10, 15, 58, 6, 12, 10, 9)
    for ($c = 0; $c -lt $widths.Count; $c++) { $ws.Columns.Item($c + 1).ColumnWidth = $widths[$c] }
    $ws.Activate(); $xl.ActiveWindow.SplitRow = 6; $xl.ActiveWindow.FreezePanes = $true
    $file = Join-Path $OutDir $list.file
    if (Test-Path $file) { Remove-Item $file }
    $wb.SaveAs($file, 51); $wb.Close($false)
    "xlsx: $file ($n позиций)"

    if ($list.csv) {
        # Плоская выгрузка, как из 1С поставщика: группа отдельной колонкой, кодировка Windows-1251.
        $lines = New-Object System.Collections.Generic.List[string]
        $lines.Add("Код;Артикул;Штрихкод;Наименование;Группа товаров;Ед;Цена;РРЦ")
        foreach ($r in $list.rows) {
            $q = { param($s) if ($s -match '[;"]') { '"' + ($s -replace '"', '""') + '"' } else { $s } }
            $price = if ($r.price -is [string]) { $r.price } else { ([double]$r.price).ToString("0.00", [Globalization.CultureInfo]::GetCultureInfo("ru-RU")) }
            $lines.Add((& $q $r.code) + ";" + (& $q $r.article) + ";" + $r.barcode + ";" + (& $q $r.name) + ";" + (& $q $r.cat) + ";" + $r.unit + ";" + $price + ";" + ([double]$r.rrp).ToString("0.##", [Globalization.CultureInfo]::GetCultureInfo("ru-RU")))
        }
        $csv = Join-Path $OutDir $list.csv
        [IO.File]::WriteAllLines($csv, $lines, [Text.Encoding]::GetEncoding(1251))
        "csv: $csv"
    }
}
} finally {
    $xl.Quit(); [Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
