# How to Create a cloud run service account

This is aimed at the service account which is used in Form generation currently done by a cloud run service.

## Variables and examples

| Variable | Example |
| -------- | ------- |
|[SERVICE_ACCOUNT] | doc-generator-dev-sa |
|[PROJECT_ID] | doc-generator-dev |
|[BUCKET] | doc-generator-dev.firebasestorage.app |

## Step-by-Step Instructions

1. **Select project** using something like `make use-dev`
2. **Create service account** by running:
    ```
    gcloud iam service-accounts create [SERVICE_ACCOUNT] \
        --display-name="Document Generator Service Account" \
        --project=[PROJECT_ID]
    ```
3. **Grant role** `roles/datastore.user` to the service account:
    ```
    gcloud projects add-iam-policy-binding [PROJECT_ID] \
        --member="serviceAccount:[SERVICE_ACCOUNT]@[PROJECT_ID].iam.gserviceaccount.com" \
        --role="roles/datastore.user"
    ```
4. **Grant role** `roles/storage.objectAdmin` to the service account:
    ```
    gcloud projects add-iam-policy-binding [PROJECT_ID] \
        --member="serviceAccount:[SERVICE_ACCOUNT]@[PROJECT_ID].iam.gserviceaccount.com" \
        --role="roles/storage.objectAdmin"
    ```
5. **Limit role** `roles/storage.objectAdmin` to the system's bucket:
    ```
    gsutil iam ch \
        serviceAccount:[SERVICE_ACCOUNT]@[PROJECT_ID].iam.gserviceaccount.com:objectAdmin \
        gs://[BUCKET]
    ```
