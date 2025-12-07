<div>

# 📄 **Resume Link Tracker – System Architecture Overview**

This document explains the full workflow of the Resume Link Tracker system.  
It follows a **decoupled, event-driven architecture** using AWS S3, SQS, Lambda/EC2, PostgreSQL, and Spring Boot.

---

# 🔷 **High-Level Pipeline**

The overall process:

1. User uploads a resume PDF  
2. PDF is stored in S3  
3. Metadata saved to PostgreSQL  
4. PDF Extractor Worker extracts hyperlinks  
5. Core Logic Worker applies mapping rules  
6. Final enriched data is stored in PostgreSQL  

The system is broken into three isolated, scalable services:

- **Spring Upload Service**  
- **PDF Extractor Worker**  
- **Core Logic Worker**

---

# 🧩 **1. Spring Upload Service**

The upload service is the system's entry point.

### **Responsibilities**
- Receive PDF upload via HTTP POST  
- Upload file to **AWS S3**  
- Create metadata entry in **PostgreSQL**  
- Publish a message to an **SQS queue** for async processing  

### **Workflow**
1. **User → Spring Upload API**  
   The user uploads `resume.pdf`.

2. **Upload to S3**  
   Stores the PDF in a private S3 bucket.

3. **Save DB Metadata**  
   The service stores:
   - `resume_id`  
   - `s3_key`  
   - created_at  
   - status  

4. **Publish to SQS (Upload Queue)**  
   Sample published message:

   ```json
   {
     "resume_id": "uuid",
     "s3_key": "uploads/resume_123.pdf"
   }
   ```

   🧩 2. PDF Extractor Worker

This worker processes the resume and extracts URLs.

Responsibilities
	•	Consume SQS messages
	•	Download PDF from S3
	•	Extract hyperlinks inside the PDF
	•	Save extracted data into PostgreSQL
	•	Publish a new SQS event for the Core Logic Worker

Workflow
	1.	Consume SQS Message
Receives the event from the Upload Service.
	2.	Download PDF from S3
	3.	Extract URLs
The worker identifies:
	•	LinkedIn
	•	GitHub
	•	Personal website
	•	Email links
	•	Any clickable hyperlink in the PDF
	4.	Write Extracted URLs into PostgreSQL
	5.	Publish Resume ID to Next SQS Queue
Triggers the Core Logic Worker for further processing.

⸻

🧩 3. Core Logic Worker

This component applies the system’s business rules.

Responsibilities
	•	Listen to SQS events from PDF Extractor
	•	Retrieve all extracted URLs from PostgreSQL
	•	Apply mapping logic or classification rules
	•	Save the enriched results into the database

Workflow
	1.	Receive resume_id from SQS
	2.	Fetch all extracted URLs from DB
	3.	Apply Mapping Logic
Examples:
	•	Group URLs (social, work, portfolio)
	•	Normalize website variations
	•	Detect duplicates
	•	Apply analytics or scoring rules
	4.	Save Final Processed Output into PostgreSQL

⸻

🏗 Tech Stack

Backend
	•	Spring Boot
	•	Spring Security
	•	Spring Data JPA

AWS Cloud
	•	S3 (PDF storage)
	•	SQS (message queues)
	•	Lambda or EC2 (workers)
	•	SNS (optional for fanout patterns)

Database
	•	PostgreSQL

⸻

✔️ Why This Architecture Works
	•	Asynchronous → user uploads never wait for processing
	•	Decoupled → each stage can scale independently
	•	Fault-tolerant → SQS retries prevent processing loss
	•	Modular → add new workers easily (analytics, AI, etc.)
	•	Cloud-native → uses AWS best practices

⸻

📌 Summary Diagram Explanation
	•	User uploads a resume to Spring Upload Service
	•	Service uploads to S3, writes metadata to PostgreSQL, and publishes message to SQS
	•	PDF Extractor Worker downloads PDF, extracts URLs, saves them, and publishes another event
	•	Core Logic Worker applies mappings and saves final results

This creates a clean, reliable, and scalable resume-processing pipeline.
</div>
```
