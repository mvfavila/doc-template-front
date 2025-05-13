# Doc Template System

## Roles and Responsibilities

### System Administrator
**Capabilities:**
1. 🔐 Register new Office Administrators
2. ⚠️ Lock/disable Office Administrator accounts

### Office Administrator  
**Capabilities:**  
1. 👥 Register new Customers  
2. ⛔ Lock/disable Customer accounts  
3. 🔄 Request password resets for Customers (triggers email to Customer)  
4. 📄 Create document templates by:  
   - Uploading `.docx` files  
   - Naming each template  
5. 🔍 Review system-generated Forms (created from `.docx` processing)  
6. 📌 Assign Forms to one or multiple Customers  
7. 📋 List all submitted Forms  
8. 👀 View individual submitted Forms  
9. ✅❌ Review Forms with ability to:  
   - Approve/disapprove each field  
   - Add comments to disapproved fields  

### Customer  
**Capabilities:**  
1. 📜 View assigned Forms, including:  
   - Unsubmitted Forms  
   - Disapproved Forms requiring revision
2. ✍️ Fill out Forms  
3. 💾 Save partially completed Forms  
4. 📤 Submit completed Forms  

---

## Quick Links
▶️ [How-to Guides](docs/readme/howto/README.md)  
▶️ [Requirements](docs/readme/requirements/README.md)  

> **Note:** All role permissions are enforced through Firebase Authentication custom claims and Firestore Security Rules.