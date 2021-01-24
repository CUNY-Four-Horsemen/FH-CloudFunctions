const functions = require('firebase-functions');
const app = require('express')();

const { getPatients, addToQueue, addTrigger } = require("./API/patients")

app.get("/patients", getPatients);
app.post("/addToQueue", addToQueue);

exports.api = functions.https.onRequest(app);

// Utility to avoid calling all documents and getting its size
exports.queueListener =
    functions.firestore.document('root/{dateString}/{patientCollection}/{patientID}')
        .onWrite((change, context) => addTrigger(change));