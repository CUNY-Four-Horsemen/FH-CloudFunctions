const functions = require('firebase-functions');
const express = require('express');

const cors = require('cors');

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

const { getPatients, getAverageWaitingTime, newPatient, updatePatientStatus, addTrigger } = require("./API/patients")

app.get("/getWaiting", getAverageWaitingTime);

app.post("/patients", getPatients);
app.post("/newPatient", newPatient);
app.post("/updatePatientStatus", updatePatientStatus);

exports.api = functions.https.onRequest(app);

// Utility to avoid calling all documents and getting its size
exports.queueListener =
    functions.firestore.document('root/{dateString}/{patientCollection}/{patientID}')
        .onWrite((change, context) => addTrigger(change));