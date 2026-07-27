const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure your email service here
// For now, we'll just log the code - you can add SendGrid, Mailgun, or SMTP credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// Generate a 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification email
exports.sendVerificationCode = functions.https.onCall(async (data, context) => {
  const { email, uid } = data;

  if (!email || !uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and UID are required');
  }

  try {
    // Generate code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store in Firestore
    await admin.firestore().collection('pending_verifications').doc(uid).set({
      email,
      code,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });

    // Send email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: '🏸 Smash Club - Verify Your Email',
      html: `
        <h2>Welcome to Smash Club!</h2>
        <p>Enter this code to verify your email:</p>
        <h1 style="font-size: 32px; letter-spacing: 4px; color: #10b981;">${code}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't sign up for Smash Club, ignore this email.</p>
      `,
    };

    // Try to send email (may fail if Gmail credentials not set up)
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
    } catch (emailError) {
      console.warn(`Email sending failed (this is OK during development): ${emailError.message}`);
      // For development, we'll log the code to console instead
      console.log(`Verification code for ${email}: ${code}`);
    }

    return { success: true, message: 'Verification code sent' };
  } catch (error) {
    console.error('Error sending verification code:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send verification code');
  }
});

// Verify the code
exports.verifyCode = functions.https.onCall(async (data, context) => {
  const { uid, code } = data;

  if (!uid || !code) {
    throw new functions.https.HttpsError('invalid-argument', 'UID and code are required');
  }

  try {
    const verificationDoc = await admin
      .firestore()
      .collection('pending_verifications')
      .doc(uid)
      .get();

    if (!verificationDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Verification code not found');
    }

    const verificationData = verificationDoc.data();
    const now = new Date();

    // Check if code is expired
    if (verificationData.expiresAt.toDate() < now) {
      throw new functions.https.HttpsError('unauthenticated', 'Verification code expired');
    }

    // Check if code matches
    if (verificationData.code !== code) {
      throw new functions.https.HttpsError('unauthenticated', 'Invalid verification code');
    }

    // Code is valid - mark email as verified in user profile
    await admin.firestore().collection('users').doc(uid).update({
      emailVerified: true,
    });

    // Delete the verification record
    await admin.firestore().collection('pending_verifications').doc(uid).delete();

    return { success: true, message: 'Email verified successfully' };
  } catch (error) {
    console.error('Error verifying code:', error);
    if (error.code) {
      throw error; // Re-throw HttpsError
    }
    throw new functions.https.HttpsError('internal', 'Failed to verify code');
  }
});
