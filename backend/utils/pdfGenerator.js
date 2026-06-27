const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function generateCertificatePDFFile(cert) {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Ensure storage directory exists
      const dirPath = path.join(__dirname, '../storage/certificates');
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Fetch dynamic details for student, college, and workshop from database
      const regDoc = await db.collection('registrations').doc(String(cert.registration_id)).get();
      const reg = regDoc.exists ? regDoc.data() : {};
      
      const studentDoc = await db.collection('students').doc(String(cert.student_id)).get();
      const student = studentDoc.exists ? studentDoc.data() : {};

      const collegeDoc = await db.collection('colleges').doc(String(student.college_id)).get();
      const collegeName = collegeDoc.exists ? collegeDoc.data().name : 'Unknown College';

      const workshopDoc = await db.collection('workshops').doc(String(cert.workshop_id)).get();
      const workshop = workshopDoc.exists ? workshopDoc.data() : {};

      const filePath = path.join(dirPath, `${cert.certificate_code}.pdf`);
      
      // Initialize PDFDocument in landscape orientation for certificates
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // --- Draw Borders ---
      // Outer Double Border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
         .lineWidth(5)
         .stroke('#d4af37');

      doc.rect(26, 26, doc.page.width - 52, doc.page.height - 52)
         .lineWidth(1)
         .stroke('#c5a02e');

      // Decorative Corners
      const drawCorner = (x, y, dx, dy) => {
        doc.moveTo(x, y).lineTo(x + dx, y).lineWidth(4).stroke('#d4af37');
        doc.moveTo(x, y).lineTo(x, y + dy).lineWidth(4).stroke('#d4af37');
      };
      
      // Top-Left
      drawCorner(32, 32, 24, 24);
      // Top-Right
      drawCorner(doc.page.width - 32, 32, -24, 24);
      // Bottom-Left
      drawCorner(doc.page.width - 32, doc.page.height - 32, -24, -24);
      // Bottom-Right
      drawCorner(32, doc.page.height - 32, 24, -24);

      // --- Header Organization ---
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor('#0f172a')
         .text('SANSAH INNOVATIONS', { align: 'center', dy: 20 });
         
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#64748b')
         .text('CENTER FOR ACADEMIC RESEARCH & TECHNOLOGY', { align: 'center', letterSpacing: 1.5, dy: 6 });

      doc.moveDown(2);

      // --- Certificate Title ---
      doc.fontSize(32)
         .font('Times-Bold')
         .fillColor('#1e3a8a')
         .text('Certificate of Completion', { align: 'center' });

      // Title Gold Accent Underline
      doc.moveTo(doc.page.width / 2 - 60, doc.y + 5)
         .lineTo(doc.page.width / 2 + 60, doc.y + 5)
         .lineWidth(2)
         .stroke('#c5a02e');

      doc.moveDown(2.5);

      // --- Body Statement ---
      doc.fontSize(14)
         .font('Times-Italic')
         .fillColor('#475569')
         .text('This is to certify that', { align: 'center' });

      doc.moveDown(0.8);

      const recipientName = student.name || 'Rahul Sharma';
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#0f172a')
         .text(recipientName, { align: 'center' });

      // Name Gold Accent Underline
      doc.moveTo(doc.page.width / 2 - 160, doc.y + 4)
         .lineTo(doc.page.width / 2 + 160, doc.y + 4)
         .lineWidth(1)
         .stroke('#e2e8f0');

      doc.moveDown(1.2);

      const branchName = student.branch || 'Not Specified';
      const workshopTitle = workshop.title || 'Unknown Workshop';
      const attPercentage = cert.attendance_percentage || 100;
      
      doc.fontSize(13)
         .font('Times-Roman')
         .fillColor('#334155')
         .text(`from `, { align: 'center', continued: true })
         .font('Times-Bold').text(`${collegeName}`, { continued: true })
         .font('Times-Roman').text(`, Department of `, { continued: true })
         .font('Times-Bold').text(`${branchName}`, { continued: true })
         .font('Times-Roman').text(`, has successfully completed the `, { continued: true })
         .font('Times-Bold').text(`${workshopTitle}`, { continued: true })
         .font('Times-Roman').text(` workshop with an attendance of `, { continued: true })
         .font('Times-Bold').text(`${attPercentage}%`, { continued: true })
         .font('Times-Roman').text(`, We appreciate their dedication and participation.`, { continued: false });

      doc.moveDown(3);

      // --- Signatures ---
      const sigY = doc.page.height - 120;

      // Left Signature (Amit Varma)
      doc.fontSize(14)
         .font('Times-Italic')
         .fillColor('#1e3a8a')
         .text('Dr. Amit Varma', 100, sigY, { width: 200, align: 'center' });
      doc.moveTo(100, sigY + 18)
         .lineTo(300, sigY + 18)
         .lineWidth(1)
         .stroke('#94a3b8');
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#64748b')
         .text('Coordinator, Sansah', 100, sigY + 22, { width: 200, align: 'center' });

      // Right Signature (Lead Instructor)
      doc.fontSize(14)
         .font('Times-Italic')
         .fillColor('#1e3a8a')
         .text('Priyadarshini S.', doc.page.width - 300, sigY, { width: 200, align: 'center' });
      doc.moveTo(doc.page.width - 300, sigY + 18)
         .lineTo(doc.page.width - 100, sigY + 18)
         .lineWidth(1)
         .stroke('#94a3b8');
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#64748b')
         .text('Lead Instructor', doc.page.width - 300, sigY + 22, { width: 200, align: 'center' });

      // --- Footer Metadata ---
      const footerY = doc.page.height - 55;
      const formattedIssueDate = cert.issue_date 
        ? new Date(cert.issue_date).toLocaleDateString('en-IN')
        : new Date().toLocaleDateString('en-IN');
      
      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor('#64748b')
         .text(`CREDENTIAL ID: `, 50, footerY, { continued: true })
         .fillColor('#334155').text(`${cert.certificate_code}      `, { continued: true })
         .fillColor('#64748b').text(`VERIFIED STATUS: `, { continued: true })
         .fillColor('#10b981').text(`VALID      `, { continued: true })
         .fillColor('#64748b').text(`ISSUE DATE: `, { continued: true })
         .fillColor('#334155').text(`${formattedIssueDate}`);

      doc.end();

      writeStream.on('finish', () => {
        resolve(filePath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = { generateCertificatePDFFile };
