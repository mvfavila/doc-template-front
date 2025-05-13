from firebase_functions import firestore_fn
from firebase_admin import initialize_app, storage
from google.auth.transport.requests import Request
from google.oauth2 import id_token
import google.cloud.firestore
import tempfile
import os
from docx import Document
import re
import sys
from pathlib import Path
import requests


# Add lib directory to Python path
lib_path = str(Path(__file__).parent.parent / 'lib')
if lib_path not in sys.path:
    sys.path.insert(0, lib_path)

initialize_app()

# Triggered when a new template document is created
@firestore_fn.on_document_created(document="templates/{templateId}")
def processtemplate(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    """Extracts placeholders from uploaded template and updates document."""
    
    snapshot = event.data
    if not snapshot.exists:
        print("Document no longer exists")
        return

    template_data = snapshot.to_dict()
    template_id = event.params["templateId"]

    try:
        snapshot.reference.update({"status": "processing"})

        file_path = template_data["storagePath"]
        bucket_name = template_data["downloadURL"].split('/')[5]
        bucket = storage.bucket(bucket_name)
        
        with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as temp_file:
            temp_path = temp_file.name
            blob = bucket.blob(file_path)
            blob.download_to_filename(temp_path)
            print(f"Downloaded template to {temp_path}")

            placeholders = extract_placeholders(temp_path)
            print(f"Found placeholders: {placeholders}")

            placeholder_config = {
                p: {
                    "type": "long_text",
                    "required": True,
                    "alias": p.replace('_', ' ').title()
                } for p in placeholders
            }

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

# This function is triggered when a new document is created in the document_jobs collection
# It calls the Cloud Run service to process the document
@firestore_fn.on_document_created(document="document_jobs/{docId}")
def process_document_job(event: firestore_fn.Event[firestore_fn.DocumentSnapshot]) -> None:
    snapshot = event.data
    if not snapshot.exists:
        print("Document no longer exists")
        return

    try:
        # Get the document data
        doc_data = snapshot.to_dict()
        form_id = doc_data.get("formId")
        
        if not form_id:
            print("No formId found in document")
            return

        cloud_run_url = os.environ.get("DOCGEN_URL")
        if not cloud_run_url:
            raise ValueError("DOCGEN_URL not set in Firebase config")
        
        headers = {
            "Authorization": f"Bearer {get_cloud_run_token(cloud_run_url)}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{cloud_run_url}/",
            headers=headers,
            json={"formId": form_id},
            timeout=30
        )

        if response.status_code != 200:
            print(f"Cloud Run request failed: {response.status_code} - {response.text}")
        else:
            print(f"Successfully processed form {form_id}")

    except Exception as error:
        print(f"Error processing document job: {error}")
        raise

def get_cloud_run_token(target_audience):
    try:
        audience = target_audience
        token = id_token.fetch_id_token(Request(), audience)
        return token
    except Exception as e:
        print(f"Error getting ID token: {str(e)}")
        raise
