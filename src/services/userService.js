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

/**
 * Fetch all users from Firestore and return their username, name, role, and email.
 * @returns {Promise<Array<{username: string, name: string, role: string, email: string}>>}
 */
async function getAllUsers() {
  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      return [];
    }

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Extract formatted name from direct field or otherdata
      let name = data.name || "";
      if (!name && data.otherdata) {
        if (data.otherdata.firstName || data.otherdata.lastName) {
          name = [data.otherdata.firstName, data.otherdata.lastName]
            .filter(Boolean)
            .join(" ");
        } else if (data.otherdata.name) {
          name = data.otherdata.name;
        }
      }

      return {
        id: doc.id,
        username: data.username || doc.id,
        name: name || "",
        role: data.role || "user",
        email: data.email || "",
      };
    });

    return users;
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    throw error;
  }
}

/**
 * Fetch user details from Firestore by email.
 * @param {string} email
 * @returns {Promise<object|null>} user details or null if not found
 */
async function getUserByEmail(email) {
  if (!email) {
    return null;
  }

  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef
      .where("email", "==", email.trim().toLowerCase())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error("Error in getUserByEmail:", error);
    throw error;
  }
}

/**
 * Create a new user in Firestore.
 * @param {object} userData
 * @param {string} userData.username
 * @param {string} [userData.name]
 * @param {string} [userData.role]
 * @param {string} userData.email
 * @param {string} [userData.password]
 * @param {string} [userData.totpKey]
 * @param {object} [userData.otherdata]
 * @returns {Promise<object>} created user details
 */
async function createUser({
  username,
  name,
  role = "user",
  email,
  password,
  totpKey,
  otherdata = {},
}) {
  if (!username) {
    throw new Error("Username is required");
  }
  if (!email) {
    throw new Error("Email is required");
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanRole = (role || "user").trim();
  const cleanName = (name || "").trim();

  try {
    // Hash password if provided
    let finalPassword = password;
    if (finalPassword) {
      finalPassword = bcrypt.hashSync(finalPassword, 10);
    }

    const userDoc = {
      username: cleanUsername,
      name: cleanName,
      email: cleanEmail,
      role: cleanRole,
      password: finalPassword || "",
      totpKey: totpKey || "",
      otherdata: {
        name: cleanName,
        ...otherdata,
      },
      createdAt: new Date().toISOString(),
    };

    // Save using cleanUsername as document ID
    const usersRef = db.collection("users");
    await usersRef.doc(cleanUsername).set(userDoc);

    return {
      username: cleanUsername,
      name: cleanName,
      role: cleanRole,
      email: cleanEmail,
      createdAt: userDoc.createdAt,
    };
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
}

module.exports = {
  getUserByUsername,
  getUserByEmail,
  getAllUsers,
  createUser,
  resetPassword,
  generateUserResetCode,
};
