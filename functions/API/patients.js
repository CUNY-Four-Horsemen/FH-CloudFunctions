const { response } = require("express");
const { db } = require("../utils/admin");
const FieldValue = require('firebase-admin').firestore.FieldValue;

exports.getPatients = (request, response) => {

    const dateString = getDateString();

    const dateRef = db.collection("root").doc(dateString).collection("patients");

    dateRef
        // .orderBy("qNumber")
        .get()
        .then((data) => {
            let patients = [];
            data.forEach((doc) => {
                patients.push({
                    firstName: doc.data().firstName,
                    lastName: doc.data().lastName,
                    phoneNumber: doc.data().phoneNumber,
                    qNumber: doc.data().qNumber
                })
            });
            return response.json(patients);
        })
        .catch((err) => {
            console.log(err);
            return response.status(500).json({ error: err.code });
        });
}

exports.addToQueue = (request, response) => {

    if (request.body.firstName.trim() === "" ||
        request.body.lastName.trim() === "" ||
        request.body.phoneNumber.trim() === "") {
        return response.status(400).json({ body: "Must not be empty! " });
    }

    const dateString = getDateString();

    const dateRef = db.collection("root").doc(dateString).collection("patients");

    const newUser = {
        firstName: request.body.firstName,
        lastName: request.body.lastName,
        phoneNumber: request.body.phoneNumber,
    };

    dateRef
        .add(newUser)
        .then((doc) => {
            const responseUser = newUser;
            responseUser.id = doc.id;
            return response.json(responseUser);
        })
        .catch((err) => {
            response.status(500).json({ error: "Something went wrong!" });
            console.log(err);
        });
}

exports.addTrigger = (change) => {
    const dateString = getDateString();
    let docRef = db.collection("root").doc(dateString);


    if (!change.before.exists) {
        // New document Created : add one to count
        try {
            docRef.update({ patientsProcessed: FieldValue.increment(1) });
        } catch (error) {
            docRef.set({ patientsProcessed: 1 });
        }

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