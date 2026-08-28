const { db } = require("../lib/firebase");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

/**
 * Fetch user details from Firestore by username.
 * @param {string} username
 * @returns {Promise<object|null>} user details or null if not found
 */
async function getUserByUsername(username) {
  if (!username) {
    return null;
  }

  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef
      .where("username", "==", username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      ...data,
    };
  } catch (error) {
    console.error("Error in getUserByUsername:", error);
    throw error;
  }
}

/**
 * Reset password and update other user details in Firestore.
 * @param {string} username
 * @param {string} newPassword
 * @param {string} totpKey
 * @param {string} resetCode
 * @param {string|number} resetExpiry
 * @returns {Promise<object|null>} updated user details or null if user not found
 */
async function resetPassword(
  username,
  newPassword,
  totpKey,
  resetCode,
  resetExpiry,
) {
  if (!username) {
    throw new Error("Username is required");
  }

  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef
      .where("username", "==", username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const docRef = doc.ref;
    const updateData = {};

    if (newPassword) {
      updateData.password = newPassword;
    }
    if (totpKey) {
      updateData.totpKey = totpKey;
    }
    if (resetCode !== undefined) {
      updateData.resetCode = resetCode;
    }
    if (resetExpiry !== undefined) {
      updateData.resetExpiry = resetExpiry;
    }

    if (Object.keys(updateData).length > 0) {
      await docRef.update(updateData);
    }

    const updatedDoc = await docRef.get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };
  } catch (error) {
    console.error("Error in resetPassword:", error);
    throw error;
  }
}

/**
 * Generate a random reset code, update it to the user in Firestore, and return the code.
 * @param {string} username
 * @returns {Promise<string|null>} generated code or null if user not found
 */
async function generateUserResetCode(username) {
  if (!username) {
    throw new Error("Username is required");
  }

  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef
      .where("username", "==", username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const docRef = doc.ref;

    // Generate random 8-character code from alphabet
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const resetCode = Array.from(
      crypto.randomBytes(8),
      (byte) => alphabet[byte % alphabet.length],
    ).join("");

    // Set 15 minutes expiry from now
    const resetExpiry = Date.now() + 15 * 60 * 1000;

    await docRef.update({
      resetCode,
      resetExpiry,
    });

    return resetCode;
  } catch (error) {
    console.error("Error in generateUserResetCode:", error);
    throw error;
  }
}

module.exports = {
  getUserByUsername,
  resetPassword,
  generateUserResetCode,
};
