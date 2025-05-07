from firebase_functions import firestore_fn
from firebase_admin import initialize_app, storage
import google.cloud.firestore
import tempfile
import os
from docx import Document
import re
import sys
from pathlib import Path

# Add lib directory to Python path
lib_path = str(Path(__file__).parent.parent / 'lib')
if lib_path not in sys.path:
    sys.path.insert(0, lib_path)

initialize_app()

# Triggered when a new template document is created
@firestore_fn.on_document_created(document="templates/{templateId}")
def processtemplate(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    """Extracts placeholders from uploaded template and updates document."""
    
    # Get the newly created document
    snapshot = event.data
    if not snapshot.exists:
        print("Document no longer exists")
        return

    template_data = snapshot.to_dict()
    template_id = event.params["templateId"]

    try:
        # Update status to processing
        snapshot.reference.update({"status": "processing"})

        # 1. Download the template file from Storage
        file_path = template_data["storagePath"]
        bucket_name = template_data["downloadURL"].split('/')[5]
        bucket = storage.bucket(bucket_name)
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as temp_file:
            temp_path = temp_file.name
            blob = bucket.blob(file_path)
            blob.download_to_filename(temp_path)
            print(f"Downloaded template to {temp_path}")

            # 2. Extract placeholders from the DOCX file
            placeholders = extract_placeholders(temp_path)
            print(f"Found placeholders: {placeholders}")

            placeholder_config = {
                p: {
                    "type": "long_text",
                    "required": True,
                    "alias": p.replace('_', ' ').title()
                } for p in placeholders
            }

            # 3. Update the template document with the placeholders
            snapshot.reference.update({
                "placeholders": placeholder_config,
                "status": "processed"
            })
            print("Template processed successfully")

    except Exception as error:
        print(f"Error processing template: {error}")
        snapshot.reference.update({
            "status": "failed",
            "error": str(error)
        })
        raise

    finally:
        # Clean up temporary file
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)

def extract_placeholders(docx_path: str) -> list:
    """Extracts all placeholder patterns from a DOCX file."""
    doc = Document(docx_path)
    placeholders = set()

    # Check paragraphs
    for paragraph in doc.paragraphs:
        matches = re.findall(r'\{\{([^}]+)\}\}', paragraph.text)
        placeholders.update(matches)

    # Check tables
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                matches = re.findall(r'\{\{([^}]+)\}\}', cell.text)
                placeholders.update(matches)

    return list(placeholders)
