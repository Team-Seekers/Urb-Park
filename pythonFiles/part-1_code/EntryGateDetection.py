import easyocr
import cv2
import time
import serial
import firebase_admin
from firebase_admin import credentials, firestore

# ---------------- Firebase Initialization ----------------
cred = credentials.Certificate(
    r"D:/URB_PARK/urban-park-d8825-firebase-adminsdk-fbsvc-10217ee984.json"
)
firebase_admin.initialize_app(cred)
db = firestore.client()

# ---------------- EasyOCR Initialization ----------------
reader = easyocr.Reader(['en'], gpu=True)

# ---------------- Camera Setup ----------------
vs = cv2.VideoCapture(2, cv2.CAP_DSHOW)
vs.set(10,50)

# Warm up camera (grab a few frames to remove startup lag)
for _ in range(10):
    vs.read()

n = 0
PText = ""
Text = ""

# ---------------- Live Plate Detection ----------------
while True:
    Text = ""
    ret, image = vs.read()
    if not ret:
        print("Failed to capture frame")
        break

    results = reader.readtext(image)
    for res in results:
        bbox, txt, conf = res
        if conf > 0.5 and txt.strip() != "":
            (x1, y1) = bbox[0]
            (x2, y2) = bbox[2]  # bottom-right

            # Draw bounding box and text
            cv2.rectangle(image, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            cv2.putText(image, txt, (int(x1), int(y1) - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

            # Keep only alphanumeric
            filtered = "".join([c for c in txt if c.isalnum()])
            Text = Text + " " + filtered

    # Plate stability check
    if PText == Text and len(Text.strip()) > 7:
        n += 1
    elif len(Text.strip()) > 7:
        n = 0

    if n > 0:
        done = True

    if len(Text.strip()) > 7:
        PText = Text

    cv2.imshow("Live Plate Detection (EasyOCR)", image)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

vs.release()
cv2.destroyAllWindows()

# ---------------- Final Detected Plate ----------------
detected_plate = Text.strip().replace(" ", "").upper()
print("Detected Plate:", detected_plate)

# ---------------- Firestore Verification ----------------
try:
    # Get the parking lot document
    lot_doc = db.collection("parkingAreas").document("delhilot").get()

    if not lot_doc.exists:
        print("Parking lot document not found")
    else:
        data = lot_doc.to_dict()
        found = False

        slots = data.get("slots", [])
        for idx, slot_data in enumerate(slots, start=1):
            bookings = slot_data.get("bookings", [])
            if isinstance(bookings, list):
                for booking in bookings:
                    if isinstance(booking, dict) and booking.get("status") == "active":
                        vehicle_number = booking.get("vehicleNumber")
                        if detected_plate == vehicle_number.upper():
                            found = True
                            break
                if found:
                    break

        if found:
            print("Plate Verified:", detected_plate)
            try:
                arduino = serial.Serial("COM4", 9600, timeout=1)
                time.sleep(2)
                arduino.write(b"OPEN_ENTRANCE\n")
                print("Gate Opened… Waiting for IR to close")

                while True:
                    raw = arduino.readline()
                    try:
                        line = raw.decode("utf-8", errors="ignore").strip()
                    except UnicodeDecodeError:
                        line = ""

                    if line == "IR_DETECTED":
                        print("IR Triggered: Closing Gate")
                        arduino.write(b"CLOSE_ENTRANCE\n")
                        break

                arduino.close()
            except Exception as e:
                print("Error communicating with Arduino:", e)
        else:
            print("Plate not found in active bookings")

except Exception as firebase_error:
    print("Firebase Firestore error:", firebase_error)
