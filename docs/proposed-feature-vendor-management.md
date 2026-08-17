# Proposed Feature: Vendor & Contract Management Canvas

To further ease the planning process for event planners, we propose adding a **Vendor & Contract Management Canvas** to the Planohi platform.

Event planners often coordinate with multiple third-party suppliers (Caterers, Photographers, Venues, DJs, Decorators). Managing their contact information, signed contracts, and payment schedules is currently done outside the platform. Integrating this into Planohi will centralize all logistical operations.

---

## 1. Key Capabilities

### 🏢 Vendor Directory & Profiles
*   **Centralized Directory**: Organizers can add vendor profiles to an event workspace, including business name, contact person, email, phone number, and category (e.g., Photography, Catering).
*   **Cross-Event Vendor Pool**: Premium users can save vendors to a "Global Vendor Pool" associated with their account, allowing them to quickly re-use the same trusted vendors across multiple events.

### 📄 Contract Document Storage
*   **S3 Integration**: Planners can upload signed PDF contracts or proposals directly to a vendor's profile.
*   **Secure Access**: Similar to the event banners, contracts will be stored in AWS S3 and accessed via secure, temporary pre-signed URLs.

### 💳 Payment Installments & Spendings Integration
*   **Installment Tracking**: Planners can define payment schedules for a vendor (e.g., 20% Deposit, 80% Final Payment).
*   **Budget Canvas Link**: When a payment installment is marked as paid, it will automatically generate an `event_spending` record linked to the appropriate `event_component` (e.g., linking a DJ's final payment to the "Entertainment" component), keeping the chronological spendings log and budget aggregates perfectly synced.

### ⭐ Vendor Rating & Notes System
*   **Post-Event Reviews**: After an event concludes, organizers can rate the vendor out of 5 stars and leave internal notes (e.g., "Arrived late, but food was excellent").
*   **Curator Visibility**: These ratings are visible to all curators within the workspace, aiding in future planning decisions.

---

## 2. Proposed Database Schema Additions

```sql
CREATE TABLE vendor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendor_contract (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendor(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    s3_document_url VARCHAR(512) NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vendor_payment_installment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendor(id) ON DELETE CASCADE,
    spending_id UUID REFERENCES event_spending(id) ON DELETE SET NULL, -- Link to actual spending if paid
    title VARCHAR(255) NOT NULL,
    due_date TIMESTAMPTZ,
    amount_due NUMERIC(12, 2) NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE
);
```

---

## 3. User Experience & Layout Integration

*   **New Workspace Tab**: Introduce a new "Vendors" tab in the event workspace navigation, alongside Budget, Timeline, and Guests.
*   **Vendor Cards**: Display vendors as cards showing their category, contact info, and a quick-action button to view their contract.
*   **Payment Prompts**: The platform will flag upcoming payment installments in the dashboard or timeline, prompting the organizer to settle the payment. Upon confirming payment, the system will prompt to automatically log the actual spending to the Budget Canvas.
