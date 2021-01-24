const { response } = require("express");
const { db } = require("../utils/admin");
const FieldValue = require('firebase-admin').firestore.FieldValue;

exports.getPatients = (request, response) => {

    const dateString = getDateString();

    const dateRef = db.collection("root").doc(dateString).collection("patients");

    dateRef
        .orderBy("qNumber")
        .get()
        .then((data) => {
            let patients = [];
            data.forEach((doc) => {
                patients.push({
                    id: doc.id,
                    name: doc.data().name,
                    phoneNumber: doc.data().phoneNumber,
                    qNumber: doc.data().qNumber,
                    status: doc.data().status
                })
            });
            return response.json(patients);
        })
        .catch((err) => {
            console.log(err);
            return response.status(500).json({ error: err.code });
        });
}

exports.newPatient = async (request, response) => {

    if (request.body.name.trim() === "" ||
        request.body.phoneNumber.trim() === "") {
        return response.status(400).json({ body: "Must not be empty! " });
    }

    const dateString = getDateString();
    const dateRef = db.collection("root").doc(dateString);
    const collRef = dateRef.collection("patients");

    const qDoc = await dateRef.get("patientsProcessed");
    const qNumber = qDoc.data().patientsProcessed;

    const newUser = {
        name: request.body.name,
        phoneNumber: request.body.phoneNumber,
        qNumber: qNumber + 1,
        status: "waiting",
        checkInTime: FieldValue.serverTimestamp()
    };

    collRef
        .add(newUser)
        .then((doc) => {
            const responseUser = newUser;
            responseUser.id = doc.id;
            return response.json(responseUser);
        })
        .catch((err) => {
            console.log(err);
            return response.status(500).json({ error: "Something went wrong!" });
        });

    return response.send(200, { message: 'Success!' });
}

exports.updatePatientStatus = (request, response) => {
    console.log(request.body.id);
    if (request.body.id === "" || request.body.status === "") {
        return response.status(400).json({ body: "Must not be empty! " });
    }

    const dateString = getDateString();
    db
        .collection("root")
        .doc(dateString)
        .collection("patients").doc(request.body.id)
        .update({
            status: request.body.status
        })
        .catch((err) => {
            console.log(err);
            return response.status(500).json({ error: "Something went wrong!" });
        });

    return response.send(200, { message: 'Success!' });

}

exports.addTrigger = (change) => {
    const dateString = getDateString();
    let docRef = db.collection("root").doc(dateString);


    if (!change.before.exists) {
        // New document Created : add one to count
        docRef.update({ patientsProcessed: FieldValue.increment(1) });

    } else if (change.before.exists && change.after.exists) {
        // Updating existing document : Do nothing

    } else if (!change.after.exists) {
        // Deleting document : subtract one from count
        docRef.update({ patientsProcessed: FieldValue.increment(-1) });

    }

    return 1;
}

function getDateString() {
    const currentDate = new Date();
    const dateString = currentDate.getDate() +
        String(currentDate.getMonth() + 1) +
        currentDate.getFullYear();
    return dateString;
}