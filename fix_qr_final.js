const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'StudentDashboard.jsx');

// Read file
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Add the handler function after isValid
if (!content.includes('handleQrClick')) {
  content = content.replace(
    'const isValid = certificateStatus === "VALID";',
    `const isValid = certificateStatus === "VALID";

  const handleQrClick = (e) => {
    e.preventDefault();
    alert("📱 Please scan the QR code\\n\\nUse your phone camera or QR scanner app to scan this code and verify the certificate.\\n\\nDo not click on it - scanning is required!");
  };`
  );
  console.log('✅ Added handleQrClick function');
}

// Step 2: Replace <a> with <div> - using regex to handle any whitespace
content = content.replace(
  /<a\s+href=\{certificate\.verification_url\}\s+target="_blank"\s+rel="noreferrer"\s+className="mx-auto block w-full max-w-\[240px\] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-\[1\.05\] hover:shadow-lg"\s*>/g,
  '<div onClick={handleQrClick} className="mx-auto block w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-[1.05] hover:shadow-lg cursor-pointer">'
);
console.log('✅ Replaced <a> with <div>');

// Step 3: Replace </a> with </div> in the QR code section
content = content.replace(
  /(<img\s+src=\{certificate\.qr\}\s+alt="Certificate QR code"\s+className="aspect-square w-full object-contain"\s+\/>\s*)<\/a>/g,
  '$1</div>'
);
console.log('✅ Replaced </a> with </div>');

// Write file
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File saved with UTF-8 encoding');
console.log('\\n🎉 QR code click prevention is now active!');
