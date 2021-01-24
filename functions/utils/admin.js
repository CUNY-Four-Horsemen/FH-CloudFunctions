const admin = require("firebase-admin");
const { service } = require("firebase-functions/lib/providers/analytics");

admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

module.exports = { admin, db };