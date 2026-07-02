# Sprint 14: Mobile Picker Compatibility & Event Currency Selection

This sprint introduces mobile-friendly date selection workflows, multi-currency support for events, and user experience guards for existing budget records when changing currencies.

---

## 1. Goals

1. **Portaled Calendar Overlay**: Upgrade `DatePicker` and `DateRangePicker` components so that the dropdown calendar mounts inside a centered, backdrop-blurred full-screen modal overlay portaled to `document.body`. This prevents clipping by parent containers on all screen sizes and ensures a consistent visual hierarchy.
2. **Event Currency Selection**:
   - Allow coordinators to set a currency for each event during creation and updates.
   - Predefine a curated currency set:
     - **PHP (₱)** — Philippine Peso
     - **USD ($)** — United States Dollar
     - **EUR (€)** — Euro
     - **GBP (£)** — British Pound Sterling
     - **JPY (¥)** — Japanese Yen
     - **SGD (S$)** — Singapore Dollar
   - **Custom Currency Code Fallback**: If a coordinator needs a currency that is not pre-populated, provide a "Custom..." selection option that opens a 3-character text input field (e.g. CAD, AUD) for manual entry.
3. **Currency Conversion Warning**: When editing an existing event, changing its currency will pop up an warning modal informing the user that existing numerical budget and expenditure figures will **not** be mathematically converted, and must be adjusted manually.

---

## 2. User Stories

* **US-14.1 (Portaled Date Pickers)**: As an organizer, when I tap on a date or date-range input, I want the calendar to open in a centered React Portal dialog overlay with a dark backdrop so that I can easily select dates without layout clipping issues.
* **US-14.2 (Event Currency Select)**: As an organizer creating a new event, I want to select my preferred currency from a dropdown list (or input a custom 3-character code if not listed) so that all budget limits, estimates, and actual expenditures display the correct symbol throughout the dashboard.
* **US-14.3 (Currency Change Warning)**: As an organizer editing an existing event, if I change the currency, I want to see an warning modal immediately that requires my acknowledgement before I can save the changes, so that I don't accidentally display incorrect financial units.

---

## 3. Database Schema & Migration

A Flyway migration will be created to add a `currency` column to the `event` table, defaulting to `'USD'`.

### Flyway Migration: `V20260702120000__add_event_currency.sql`
```sql
ALTER TABLE event ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD';
```

---

## 4. Backend Technical Implementation

### 1. Entity and DTO Mapping
* **Modify `Event.java`**:
  ```java
  @Column(name = "currency", nullable = false, length = 3)
  private String currency = "USD";
  ```
* **Modify `EventDto.java` / `EventRequest.java`**: Include a `currency` string field to represent the currency code.

### 2. Services and Controller
* Ensure the create and update event services accept and persist the `currency` code.
* Ensure returned event details payloads contain the `currency` property.

---

## 5. Frontend Technical Implementation

### 1. DatePicker & DateRangePicker Portaled Overlays
Currently, both components use absolute positioning:
```typescript
{isOpen && (
  <div className="absolute ...">
```
To avoid parent container clipping and ensure a consistent visual presentation across all viewports, we will portal the calendar to `document.body` inside a centered overlay modal:

```tsx
{isOpen && mounted && typeof window !== "undefined" && createPortal(
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-100">
    <div className="w-full max-w-[360px] rounded-2xl border border-neon-purple/20 bg-[#121214] p-5 shadow-2xl animate-in zoom-in-95 duration-150">
      {/* Calendar contents */}
    </div>
  </div>,
  document.body
)}
```

---

### 2. Currency State Management & Selection Form
* **Event Creation/Edit Form**: 
  Add a `Currency` select field defaulting to `USD`. Include a "CUSTOM" option that reactively triggers a 3-character alphabetic text input validated to contain exactly three uppercase letters.
  ```tsx
  <select className="bg-[#121214] border border-white/10 text-white rounded-xl px-4 py-3">
    <option value="PHP">PHP (₱)</option>
    <option value="USD">USD ($)</option>
    <option value="EUR">EUR (€)</option>
    <option value="GBP">GBP (£)</option>
    <option value="JPY">JPY (¥)</option>
    <option value="SGD">SGD (S$)</option>
    <option value="CUSTOM">Custom...</option>
  </select>
  
  {/* If selectedCurrency === "CUSTOM" */}
  <input 
    type="text" 
    maxLength={3} 
    placeholder="e.g. CAD" 
    className="bg-[#121214] border border-white/10 text-white rounded-xl px-4 py-3 uppercase"
    pattern="[A-Za-z]{3}"
  />
  ```
* **Warning Modal (US-14.3)**: 
  Track the previous currency in component state. If the selected value changes during an **Edit** session:
  1. Open a Dialog modal warning the user:
     > **⚠️ Warning: Currency Change**
     > You are updating the currency from **[Old Currency]** to **[New Currency]**. Please note that existing estimates and expenditures will keep their original numbers and will NOT be automatically converted.
  2. The user must click **"I Understand"** to dismiss the modal and lock in the selection.
  3. If they cancel, revert the selection back to the previous currency value.

### 3. Dynamic Currency Formatting
Replace hardcoded `"PHP"` formatting inside `EventCard.tsx`, `EventBudgetCanvas.tsx`, and `EventApprovalsCanvas.tsx` with the event's dynamic `currency` code:

```typescript
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: event.currency || "USD", // Dynamic property mapping
  }).format(amount);
};
```

---

## 6. Verification Plan

### Manual Verification Steps:
1. **Responsive Date Pickers (React Portal Modal)**:
   - Access `http://localhost:3000/events/[id]` on any desktop screen or mobile device.
   - Click the start date inputs. Verify that the date calendar displays centered in a full-screen blurred modal backdrop portaled to `document.body` (immune to any parent container clipping).
2. **Currency Creation/Updates**:
   - Create an event choosing `USD ($)`. Verify all budget amounts display `$`.
   - Create an event, choose "Custom...", input `CAD`. Verify validation triggers if less than 3 characters or contains non-alphabetic keys. Verify successful creation displays `CAD`.
   - Edit the event, change currency to `EUR (€)`. Verify the warning modal pops up immediately.
   - Click "Cancel". Verify the dropdown reverts to `CAD`.
   - Change to `EUR` again, click "I Understand". Save the changes. Verify budget numbers remain unchanged but now show the `€` symbol.
