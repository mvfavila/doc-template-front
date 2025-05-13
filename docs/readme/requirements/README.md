# Requirements

## process_document_job

### Description

Triggered when a new document is created in the document_jobs collection.
Calls the Cloud Run service to process the form which ID is in the job document.

### Requirements

Prior to deployment, it requires a `.env` file in the same directory as the `main.py` file which holds the function.
The `.env` file must define the `DOCGEN_URL` environment variable.

Format:

```
DOCGEN_URL=<Cloud Run URL>
```

Sample:
```
DOCGEN_URL=https://doc-generator-612198340033.us-central1.run.app
```