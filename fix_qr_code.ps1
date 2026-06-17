# PowerShell script to fix QR code click behavior

$file = "frontend/src/pages/StudentDashboard.jsx"
$content = Get-Content $file -Raw

# Replace the QR code section with alert version
$oldPattern = '              \{certificate\.qr && \(\s+<a\s+href=\{certificate\.verification_url\}\s+target="_blank"\s+rel="noreferrer"\s+className="mx-auto block w-full max-w-\[240px\] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-\[1\.05\] hover:shadow-lg"\s+>\s+<img\s+src=\{certificate\.qr\}\s+alt="Certificate QR code"\s+className="aspect-square w-full object-contain"\s+/>\s+</a>\s+\)\}'

$newCode = @'
              {certificate.qr && (
                <div
                  onClick={() => alert('📱 Please scan the QR code\n\nUse your phone camera or QR scanner app to scan this code and verify the certificate.\n\nDo not click - scanning is required!')}
                  className="mx-auto block w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-[1.05] hover:shadow-lg cursor-pointer"
                >
                  <img
                    src={certificate.qr}
                    alt="Certificate QR code"
                    className="aspect-square w-full object-contain"
                  />
                </div>
              )}
'@

# Simple string replacement
$content = $content -replace '<a\s+href=\{certificate\.verification_url\}[^>]+>','<div onClick={() => alert("📱 Please scan the QR code using your camera or QR scanner app to verify the certificate. Do not click on it!")} className="mx-auto block w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-[1.05] hover:shadow-lg cursor-pointer">'
$content = $content -replace '</a>(\s+\)\}\s+<div className="mt-6)','</div>$1'

$content | Set-Content $file

Write-Host "QR code click behavior fixed!" -ForegroundColor Green
Write-Host "File updated: $file" -ForegroundColor Cyan