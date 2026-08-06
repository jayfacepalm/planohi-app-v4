# Sprint 17: Social Media Plan Sharing & Clipboard Formatting

This sprint introduces a social media event plan sharing feature. Users can click a "Share Plan" button inside the event workspace header to generate a structured, formatted summary (containing event title, description, timeline milestones checklist, component budget breakdown with total planned vs. actual spending, and a Plano.hi workspace link) copied directly to their system clipboard for sharing on social media and messaging platforms.

---

## 1. Goals

1. **Social Media Plan Sharing & Clipboard Formatting**: Add a "Share Plan" action button in [EventWorkspaceHeaderActions.tsx](/planohi-app-v4/web/components/features/EventWorkspaceHeaderActions.tsx) that aggregates event details and copies a clean, human-readable text summary (with title, description, timeline milestones, component budget breakdown, total planned vs. actual spending, and Plano.hi link) directly to the system clipboard (`navigator.clipboard.writeText`).
2. **Share Summary Aggregation API**: Implement a single, efficient backend endpoint `GET /api/events/{eventId}/share-summary` returning an aggregated payload (`EventShareSummaryDto`) combining event metadata, timeline items, component budgets, and spending totals.
3. **User Feedback Confirmation**: Provide instant feedback via a themed modal/toast upon successful clipboard copy ("Event plan copied to clipboard! Ready to share with friends and family.").

---

## 2. User Stories

* **US-17.1 (Copy Formatted Event Plan to Clipboard)**: As an event organizer or participant, I want to click a "Share Plan" button so that a formatted summary of the event title, description, timeline, component budgets, total planned vs. actual spending, and Plano.hi workspace link is copied to my clipboard for easy pasting into WhatsApp, Telegram, X, or email.
* **US-17.2 (Share Summary Backend Aggregation)**: As a system, I want to serve a consolidated share summary endpoint returning timeline milestones and component budget totals so that client sharing executes quickly without multiple API calls.
* **US-17.3 (Clipboard Copy Confirmation & Feedback)**: As a user sharing an event plan, I want to see a confirmation toast/modal upon clicking "Share Plan" so that I know the plan was copied to my clipboard successfully.

---

## 3. Database Schema & Migration

* **N/A** — This sprint operates on existing database entities (`event`, `timeline_item`, `event_component`, `event_spending`). No database table migrations are required.

---

## 4. Backend REST APIs & Caching Layer

### 1. Share Summary Aggregation Endpoint
* **URI**: `GET /api/events/{eventId}/share-summary`
* **Security**: Requires authenticated user with read access (`checkReadAccess`) to the event workspace.
* **Behavior**: Aggregates event details, active timeline milestones (ordered by `dueAt ASC`), component budgets (planned vs. actual spent), and total event budget metrics into `EventShareSummaryDto`.
* **Response**: `200 OK`
  ```json
  {
    "status": "SUCCESS",
    "msg": "Share summary retrieved successfully",
    "result": {
      "eventId": "018e5a6f-0000-7000-8111-111111111111",
      "title": "Grand Annual Tech Summit 2026",
      "description": "Annual gathering of tech innovators and planners.",
      "currency": "USD",
      "shareUrl": "https://planohi.com/events/018e5a6f-0000-7000-8111-111111111111",
      "totalPlannedCost": 15000.00,
      "totalActualSpent": 12450.00,
      "timeline": [
        {
          "title": "Reserve Main Auditorium",
          "dueAt": "2026-08-15T09:00:00Z",
          "isDone": true
        },
        {
          "title": "Finalize Keynote Speakers",
          "dueAt": "2026-08-20T17:00:00Z",
          "isDone": false
        }
      ],
      "components": [
        {
          "name": "Venue & Decor",
          "estimatedCost": 8000.00,
          "actualSpent": 7500.00
        },
        {
          "name": "Catering & Refreshments",
          "estimatedCost": 4000.00,
          "actualSpent": 3450.00
        },
        {
          "name": "Audio/Visual Equipment",
          "estimatedCost": 3000.00,
          "actualSpent": 1500.00
        }
      ]
    }
  }
  ```

