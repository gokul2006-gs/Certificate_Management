# Deployment Fixes Required

## Issue: 500 Internal Server Error on Certificate Views

### Problem
The application is throwing a 500 error when accessing `/api/certificates/views/{student_id}/`. This appears to be because database migrations haven't been run on the production server.

### Solution
Run the following commands on your Render backend:

```bash
# Navigate to backend directory
cd backend

# Run migrations
python manage.py migrate

# Create indexes for MongoDB
python manage.py create_mongodb_indexes
```

## Additional Fixes Needed

### 1. AdminLogin Password Visibility Toggle

The AdminLogin component has an incomplete password visibility toggle button.

**File:** `frontend/src/pages/AdminLogin.jsx`

**Change the import line from:**
```javascript
import { LockKeyhole, ShieldCheck } from "lucide-react";
```

**To:**
```javascript
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
```

**Then find the password input section (around line 80) and replace:**
```javascript
<div className="relative">
<input
  type={showPassword ? "text" : "password"}
  required
  value={form.password}
  onChange={(event) => setForm({ ...form, password: event.target.value })}
  className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-800/5 hover:scale-[1.01] focus:scale-[1.01] transition-all duration-300"
  placeholder="Admin password"
/>
<button
/>
</div>
```

**With:**
```javascript
<div className="relative">
  <input
    type={showPassword ? "text" : "password"}
    required
    value={form.password}
    onChange={(event) => setForm({ ...form, password: event.target.value })}
    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium text-slate-800 pr-12 outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-800/5 hover:scale-[1.01] focus:scale-[1.01] transition-all duration-300"
    placeholder="Admin password"
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 hover:text-slate-600 transition-colors duration-200"
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
  </button>
</div>
```

### 2. AdminDashboard - Add Download All Certificates Button

**File:** `frontend/src/pages/AdminDashboard.jsx`

**Step 1:** Update the import line to include `Download` icon:
```javascript
import { Award, BookOpen, Download, FileText, LogIn, Upload, Users } from "lucide-react";
```

**Step 2:** Add the download handler function after `handleExcelUpload`:
```javascript
const handleDownloadAllCertificates = async () => {
  try {
    setMessage("Downloading all certificates...");
    const response = await api.get("/certificates/download-all/", {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `all_certificates_${new Date().toISOString().split('T')[0]}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMessage("Download started!");
  } catch (error) {
    setMessage(error.response?.data?.error || "Failed to download certificates");
  }
};
```

**Step 3:** Update the PageHeader section to include the download button:
```javascript
<PageHeader title="Admin Dashboard" eyebrow="Operations Overview">
  <div className="flex gap-2">
    <button 
      onClick={handleDownloadAllCertificates}
      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4.5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all duration-300 hover:scale-[1.02] shadow-md shadow-emerald-600/10 active:scale-[0.98]"
      disabled={stats.certificates === 0}
    >
      <Download size={15} />
      Download All Certificates
    </button>
    <Link to="/upload-certificate" className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4.5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all duration-300 hover:scale-[1.02] shadow-md shadow-slate-950/10 active:scale-[0.98]">
      <Award size={15} />
      Issue Certificate
    </Link>
  </div>
</PageHeader>
```

**Step 4:** Remove the registration type selector section. Delete this entire section from the Excel Upload Section:
```javascript
{/* Registration Type Selector */}
<div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
  {REGISTRATION_TYPES.map((type) => (
    // ... entire registration type selector code
  ))}
</div>
```

**Step 5:** Remove the unused constants and state:
- Delete the `REGISTRATION_TYPES` constant at the top
- Remove `registrationType` and `setRegistrationType` from state
- Remove `formData.append("registration_type", registrationType);` from `handleExcelUpload`

**Step 6:** Update the Excel upload description:
```javascript
<p className="mt-1 text-xs leading-relaxed text-slate-500 max-w-2xl">
  Upload an <code className="bg-slate-100 px-1 rounded">.xlsx</code> file to import student records.
</p>
```

### 3. Backend Error Handling Improvement

✅ Already fixed - Added better error handling in `view_certificate` function.

## Summary

1. **Critical:** Run database migrations on Render production server
2. Fix AdminLogin password toggle (add Eye/EyeOff icons and complete button)
3. Add "Download All Certificates" button to AdminDashboard
4. Remove registration type selector from student upload

The StudentLogin password visibility toggle is already working correctly.