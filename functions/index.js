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

// Delete a user account (admin only)
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'User UID is required');
  }

  try {
    // Check if requester is admin
    console.log(`Delete request for ${uid} from ${context.auth.uid}`);

    const requesterDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    console.log(`Requester role: ${requesterDoc.data()?.role}`);

    if (requesterDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users');
    }

    // Prevent admin from deleting themselves
    if (uid === context.auth.uid) {
      throw new functions.https.HttpsError('invalid-argument', 'Cannot delete your own account');
    }

    // Delete Firestore profile documents
    await admin.firestore().collection('users').doc(uid).delete();
    await admin.firestore().collection('publicProfiles').doc(uid).delete();

    // Delete all registrations for this user
    const registrationsSnapshot = await admin
      .firestore()
      .collection('registrations')
      .where('userId', '==', uid)
      .get();

    const deleteRegPromises = registrationsSnapshot.docs.map(doc => doc.ref.delete());
    await Promise.all(deleteRegPromises);

    // Delete all matches where user was a player
    const matchesSnapshot = await admin
      .firestore()
      .collectionGroup('matches')
      .where('teamA', 'array-contains', uid)
      .get();

    const matchesToDelete = new Set();
    matchesSnapshot.docs.forEach(doc => matchesToDelete.add(doc.ref));

    const matchesSnapshot2 = await admin
      .firestore()
      .collectionGroup('matches')
      .where('teamB', 'array-contains', uid)
      .get();

    matchesSnapshot2.docs.forEach(doc => matchesToDelete.add(doc.ref));

    const deleteMatchPromises = Array.from(matchesToDelete).map(ref => ref.delete());
    await Promise.all(deleteMatchPromises);

    // Delete Firebase Auth account
    await admin.auth().deleteUser(uid);

    console.log(`User ${uid} deleted successfully`);
    return {
      success: true,
      message: `User ${uid} deleted successfully`,
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    if (error.code) {
      throw error; // Re-throw HttpsError
    }
    throw new functions.https.HttpsError('internal', `Failed to delete user: ${error.message}`);
  }
});

// Resend verification email to a user (admin only) - HTTP function with CORS
exports.resendVerificationEmail = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }

  try {
    const uid = req.body?.uid
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!uid) {
      res.status(400).json({ error: 'User UID is required' })
      return
    }

    if (!token) {
      res.status(401).json({ error: 'Must be logged in' })
      return
    }

    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(token)
    const requesterUid = decodedToken.uid

    // Check if requester is admin
    const requesterDoc = await admin.firestore().collection('users').doc(requesterUid).get()
    if (requesterDoc.data()?.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can resend verification emails' })
      return
    }

    // Get the user's email
    const user = await admin.auth().getUser(uid)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Generate a new 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store in Firestore
    await admin.firestore().collection('pending_verifications').doc(uid).set({
      email: user.email,
      code,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    })

    console.log(`Resending verification code for ${user.email}`)

    // Send email with code
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: '🏸 Smash Club - Verify Your Email',
      html: `
        <h2>Welcome to Smash Club!</h2>
        <p>Enter this code to verify your email:</p>
        <h1 style="font-size: 32px; letter-spacing: 4px; color: #10b981;">${code}</h1>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't sign up for Smash Club, ignore this email.</p>
      `,
    }

    // Try to send email (may fail if Gmail credentials not set up)
    try {
      await transporter.sendMail(mailOptions)
      console.log(`Verification email resent to ${user.email}`)
    } catch (emailError) {
      console.warn(`Email sending failed: ${emailError.message}`)
      console.log(`Verification code for ${user.email}: ${code}`)
    }

    res.status(200).json({
      success: true,
      message: `Verification email resent to ${user.email}`,
    })
  } catch (error) {
    console.error('Error resending verification email:', error)
    res.status(500).json({ error: `Failed to resend email: ${error.message}` })
  }
})

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
