import os
import json
import re
import uuid

# --------------------------------------------------
# File Paths
# --------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

INPUT_FILE = os.path.join(BASE_DIR, "Library_Database 1.json")
OUTPUT_FILE = os.path.join(BASE_DIR, "books_cleaned.json")


# --------------------------------------------------
# Department Normalization
# --------------------------------------------------
def normalize_department(dept):
    if not dept:
        return "GENERAL"

    dept = dept.upper().strip()

    if "COMPUTER" in dept or dept == "CSE":
        return "COMPUTER SCIENCE"
    elif "INFORMATION" in dept or "IT" in dept:
        return "INFORMATION TECHNOLOGY"
    elif "ELECTRONICS" in dept or "ECE" in dept:
        return "ELECTRONICS"
    elif "ELECTRICAL" in dept or "EEE" in dept:
        return "ELECTRICAL"
    elif "MECHANICAL" in dept:
        return "MECHANICAL"
    elif "CIVIL" in dept:
        return "CIVIL"
    elif "MATH" in dept:
        return "MATHS"
    elif "REFERENCE" in dept:
        return "REFERENCE"
    else:
        return "GENERAL"


# --------------------------------------------------
# Extract Rack & Shelf
# --------------------------------------------------
def extract_location(location_string):
    if not location_string:
        return {"rack": None, "shelf": None}

    location_string = location_string.replace("\t", " ").replace("\n", " ")

    rack_match = re.search(r"rack\s*(\d+)", location_string, re.IGNORECASE)
    shelf_match = re.search(r"shelf\s*(\d+)", location_string, re.IGNORECASE)

    rack = int(rack_match.group(1)) if rack_match else None
    shelf = int(shelf_match.group(1)) if shelf_match else None

    return {"rack": rack, "shelf": shelf}


# --------------------------------------------------
# Parse Authors
# --------------------------------------------------
def parse_authors(author_string):
    if not author_string:
        return []

    authors = [a.strip() for a in author_string.split(",") if a.strip()]
    return authors


# --------------------------------------------------
# Normalize Status
# --------------------------------------------------
def normalize_status(status):
    if not status:
        return "Available"

    status = status.strip().lower()

    if status == "issued":
        return "Issued"
    else:
        return "Available"


# --------------------------------------------------
# Clean One Record
# --------------------------------------------------
def clean_record(record):
    cleaned = {}

    # Book ID (generate if missing)
    cleaned["bookId"] = (
        record.get("BOOK _Id")
        or record.get("BOOK_Id")
        or record.get("Book_ID")
        or record.get("Book Id")
        or str(uuid.uuid4())
    )

    cleaned["accNo"] = record.get("Acc no")

    cleaned["title"] = record.get("Title", "").strip()

    cleaned["authors"] = parse_authors(record.get("Author"))

    cleaned["publisher"] = record.get("Publisher", "").strip()

    year = record.get("Published Year")
    cleaned["publishedYear"] = year if year and year != 0 else None

    cleaned["department"] = normalize_department(record.get("Department"))

    cleaned["status"] = normalize_status(record.get("Status"))

    cleaned["location"] = extract_location(record.get("Location Rack, Shelf"))

    call_number = record.get("Call number")
    cleaned["callNumber"] = str(call_number) if call_number else None

    edition = record.get("Edition")
    cleaned["edition"] = edition if edition else None

    copies = record.get("No. of. Copies")
    cleaned["copies"] = copies if copies else 1

    return cleaned


# --------------------------------------------------
# Main Function
# --------------------------------------------------
def main():
    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)

        # If JSON is a single object → convert to list
        if isinstance(data, dict):
            data = [data]

        cleaned_data = [clean_record(record) for record in data]

        with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
            json.dump(cleaned_data, file, indent=2)

        print("✅ Cleaning completed successfully!")
        print(f"📁 Clean file saved as: {OUTPUT_FILE}")

    except FileNotFoundError:
        print("❌ Input file not found. Check the file name and location.")
    except json.JSONDecodeError:
        print("❌ Invalid JSON format. Please fix your JSON file.")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


# --------------------------------------------------
# Run Script
# --------------------------------------------------
if __name__ == "__main__":
    main()