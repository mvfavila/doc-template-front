# How to Create a cloud run service

This service uses a Firestore bucket to store templates (.docx) and forms (.docx and .pdf).
In order for create this bucket, making it accessible and secury, a few steps are required.

## Variables and examples

| Variable | Example |
| -------- | ------- |
|[BUCKET] | doc-generator-dev.firebasestorage.app |

## Create bucket - Step-by-Step Instructions

1. **Create bucket** using the Firebase console

## Bucket set up - Step-by-Step Instructions

1. **Create** cors.json file
    ```
    [
        {
            "origin": ["<FRONTEND_URL>"],
            "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "responseHeader": ["Content-Type", "Authorization"],
            "maxAgeSeconds": 3600
        }
    ]
    ```
2. **Set up** CORS
    ```
    gsutil cors set cors.json gs://<BUCKET>
    ```

CORS take a few minutes to propagate.
