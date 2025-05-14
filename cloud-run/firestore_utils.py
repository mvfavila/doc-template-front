import os
from google.cloud import firestore, storage
from google.auth import default
from tempfile import NamedTemporaryFile
import logging
from datetime import timedelta

# Initialize Firebase clients
credentials, project_id = default()
db = firestore.Client(project=project_id, credentials=credentials)
storage_client = storage.Client(credentials=credentials)

logger = logging.getLogger(__name__)

def fetch_form_data(form_id: str) -> dict:
    try:
        doc_ref = db.collection("forms").document(form_id)
        doc = doc_ref.get()
        if not doc.exists:
            print(f"Form {form_id} not found")
            return None
        return doc.to_dict()
    except Exception as e:
        print(f"Error fetching form data: {str(e)}", exc_info=True)
        raise

def download_template(form_data: dict) -> str:
    try:
        template_id = form_data.get("templateId")
        if not template_id:
            raise ValueError("Missing templateId in form data")

        # Get template metadata from Firestore
        template_ref = db.collection("templates").document(template_id)
        template_doc = template_ref.get()
        if not template_doc.exists:
            raise ValueError(f"Template {template_id} not found")

        template_data = template_doc.to_dict()
        bucket_name = template_data["downloadURL"].split('/')[5]
        blob_path = template_data["storagePath"]

        try:
            # Download to a temporary file
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            
            with NamedTemporaryFile(suffix=".docx", delete=False) as temp_file:
                blob.download_to_filename(temp_file.name)
                logger.info(f"Downloaded template to {temp_file.name}")
                return temp_file.name
            
        except Exception as storage_error:
            print(f"Storage access error: {str(storage_error)}")
            raise PermissionError(f"Access denied to template storage. Please check service account permissions.")

    except Exception as e:
        print(f"Error downloading template: {str(e)}")
        raise

def upload_result(form_id: str, output_pdf_path: str) -> str:
    try:
        print("Uploading PDF...")

        bucket_name = os.getenv("OUTPUT_BUCKET", "")
        if not bucket_name:
            raise ValueError("OUTPUT_BUCKET environment variable not set")

        bucket = storage_client.bucket(bucket_name)
        
        # Generate a unique filename
        blob_name = f"generated_documents/{form_id}/{os.path.basename(output_pdf_path)}"
        blob = bucket.blob(blob_name)

        # Ensure content type is set
        blob.upload_from_filename(
            output_pdf_path,
            content_type="application/pdf"
        )

        # Set download-friendly headers
        blob.content_disposition = f'attachment; filename="{os.path.basename(output_pdf_path)}"'
        blob.cache_control = "public, max-age=3600"
        blob.patch()

        blob.upload_from_filename(output_pdf_path)
        
        # Make the file publicly accessible (optional)
        return blob_name
    except Exception as e:
        print(f"Error uploading result: {str(e)}")
        raise

def generate_signed_url(blob_path: str, expiration_hours: int = 1) -> str:
    """Generate a temporary access URL"""
    bucket = storage_client.bucket("doc-template-front-dev.firebasestorage.app")
    blob = bucket.blob(blob_path)
    
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=expiration_hours),
        method="GET",
        allowed_origins=[
            "http://localhost:5173",
            "https://doc-template-front-dev.web.app"
        ]
    )
    return url