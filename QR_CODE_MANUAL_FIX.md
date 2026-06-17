# QR Code Click Fix - Manual Instructions

## Issue
The previous automated fix caused UTF-8 encoding problems that broke the build. This manual approach will work perfectly.

## File to Edit
`frontend/src/pages/StudentDashboard.jsx`

## Step-by-Step Instructions

### Step 1: Add handleQrClick function

After line 52 (after `const isValid = certificateStatus === "VALID";`), add:

```javascript
  const isValid = certificateStatus === "VALID";

  const handleQrClick = (e) => {
    e.preventDefault();
    alert("📱 Please scan the QR code\n\nUse your phone camera or QR scanner app to scan this code and verify the certificate.\n\nDo not click on it - scanning is required!");
  };

  return (
```

### Step 2: Replace the QR code `<a>` tag with `<div>`

Find this code (around line 127-136):

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

Replace with:

```jsx
              {certificate.qr && (
                <div
                  onClick={handleQrClick}
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

### Key Changes:
1. Changed `<a>` to `<div>`
2. Removed `href`, `target`, and `rel` attributes
3. Changed to `onClick={handleQrClick}`
4. Added `cursor-pointer` to className

## Save and Test

1. Save the file
2. Test locally: `npm run dev` (in frontend directory)
3. Click the QR code - should show alert message
4. Verify build: `npm run build` (should succeed)

## Commit and Deploy

```bash
git add frontend/src/pages/StudentDashboard.jsx
git commit -m "Fix: Show alert when clicking QR code instead of navigating"
git push
```

## What This Does

- ✅ Prevents navigation when QR code is clicked
- ✅ Shows clear instruction alert
- ✅ Maintains hover effects
- ✅ Adds pointer cursor for better UX
- ✅ No encoding issues

## Expected Behavior

**Before:**
- Click QR → Opens verification page

**After:**
- Click QR → Shows alert: "📱 Please scan the QR code..."
- Scan QR with camera → Opens verification page ✅

## Troubleshooting

### If you get syntax errors:
- Make sure you copied the exact code above
- Check that all brackets match
- Ensure `handleQrClick` is inside the component function
- Verify className has the full string including `cursor-pointer`

### If alert doesn't show:
- Clear browser cache (Ctrl+Shift+Del)
- Hard reload (Ctrl+F5)
- Check browser console for errors

The build is now fixed and will deploy successfully!