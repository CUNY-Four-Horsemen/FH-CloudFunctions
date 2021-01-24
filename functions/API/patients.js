const { response } = require("express");
const { db } = require("../utils/admin");
const FieldValue = require('firebase-admin').firestore.FieldValue;

exports.getPatients = (request, response) => {

    if (!request.body.dateString) {
        return response.status(400).json({ body: "Must not be empty! " });
    }

    const dateString = request.body.dateString;
    const patRef = db.collection("root").doc(dateString).collection("patients");

    patRef
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
                    status: doc.data().status,
                    checkInTime: doc.data().checkInTime,
                    lastUpdate: doc.data().lastUpdate
                })
            });
            return response.json(patients);
        })
        .catch((err) => {
            console.log(err);
            return response.status(500).json({ error: err.code });
        });
}

exports.getAverageWaitingTime = async (request, response) => {
    const dateString = getDateString();
    let dayRef = db.collection("root").doc(dateString);

    let waitingRef = await dayRef.get("waitingTime");
    let totalWaitingTime = waitingRef.data().waitingTime;

    let servedRef = await dayRef.get("patientsServed");
    let totalServedPatients = servedRef.data().patientsServed;

    let averageWaitingTime = totalWaitingTime / totalServedPatients;

    return response.status(200).json({ averageWaitingTime: averageWaitingTime });
}

exports.newPatient = async (request, response) => {

    if (request.body.name.trim() === "" ||
        request.body.phoneNumber.trim() === "") {
        return response.status(400).json({ body: "Must not be empty! " });
    }

    const dateString = getDateString();
    const dayRef = db.collection("root").doc(dateString);
    const patRef = dayRef.collection("patients");

    let qDoc;
    let qNumber;
    try {
        qDoc = await dayRef.get("patientsProcessed");
        qNumber = qDoc.data().patientsProcessed;
    } catch (err) {
        qNumber = 0;
        dayRef.set({ patientsProcessed: qNumber });
    }

    const newUser = {
        name: request.body.name,
        phoneNumber: request.body.phoneNumber,
        qNumber: qNumber + 1,
        status: "waiting",
        checkInTime: FieldValue.serverTimestamp(),
        lastUpdate: FieldValue.serverTimestamp()
    };

    patRef
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
}

exports.updatePatientStatus = async (request, response) => {
    if (request.body.id === "" || request.body.status === "") {
        return response.status(400).json({ body: "Must not be empty! " });
    }

    const dateString = getDateString();
    const dayRef = db.collection("root").doc(dateString);
    const docRef = dayRef.collection("patients").doc(request.body.id);

    let updateData;
    if (request.body.status === "inside") {
        updateData = {
            status: request.body.status,
            lastUpdate: FieldValue.serverTimestamp(),
            serviceTime: FieldValue.serverTimestamp()
        }
        const docData = await docRef.get();
        let diffMilli = new Date() - new Date(1000 * docData.data().checkInTime["_seconds"]);
        let diffMin = Math.round(diffMilli / (1000 * 60));

        dayRef.update({
            waitingTime: FieldValue.increment(diffMin)
        }).catch((err) => {
            console.log(err);
            return response.status(500).json({ error: "Something went wrong!" });
        });

        try {
            sDoc = await dayRef.update({ "patientsServed": FieldValue.increment(1) });
        } catch (err) {
            dayRef.set({ patientsProcessed: FieldValue.increment(1) });
        }

    } else {
        updateData = {
            status: request.body.status,
            lastUpdate: FieldValue.serverTimestamp()
        }
    }

    docRef
        .update(updateData)
        .catch((err) => {
            console.log(err);
            return response.status(500).json({ error: "Something went wrong!" });
        });


    return response.send(200, { message: 'Success!' });

}

exports.addTrigger = (change) => {
    const dateString = getDateString();
    let dayRef = db.collection("root").doc(dateString);


    if (!change.before.exists) {
        // New document Created : add one to count
        dayRef.update({ patientsProcessed: FieldValue.increment(1) });

    } else if (change.before.exists && change.after.exists) {
        // Updating existing document : Do nothing

    } else if (!change.after.exists) {
        // Deleting document : subtract one from count
        dayRef.update({ patientsProcessed: FieldValue.increment(-1) });

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