---

## 5. Technical Implementation Details

### 1. "Share Plan" Button Placement in [EventWorkspaceHeaderActions.tsx](/planohi-app-v4/web/components/features/EventWorkspaceHeaderActions.tsx)

Add a "Share Plan" button (`Share2` icon) accessible to all workspace users and viewers:

```tsx
<Button
  variant="ghost"
  onClick={handleSharePlan}
  isLoading={shareLoading}
  className="flex items-center gap-2 border border-neon-cyan/30 hover:border-neon-cyan text-neon-cyan px-4 py-2"
>
  <Share2 className="w-4 h-4" />
  Share Plan
</Button>
```

### 2. Clipboard Text Template Formatting Algorithm

When "Share Plan" is clicked, fetch `EventShareSummaryDto` via `fetchApi` and construct the formatted text:

```typescript
const formatShareText = (summary: EventShareSummaryDto) => {
  const currency = summary.currency || "USD";
  const formattedPlanned = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(summary.totalPlannedCost);
  const formattedActual = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(summary.totalActualSpent);

  const timelineSection = summary.timeline.map((item) => {
    const status = item.isDone ? "[✓]" : "[ ]";
    const dateStr = new Date(item.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${status} ${item.title} (${dateStr})`;
  }).join("\n");

  const componentsSection = summary.components.map((c) => {
    const est = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(c.estimatedCost);
    const act = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(c.actualSpent);
    return `• ${c.name}: Planned ${est} | Spent ${act}`;
  }).join("\n");

  return `🎉 PLANOHI EVENT PLAN: ${summary.title}
${summary.description ? summary.description + "\n" : ""}
📌 TIMELINE MILESTONES:
${timelineSection || "No milestones specified."}

💰 BUDGET & SPENDING SUMMARY:
Total Planned: ${formattedPlanned} | Total Actual: ${formattedActual}

📊 COMPONENTS BREAKDOWN:
${componentsSection || "No budget components specified."}

🔗 View full plan on Plano.hi: ${summary.shareUrl}`;
};
```

### 3. Clipboard API Execution & Fallback

```typescript
const handleSharePlan = async () => {
  setShareLoading(true);
  try {
    const summary = await fetchApi<EventShareSummaryDto>(`/events/${event.id}/share-summary`);
    const shareText = formatShareText(summary);

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareText);
    } else {
      // Fallback for non-secure HTTP / legacy contexts
      const textArea = document.createElement("textarea");
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setShareSuccessModalOpen(true);
  } catch (err) {
    console.error("Failed to share event plan:", err);
  } finally {
    setShareLoading(false);
  }
};
```

---

## 6. Verification Plan

### Automated Build Verification
1. **Backend Integration Tests**: Run `mvn test` in `/api` to verify `EventShareSummaryServiceTest` aggregates timeline items, component budgets, and total spending metrics correctly.
2. **Frontend Compiler Check**: Run `npm run build` inside `/web` to verify TypeScript compilation of `EventWorkspaceHeaderActions.tsx` and `EventShareSummaryDto`.

### Manual Behavior Tests
1. **Share Button Clipboard Copy**: Open an event workspace, click "Share Plan", paste clipboard content into a text editor, and verify the formatted output:
   - Contains Event Title and Description.
   - Lists Timeline Milestones with checkmark statuses `[✓]` / `[ ]` and dates.
   - Lists Total Planned vs. Total Actual Spending.
   - Lists Component Breakdown with planned vs. actual per category.
   - Contains valid Plano.hi link (`https://planohi.com/events/<eventId>`).
2. **Clipboard Feedback Notification**: Verify that clicking "Share Plan" displays a confirmation modal/toast ("Event plan copied to clipboard! Ready to share.").
