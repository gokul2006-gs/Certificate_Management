# Fix QR Code Click Behavior in Student Dashboard

## Current Issue
When students click on the QR code in their dashboard, it redirects them to the certificate verification page. This defeats the purpose of the QR code.

## Required Fix
Change the QR code to show a message instead: "Please scan the QR code using a camera or QR scanner app to verify the certificate."

## File to Edit
`frontend/src/pages/StudentDashboard.jsx`

## Changes Needed

### Step 1: Add state for showing the message

After line 11 (where other useState declarations are), add:
```javascript
const [showQrMessage, setShowQrMessage] = useState(false);
```

So it looks like:
```javascript
const [student, setStudent] = useState(null);
const [certificate, setCertificate] = useState(null);
const [certificateStatus, setCertificateStatus] = useState("PENDING");
const [message, setMessage] = useState("");
const [showQrMessage, setShowQrMessage] = useState(false);  // ADD THIS LINE
```

### Step 2: Replace the QR code link (around line 127-135)

**Find this code:**
```jsx
{certificate.qr && (
  <a
    href={certificate.verification_url}
    target="_blank"
    rel="noreferrer"
    className="mx-auto block w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-[1.05] hover:shadow-lg"
  >
    <img
      src={certificate.qr}
      alt="Certificate QR code"
      className="aspect-square w-full object-contain"
    />
  </a>
)}
```

**Replace with:**
```jsx
{certificate.qr && (
  <div>
    <div
      onClick={() => setShowQrMessage(true)}
      className="mx-auto block w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-[1.05] hover:shadow-lg cursor-pointer"
    >
      <img
        src={certificate.qr}
        alt="Certificate QR code"
        className="aspect-square w-full object-contain"
      />
    </div>
    
    {showQrMessage && (
      <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
        <p className="text-sm font-semibold text-blue-800 mb-2">
          📱 Please Scan the QR Code
        </p>
        <p className="text-xs text-blue-700">
          Use your phone's camera or a QR scanner app to scan this code and verify your certificate.
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowQrMessage(false);
          }}
          className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800 underline"
        >
          Close
        </button>
      </div>
    )}
  </div>
)}
```

## Alternative: Simple Alert Version

If you prefer a simple alert popup instead of the message box:

**Replace the QR code section with:**
```jsx
{certificate.qr && (
  <div
    onClick={() => alert('📱 Please scan the QR code using a camera or QR scanner app to verify the certificate.\n\nDo not click on it - scanning is required for verification.')}
    className="mx-auto block w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-[1.05] hover:shadow-lg cursor-pointer"
  >
    <img
      src={certificate.qr}
      alt="Certificate QR code"
      className="aspect-square w-full object-contain"
    />
  </div>
)}
```

## What This Does

1. **Removes the link** - QR code is no longer clickable as a link
2. **Adds click handler** - Shows a message when clicked
3. **Better UX** - Students understand they need to scan, not click
4. **Prevents confusion** - Stops students from accessing verification page directly

## Testing

After making the changes:
1. Save the file
2. Run `npm run dev` or wait for Vercel to deploy
3. Log in as a student
4. Click on the QR code
5. Should see the message instead of navigating away

## Commit and Deploy

```bash
git add frontend/src/pages/StudentDashboard.jsx
git commit -m "Prevent QR code click navigation, show scan message instead"
git push
```

Vercel will auto-deploy in 3-5 minutes.

## Benefits

✅ Students can't bypass scanning requirement
✅ Clear instructions to scan the QR code
✅ Better user experience
✅ Maintains certificate verification security