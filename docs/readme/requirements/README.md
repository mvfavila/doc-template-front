# Requirements

## process_document_job

### Description

Triggered when a new document is created in the document_jobs collection.
Calls the Cloud Run service to process the form which ID is in the job document.

### Requirements

Prior to deployment, it requires a `.env` file in the same directory as the `main.py` file which holds the function.
The `.env` file must define the `DOCGEN_URL` environment variable.

Format:

    DOCGEN_URL=<Cloud Run URL>

Sample:
    `DOCGEN_URL=https://doc-generator-612198340033.us-central1.run.app`

## handle_firestore_event

### Description

Receives a request from the `process_document_job` cloud function which includes a formId.
Creates .pdf and .docx files based on the form and the template and stores it in Firestore.

### Requirements

1. The deployment environment (local, GitHub actions, etc.) must define the following environment variables:
    ```
    DOC_TEMPLATE_FIREBASE_BUCKET_DEV
    SA_DOC_GENERATOR_DEV
    ```

    Format:
    ```
    DOC_TEMPLATE_FIREBASE_BUCKET_DEV=doc-template-front-dev.firebasestorage.app
    SA_DOC_GENERATOR_DEV=doc-generator-sa@doc-template-front-dev.iam.gserviceaccount.com
    ```

2. The cloud run service requires a Service Account with the following roles:
    ```
    roles/datastore.user
    roles/storage.objectAdmin
    ```

    Example:
    ```
    gcloud iam service-accounts create [SERVICE_ACCOUNT] \
    --display-name="Document Generator Service Account" \
    --project=[PROJECT_ID]

    gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:[SERVICE_ACCOUNT]@[PROJECT_ID].iam.gserviceaccount.com" \
    --role="roles/datastore.user"

    gcloud projects add-iam-policy-binding [PROJECT_ID] \
    --member="serviceAccount:[SERVICE_ACCOUNT]@[PROJECT_ID].iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

    gsutil iam ch \
    serviceAccount:[SERVICE_ACCOUNT]@[PROJECT_ID].iam.gserviceaccount.com:objectAdmin \
    gs://[BUCKET]
    ```