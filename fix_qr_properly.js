const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'StudentDashboard.jsx');

// Read file with UTF-8 encoding
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Add handleQrClick function
const functionToAdd = `
  const handleQrClick = (e) => {
    e.preventDefault();
    alert("📱 Please scan the QR code\\n\\nUse your phone camera or QR scanner app to scan this code and verify the certificate.\\n\\nDo not click on it - scanning is required!");
  };
`;

// Find where to insert the function (after isValid declaration)
content = content.replace(
  /const isValid = certificateStatus === "VALID";/,
  `const isValid = certificateStatus === "VALID";${functionToAdd}`
);

// Step 2: Replace the <a> tag with <div>
const oldQrCode = `<a
                  href={certificate.verification_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mx-auto block w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-[1.05] hover:shadow-lg"
                >`;

const newQrCode = `<div
                  onClick={handleQrClick}
                  className="mx-auto block w-full max-w-[240px] rounded-2xl border border-slate-100 bg-white p-4 shadow-md transition duration-300 hover:scale-[1.05] hover:shadow-lg cursor-pointer"
                >`;

content = content.replace(oldQrCode, newQrCode);

// Replace closing </a> tag
content = content.replace(
  /(\s*)<\/a>(\s*\)\})/,
  '$1</div>$2'
);

// Write back with UTF-8 encoding
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ QR code click behavior fixed successfully!');
console.log('   - Added handleQrClick function');
console.log('   - Replaced <a> with <div>');
console.log('   - File encoding: UTF-8');
