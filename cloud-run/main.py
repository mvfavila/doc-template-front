from flask import Flask, request, jsonify
import firestore_utils
import libreoffice_utils
import logging
import os
from datetime import datetime
from google.events.cloud.firestore import DocumentEventData

app = Flask(__name__)
logger = logging.getLogger(__name__)

@app.route("/", methods=["POST"])
def handle_firestore_event():
    print("Received event:", request.json)

    if request.method == 'OPTIONS':
        response = jsonify({'status': 'preflight'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Authorization, Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    doc_data = request.get_json()
    if not doc_data:
        response = jsonify({"error": "No payload received"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        return response, 400

    try:
        job_id = doc_data.get("jobId")
        if not job_id:
            response = jsonify({"error": "jobId is required"})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            return response, 400
        
        firestore_utils.update_document_job(job_id, "pending")
        
        form_id = doc_data.get("formId")
        if not form_id:
            raise ValueError("formId is required in payload")

        logger.info(f"Started processing document job {job_id} for form: {form_id}")

        # Fetch form data and template
        form_data = firestore_utils.fetch_form_data(form_id)
        if not form_data:
            raise ValueError(f"Form {form_id} not found")
            
        template_path = firestore_utils.download_template(form_data)
        
        # Process document
        filled_docx_path, output_pdf = libreoffice_utils.fill_template_and_convert(
            template_path,
            form_data.get("formData", {})
        )

        # Verify office ID
        office_id = form_data.get("officeId")
        if not office_id:
            raise ValueError("officeId is required in form data")

        # Upload results
        pdf_path, pdf_url = firestore_utils.upload_result(
            form_id, output_pdf, "pdf", office_id
        )
        docx_path, docx_url = firestore_utils.upload_result(
            form_id, filled_docx_path, "docx", office_id
        )

        # Update form with generated files
        firestore_utils.update_document_urls(form_id, pdf_path, docx_path)
        
        # Mark job as completed
        firestore_utils.update_document_job(job_id, "completed")
        
        # Clean up temporary files
        try:
            os.unlink(template_path)
            os.unlink(filled_docx_path)
            os.unlink(output_pdf)
        except Exception as cleanup_error:
            logger.warning(f"Error cleaning up temp files: {cleanup_error}")

        response = jsonify({
            "status": "success",
            "jobId": job_id,
            "formId": form_id,
            "pdf_url": pdf_url,
            "docx_url": docx_url
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        return response

    except Exception as e:
        logger.error(f"Failed to process document job: {str(e)}", exc_info=True)
        
        # Update job status with error if we have jobId
        if 'job_id' in locals():
            firestore_utils.update_document_job(
                job_id, 
                "failed", 
                str(e)[:500]  # Truncate long error messages
            )
        
        response = jsonify({
            "error": "Document processing failed",
            "jobId": job_id if 'job_id' in locals() else None,
            "details": str(e)
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        return response, 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))