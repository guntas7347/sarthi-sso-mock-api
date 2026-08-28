const { db } = require("../src/lib/firebase");
const bcrypt = require("bcryptjs");

const sampleUsers = [
  {
    username: "admin_user",
    email: "admin@example.com",
    password: "Password@123", // Will be bcrypt-hashed below
    totpKey: "JBSWY3DPEHPK3PXP", // ASCII: Hello!
    role: "admin",
    otherdata: {
      firstName: "John",
      lastName: "Doe",
      department: "Security",
      status: "active",
      location: "San Francisco"
    }
  },
  {
    username: "jane_doe",
    email: "jane.doe@example.com",
    password: "password123", // Will be bcrypt-hashed below
    totpKey: "KVKVE43VNFZG6ZTD", // ASCII: sarthisecret
    role: "user",
    otherdata: {
      firstName: "Jane",
      lastName: "Doe",
      department: "Engineering",
      status: "active",
      location: "New York"
    }
  },
  {
    username: "bob_smith",
    email: "bob.smith@example.com",
    password: "password456", // Will be bcrypt-hashed below
    totpKey: "MJSXA3DPEHPK3PXP",
    role: "user",
    otherdata: {
      firstName: "Bob",
      lastName: "Smith",
      department: "Marketing",
      status: "active",
      location: "London"
    }
  },
  {
    username: "alice_jones",
    email: "alice.jones@example.com",
    password: "securepassword789", // Will be bcrypt-hashed below
    totpKey: "ONSG6ZDPEHPK3PXP",
    role: "editor",
    otherdata: {
      firstName: "Alice",
      lastName: "Jones",
      department: "Content",
      status: "active",
      location: "Toronto"
    }
  },
  {
    username: "plain_tester",
    email: "plain@example.com",
    password: "plainpassword123", // Plaintext password to test fallback logic
    isPlain: true, 
    totpKey: "NBSWY3DPEHPK3PXP",
    role: "tester",
    otherdata: {
      firstName: "Plain",
      lastName: "Tester",
      notes: "This user has a plaintext password stored in Firestore to test fallback compatibility."
    }
  },
  {
    username: "manager_mark",
    email: "mark.manager@example.com",
    password: "managerpass123", // Will be bcrypt-hashed below
    totpKey: "ORSXG5BPEHPK3PXP",
    role: "manager",
    otherdata: {
      firstName: "Mark",
      lastName: "Johnson",
      department: "Operations",
      status: "active",
      location: "Sydney"
    }
  },
  {
    username: "guest_visitor",
    email: "guest@example.com",
    password: "guestpassword", // Will be bcrypt-hashed below
    totpKey: "OTSXGZDPEHPK3PXP",
    role: "guest",
    otherdata: {
      firstName: "Guest",
      lastName: "Visitor",
      notes: "Temporary guest access"
    }
  },
  {
    username: "support_tech",
    email: "support@example.com",
    password: "supportpass999", // Will be bcrypt-hashed below
    totpKey: "PNSWG6ZDPEHPK3PXP",
    role: "support",
    otherdata: {
      firstName: "Sam",
      lastName: "Wilson",
      department: "Support",
      status: "active",
      location: "Bangalore"
    }
  },
  {
    username: "audit_officer",
    email: "audit@example.com",
    password: "auditpassword1", // Will be bcrypt-hashed below
    totpKey: "QJSXAZDPEHPK3PXP",
    role: "auditor",
    otherdata: {
      firstName: "Arthur",
      lastName: "Pendelton",
      department: "Compliance",
      status: "active",
      location: "Berlin"
    }
  },
  {
    username: "developer_dan",
    email: "dan.dev@example.com",
    password: "devpassword2026", // Will be bcrypt-hashed below
    totpKey: "RJSXAZDPEHPK3PXP",
    role: "developer",
    otherdata: {
      firstName: "Daniel",
      lastName: "Miller",
      department: "Engineering",
      status: "active",
      location: "Tokyo"
    }
  }
];

async function seed() {
  console.log("Starting Firestore seed process for 10 sample users...");
  try {
    const usersCollection = db.collection("users");

    for (const user of sampleUsers) {
      // 1. Prepare password (hash it unless it is marked as plain)
      let finalPassword = user.password;
      if (!user.isPlain) {
        finalPassword = bcrypt.hashSync(user.password, 10);
      }

      // 2. Prepare user document data
      const userDoc = {
        username: user.username,
        email: user.email,
        password: finalPassword,
        totpKey: user.totpKey,
        role: user.role,
        otherdata: user.otherdata,
        createdAt: new Date().toISOString()
      };

      // 3. Save to Firestore (using username as document ID or auto-generated, let's use username to avoid duplicates)
      await usersCollection.doc(user.username).set(userDoc);
      console.log(`Successfully seeded user: ${user.username} (Password type: ${user.isPlain ? "Plain" : "Bcrypt"})`);
    }

    console.log("\nAll 10 sample users successfully seeded into Firestore!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
}

seed();
