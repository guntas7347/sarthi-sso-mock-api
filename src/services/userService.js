const { db } = require("../lib/firebase");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

/**
 * Standardize user document format across all queries and operations.
 * Always returns consistent null-coalesced fields.
 * @param {import("firebase-admin/firestore").DocumentSnapshot | object} docOrData
 * @param {string} [docId]
 * @returns {object}
 */
function formatUser(docOrData, docId) {
  if (!docOrData) return null;

  const data =
    typeof docOrData.data === "function" ? docOrData.data() : docOrData;
  const id = docOrData.id || docId || data.id || data.username || null;

  let name = data.name;
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
    id: id,
    createdAt:
      data.createdAt !== undefined && data.createdAt !== ""
        ? data.createdAt
        : null,
    email: data.email !== undefined && data.email !== "" ? data.email : null,
    name: name !== undefined && name !== "" ? name : null,
    username: data.username || id || null,
    role: data.role || "user",
    totpKey:
      data.totpKey !== undefined && data.totpKey !== "" ? data.totpKey : null,
    password:
      data.password !== undefined && data.password !== ""
        ? data.password
        : null,
    resetCode:
      data.resetCode !== undefined && data.resetCode !== ""
        ? data.resetCode
        : null,
    resetExpiry:
      data.resetExpiry !== undefined && data.resetExpiry !== ""
        ? data.resetExpiry
        : null,
  };
}

/**
 * Fetch user details from Firestore by username.
 * @param {string} username
 * @returns {Promise<object|null>} user details in standard format or null if not found
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
      // Also try fetching by doc ID in case username was passed as document ID
      const directDoc = await usersRef.doc(username).get();
      if (directDoc.exists) {
        return formatUser(directDoc);
      }
      return null;
    }

    return formatUser(snapshot.docs[0]);
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
    return formatUser(updatedDoc);
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
 * Fetch all users from Firestore in standardized format.
 * @returns {Promise<Array<object>>}
 */
async function getAllUsers() {
  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => formatUser(doc));
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

    return formatUser(snapshot.docs[0]);
  } catch (error) {
    console.error("Error in getUserByEmail:", error);
    throw error;
  }
}

/**
 * Create a new user in Firestore with an auto-assigned long document ID.
 * Stores: createdAt, email, name, username, role, totpKey, password, resetCode, resetExpiry.
 * Missing data is defaulted to null.
 * @param {object} userData
 * @param {string} userData.username
 * @param {string} [userData.name]
 * @param {string} [userData.role]
 * @param {string} userData.email
 * @param {string} [userData.password]
 * @param {string} [userData.totpKey]
 * @param {string} [userData.resetCode]
 * @param {string|number} [userData.resetExpiry]
 * @returns {Promise<object>} created user details with auto-assigned id
 */
async function createUser({
  username,
  name,
  role = "user",
  email,
  password,
  totpKey,
  resetCode,
  resetExpiry,
}) {
  if (!username) {
    throw new Error("Username is required");
  }
  if (!email) {
    throw new Error("Email is required");
  }

  const cleanUsername = username ? String(username).trim() : null;
  const cleanEmail = email ? String(email).trim().toLowerCase() : null;
  const cleanRole = role && String(role).trim() ? String(role).trim() : "user";
  const cleanName = name && String(name).trim() ? String(name).trim() : null;
  const cleanTotpKey =
    totpKey && String(totpKey).trim() ? String(totpKey).trim() : null;

  try {
    // Hash password if provided
    let finalPassword = null;
    if (password && String(password).trim()) {
      finalPassword = bcrypt.hashSync(String(password), 10);
    }

    const cleanResetCode =
      resetCode !== undefined && resetCode !== null && String(resetCode).trim()
        ? String(resetCode).trim()
        : null;

    const cleanResetExpiry =
      resetExpiry !== undefined && resetExpiry !== null && resetExpiry !== ""
        ? resetExpiry
        : null;

    // Store only specified fields; missing data defaults to null
    const userDoc = {
      createdAt: new Date().toISOString(),
      email: cleanEmail,
      name: cleanName,
      username: cleanUsername,
      role: cleanRole,
      totpKey: cleanTotpKey,
      password: finalPassword,
      resetCode: cleanResetCode,
      resetExpiry: cleanResetExpiry,
    };

    // Auto-assign long document ID using .add()
    const usersRef = db.collection("users");
    const docRef = await usersRef.add(userDoc);

    return formatUser(userDoc, docRef.id);
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
}

/**
 * Edit an existing user in Firestore.
 * @param {object} updateParams
 * @param {string} updateParams.id - The Firestore document ID or identifier
 * @param {string} [updateParams.name]
 * @param {string} [updateParams.email]
 * @param {string} [updateParams.role]
 * @param {string} [updateParams.username]
 * @returns {Promise<object|null>} updated user details or null if not found
 */
async function editUser({ id, name, email, role, username }) {
  if (!id) {
    throw new Error("User ID is required");
  }

  try {
    const usersRef = db.collection("users");
    let docRef = usersRef.doc(id);
    let docSnap = await docRef.get();

    // If not found by doc.id directly, try finding by username field
    if (!docSnap.exists) {
      const querySnap = await usersRef
        .where("username", "==", id)
        .limit(1)
        .get();
      if (!querySnap.empty) {
        docRef = querySnap.docs[0].ref;
        docSnap = querySnap.docs[0];
      } else {
        return null;
      }
    }

    const currentData = docSnap.data();

    // Check duplicate email if email is being updated and differs from current
    if (
      email !== undefined &&
      email !== null &&
      email.trim().toLowerCase() !== (currentData.email || "").toLowerCase()
    ) {
      const cleanEmail = email.trim().toLowerCase();
      const existingEmailSnap = await usersRef
        .where("email", "==", cleanEmail)
        .limit(1)
        .get();
      if (
        !existingEmailSnap.empty &&
        existingEmailSnap.docs[0].id !== docRef.id
      ) {
        const error = new Error(
          `Email '${cleanEmail}' is already in use by another user`,
        );
        error.code = "DUPLICATE_EMAIL";
        throw error;
      }
    }

    // Check duplicate username if username is being updated and differs from current
    if (
      username !== undefined &&
      username !== null &&
      username.trim() !== currentData.username
    ) {
      const cleanUsername = username.trim();
      const existingUsernameSnap = await usersRef
        .where("username", "==", cleanUsername)
        .limit(1)
        .get();
      if (
        !existingUsernameSnap.empty &&
        existingUsernameSnap.docs[0].id !== docRef.id
      ) {
        const error = new Error(
          `Username '${cleanUsername}' is already in use by another user`,
        );
        error.code = "DUPLICATE_USERNAME";
        throw error;
      }
    }

    const updateData = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined && name !== null) {
      updateData.name = String(name).trim();
    }

    if (email !== undefined && email !== null) {
      updateData.email = String(email).trim().toLowerCase();
    }

    if (role !== undefined && role !== null) {
      updateData.role = String(role).trim();
    }

    if (username !== undefined && username !== null) {
      updateData.username = String(username).trim();
    }

    await docRef.update(updateData);

    const updatedSnap = await docRef.get();
    return formatUser(updatedSnap);
  } catch (error) {
    console.error("Error in editUser:", error);
    throw error;
  }
}

module.exports = {
  getUserByUsername,
  getUserByEmail,
  getAllUsers,
  createUser,
  editUser,
  resetPassword,
  generateUserResetCode,
  formatUser,
};
