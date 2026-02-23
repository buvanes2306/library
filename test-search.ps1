# Get all books and check which ones contain "4"
$json = Get-Content 'c:/Users/BHUVANES/Downloads/Library_Database.json' -Raw
$books = ConvertFrom-Json $json

$countWith4 = 0
$booksWith4 = @()

foreach ($book in $books) {
    $title = $book.Title.ToString()
    $author = $book.Author.ToString()
    $accNo = $book.'Acc no'.ToString()
    
    if ($title -match "4" -or $author -match "4" -or $accNo -match "4") {
        $countWith4++
        $booksWith4 += [PSCustomObject]@{
            AccNo = $accNo
            Title = $title
            Author = $author
        }
    }
}

Write-Host "Total books: $($books.Count)"
Write-Host "Books containing '4': $countWith4"

# Show sample
$booksWith4 | Select-Object -First 20 | ForEach-Object {
    Write-Host "  AccNo: $($_.AccNo), Title: $($_.Title), Author: $($_.Author)"
}
