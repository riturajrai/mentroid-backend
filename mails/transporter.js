
/* -------------------- EMAIL TRANSPORTER (Optimized) -------------------- */
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
   // Secure SSL port
  port: 465,
  secure: true,
  auth: {
    // App password, not Gmail login password
    user: process.env.EMAIL_USER || "riturajrai2020@gmail.com",
    pass: process.env.EMAIL_PASS || "flcztrywulrlkjhb", 
  },
  pool: true,              //  Keeps the connection alive (fixes socket close)
  maxConnections: 5,       //  Limits simultaneous SMTP connections
  maxMessages: 100,        //  Reuse same connection for multiple emails
  tls: {
    rejectUnauthorized: false,
  },
});


transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP connection failed:", error.message);
  } else {
    console.log("SMTP Server is ready to send emails");
  }
});

module.exports = transporter;
