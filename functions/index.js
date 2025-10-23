const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

admin.initializeApp();
const db = admin.firestore();

exports.checkAvailability = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // *** START LOGGING ***
    console.log("Received checkAvailability request. Body Data:", JSON.stringify(req.body.data, null, 2));
    // *** END LOGGING ***

    const { technicianName, proposedStartTime, newServiceDuration } = req.body.data;

    try {
        if (!technicianName || !proposedStartTime || newServiceDuration == null) { // Check for null duration too
           console.error("Missing required data:", req.body.data);
           res.status(400).send({ error: { message: "Missing required data (technicianName, proposedStartTime, newServiceDuration)." } });
           return;
        }

        const proposedStartDate = new Date(proposedStartTime);
        if (isNaN(proposedStartDate.getTime())) { // Check for invalid date
            console.error("Invalid proposedStartTime received:", proposedStartTime);
            res.status(400).send({ error: { message: "Invalid proposed start time format." } });
            return;
        }


        // Fetch settings
        const settingsDoc = await db.collection("settings").doc("booking").get();
        const bookingSettings = settingsDoc.exists ? settingsDoc.data() : { bufferTime: 0, defaultDuration: 40 };
        const bufferTime = bookingSettings.bufferTime || 0; // Ensure bufferTime is a number
        const defaultDuration = bookingSettings.defaultDuration || 40; // Ensure defaultDuration is a number

        // Ensure newServiceDuration is a number
        const proposedDuration = parseInt(newServiceDuration, 10);
        if (isNaN(proposedDuration)) {
             console.error("Invalid newServiceDuration received:", newServiceDuration);
             res.status(400).send({ error: { message: "Invalid service duration format." } });
             return;
        }

        const proposedEndDate = new Date(proposedStartDate.getTime() + (proposedDuration + bufferTime) * 60000);

        // *** START LOGGING ***
        console.log(`Proposed Slot for ${technicianName}: ${proposedStartDate.toISOString()} to ${proposedEndDate.toISOString()} (Duration: ${proposedDuration} min, Buffer: ${bufferTime} min)`);
        // *** END LOGGING ***

        // Fetch all services once
        const servicesSnapshot = await db.collection("services").get();
        const allServicesList = [];
        servicesSnapshot.forEach(doc => {
            const categoryItems = doc.data().items || [];
            categoryItems.forEach(service => {
                if (service.name && service.price) {
                    const priceValue = parseFloat(String(service.price).replace(/[^0-9.]/g, ''));
                    if (!isNaN(priceValue)) {
                        allServicesList.push({
                            name: service.name,
                            duration: service.duration || defaultDuration // Use fetched default
                        });
                    }
                }
            });
        });
        // console.log("Fetched services list:", allServicesList); // Optional: log if needed


        // Fetch appointments for the specific technician
        const appointmentsRef = db.collection("appointments");
        const querySnapshot = await appointmentsRef
          .where("technician", "==", technicianName)
          // *** Optimization: Add a broad time filter to reduce documents read ***
          // Fetch appointments +/- 1 day from the proposed start date
          .where("appointmentTimestamp", ">=", admin.firestore.Timestamp.fromDate(new Date(proposedStartDate.getTime() - 24 * 60 * 60 * 1000)))
          .where("appointmentTimestamp", "<=", admin.firestore.Timestamp.fromDate(new Date(proposedStartDate.getTime() + 24 * 60 * 60 * 1000)))
          .get();

        // *** START LOGGING ***
        console.log(`Found ${querySnapshot.docs.length} existing appointments for ${technicianName} within +/- 1 day.`);
        // *** END LOGGING ***

        let conflictFound = false;
        let conflictMessage = "";

        for (const doc of querySnapshot.docs) {
          const appt = doc.data();

          if (!appt.appointmentTimestamp || typeof appt.appointmentTimestamp.toDate !== 'function') {
              console.warn(`Skipping appointment ${doc.id} due to invalid timestamp.`);
              continue;
          }
          const existingStartDate = appt.appointmentTimestamp.toDate();

          const serviceName = (Array.isArray(appt.services) ? appt.services[0] : appt.services).split(' $')[0].trim();
          const service = allServicesList.find(s => s.name === serviceName);
          const existingDuration = service ? (service.duration || defaultDuration) : defaultDuration; // Ensure duration calculation

          const existingEndDate = new Date(existingStartDate.getTime() + (existingDuration + bufferTime) * 60000);

          // *** START LOGGING ***
          console.log(`-- Comparing with existing: ${existingStartDate.toISOString()} to ${existingEndDate.toISOString()} (Service: ${serviceName}, Duration: ${existingDuration}, Buffer: ${bufferTime})`);
          // *** END LOGGING ***

          // Overlap check
          if (proposedStartDate < existingEndDate && proposedEndDate > existingStartDate) {
              conflictFound = true;
              conflictMessage = `${technicianName} is already booked from ${existingStartDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} to ${existingEndDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.`;
              // *** START LOGGING ***
              console.log(`-----> CONFLICT DETECTED! Message: ${conflictMessage}`);
              // *** END LOGGING ***
              break;
          } else {
              // *** START LOGGING ***
               console.log(`-----> No conflict with this appointment.`);
              // *** END LOGGING ***
          }
        }

        // Send response
        // *** START LOGGING ***
        console.log(`Final Result: available: ${!conflictFound}, message: "${conflictMessage}"`);
        // *** END LOGGING ***
        if (conflictFound) {
            res.status(200).send({ data: { available: false, message: conflictMessage } });
        } else {
            res.status(200).send({ data: { available: true, message: "" } }); // Send empty message on success
        }

    } catch (error) {
        console.error("Error in checkAvailability function:", error);
        res.status(500).send({ error: { message: "An internal server error occurred: " + error.message } });
    }
  });
});
