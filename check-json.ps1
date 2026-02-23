$json = Get-Content 'c:/Users/BHUVANES/Downloads/Library_Database.json' -Raw
$obj = ConvertFrom-Json $json
Write-Host "Type:" $obj.GetType().Name
Write-Host "Count:" $obj.Count

# Check if it's an array
if ($obj.Count -gt 0) {
    Write-Host "First element type:" $obj[0].GetType().Name
    if ($obj[0].PSObject.Properties.Name -contains "books") {
        Write-Host "First element has books property"
        Write-Host "Books count:" $obj[0].books.Count
    }
}
