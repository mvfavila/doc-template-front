from flask import Flask, request, jsonify
import firestore_utils
import libreoffice_utils
import logging
import os
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
        form_id = doc_data.get("formId")
        if not form_id:
            response = jsonify({"error": "formId is required"})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            return response, 400
        
        print(f"Processing new document job for form: {form_id}")

        form_data = firestore_utils.fetch_form_data(form_id)
        template_path = firestore_utils.download_template(form_data)

        form_parameters = form_data.get("formData", {})
        filled_docx_path, output_pdf = libreoffice_utils.fill_template_and_convert(
            template_path,
            form_parameters
        )

        office_id = form_data.get("officeId")
        if not office_id:
            response = jsonify({"error": "officeId is required in form data"})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
            return response, 400

        pdf_path, pdf_url = firestore_utils.upload_result(form_id, output_pdf, file_type="pdf", office_id=office_id)
        docx_path, docx_url = firestore_utils.upload_result(form_id, filled_docx_path, file_type="docx", office_id=office_id)

        firestore_utils.update_document_urls(form_id, pdf_path, docx_path)

        response = jsonify({
            "status": "success",
            "pdf_url": pdf_url,
            "docx_url": docx_url
        })
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        return response

    except Exception as e:
        logger.error(f"Failed to process event: {str(e)}", exc_info=True)
        response = jsonify({"error": "Internal server error"})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        return response, 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))