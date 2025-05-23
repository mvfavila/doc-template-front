import os
import json
from google.cloud import firestore, storage
from google.auth import default
from google.oauth2 import service_account
from tempfile import NamedTemporaryFile
import logging
from datetime import timedelta
from pathlib import Path

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
        print(f"Error fetching form data: {str(e)}")
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
                print(f"Downloaded template to {temp_file.name}")
                return temp_file.name
            
        except Exception as storage_error:
            print(f"Storage access error: {str(storage_error)}")
            raise PermissionError(f"Access denied to template storage. Please check service account permissions.")

    except Exception as e:
        print(f"Error downloading template: {str(e)}")
        raise

def upload_result(form_id: str, file_path: str, file_type: str, office_id: str) -> tuple[str, str]:
    try:
        print(f"Uploading {file_type.upper()} file...")

        bucket_name = os.getenv("OUTPUT_BUCKET", "")
        if not bucket_name:
            raise ValueError("OUTPUT_BUCKET environment variable not set")

        bucket = storage_client.bucket(bucket_name)
        
        # Generate a unique filename with officeId in path
        file_name = Path(file_path).name
        blob_name = f"generated_documents/{office_id}/{form_id}/{file_name}"
        blob = bucket.blob(blob_name)

        # Set content type based on file type
        content_type = {
            "pdf": "application/pdf",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }.get(file_type.lower(), "application/octet-stream")

        # Upload file with appropriate metadata
        blob.upload_from_filename(
            file_path,
            content_type=content_type
        )

        # Set download-friendly headers
        blob.content_disposition = f'attachment; filename="{file_name}"'
        blob.cache_control = "public, max-age=3600"
        blob.patch()

        print(f"Successfully uploaded {file_type.upper()} file: {blob_name}")
        return blob_name, generate_signed_url(blob_name)
        
    except Exception as e:
        print(f"Error uploading result: {str(e)}")
        raise

def get_signing_credentials():
    """Get credentials with private key for signing URLs"""
    try:
        # Try to load from explicit JSON content
        key_json = os.getenv('URL_SIGNER_SA_KEY')
        if key_json:
            return service_account.Credentials.from_service_account_info(json.loads(key_json))
        
        print("No private key available for signing URLs")
        return None
        
    except Exception as e:
        print(f"Error loading signing credentials: {str(e)}")
        return None

def generate_signed_url(blob_path: str, expiration_hours: int = 1) -> str:
    """Generate a temporary access URL or public URL if signing not available"""
    try:
        bucket_name = os.getenv("OUTPUT_BUCKET", "")
        if not bucket_name:
            raise ValueError("OUTPUT_BUCKET environment variable not set")
        
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_path)
        
        # Check if blob exists and is public
        if not blob.exists():
            raise ValueError(f"Blob {blob_path} does not exist")
            
        if blob.public_url:
            print(f"Using public URL for {blob_path}")
            return blob.public_url
            
        # Try to generate signed URL if we have credentials
        signing_credentials = get_signing_credentials()
        if signing_credentials:
            print('There are credentials. Generating signed URL')
            return blob.generate_signed_url(
                version="v4",
                expiration=timedelta(hours=expiration_hours),
                method="GET",
                credentials=signing_credentials
            )
        
        print('There are no credentials. Generating public URL')
        
        # Fallback to public URL if bucket is public
        if bucket.iam_configuration.uniform_bucket_level_access_enabled:
            raise RuntimeError("Bucket has uniform access enabled, cannot generate public URL")
            
        # Make the blob public temporarily
        blob.make_public()
        print(f"Using public URL as fallback for {blob_path}")
        return blob.public_url
        
    except Exception as e:
        print(f"Error generating URL: {str(e)}", exc_info=True)
        raise

def update_document_urls(form_id: str, pdf_path: str, docx_path: str) -> None:
    try:
        doc_ref = db.collection("forms").document(form_id)
        
        pdf_url = generate_signed_url(pdf_path)
        docx_url = generate_signed_url(docx_path)
        
        doc_ref.update({
            "generatedPdfUrl": pdf_url,
            "generatedPdfPath": pdf_path,
            "generatedDocxUrl": docx_url,
            "generatedDocxPath": docx_path,
            "status": "completed",
            "updatedAt": firestore.SERVER_TIMESTAMP
        })
        
        logger.info(f"Updated document {form_id} with generated file URLs and paths")
    except Exception as e:
        logger.error(f"Error updating document URLs: {str(e)}", exc_info=True)
        raise