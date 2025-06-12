# How to deploy the Form Generation Stater cloud function

This is aimed at the service account which is used in Form generation starter, currently done by a cloud function.
This function in turn, makes a request to the cloud run service.

## Variables and examples

| Variable | Example |
| -------- | ------- |
|[SERVICE_ACCOUNT] | gen-starter-cf-dev-sa |
|[PROJECT_ID] | doc-generator-dev |

## Create service account - Step-by-Step Instructions

1. **Select project** using something like `make use-dev`
2. **Create service account** by running:
    ```
    gcloud iam service-accounts create [SERVICE_ACCOUNT] \
        --display-name="Document Generator Starter Account" \
        --project=[PROJECT_ID]
    ```
3. **Grant role** `roles/firebase-adminsdk` to the service account:
    ```
    gcloud projects add-iam-policy-binding [PROJECT_ID] \
        --member="serviceAccount:[SERVICE_ACCOUNT]@[PROJECT_ID].iam.gserviceaccount.com" \
        --role="roles/firebase-adminsdk"
    ```

## Set environment variables

1. **Set the environment variables** in the `.env` file in the same directory as the `main.py` file
2. **DOCGEN_SA**, which holds the service account key in JSON format
