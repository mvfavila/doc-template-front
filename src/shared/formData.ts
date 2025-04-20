import { Timestamp } from "@firebase/firestore"

interface FormDocument {
    // Metadata
    id: string
    customerId: string
    officeId: string
    templateId: string
    status: 'pending' | 'completed'
    createdAt: Timestamp
    updatedAt: Timestamp
    
    formData: Record<string, string>
}