import cv2
import json
import easyocr
import re
import firebase_admin
from firebase_admin import credentials, firestore
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import time
from datetime import datetime
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def send_notification_to_backend(message):
    try:
        res = requests.post(
            "http://localhost:3000/api/notify",
            json={"message": message}
        )
        if res.status_code == 200:
            print("Notification sent successfully")
        else:
            print("Failed to send notification:", res.text)
    except Exception as e:
        print("Error sending notification:", e)

# ===== EMAIL CONFIGURATION =====
EMAIL_CONFIG = {
    'smtp_server': os.getenv('EMAIL_HOST', 'smtp.gmail.com'),  # Change based on your email provider
    'smtp_port': int(os.getenv('EMAIL_PORT', '587')),
    'sender_email': os.getenv('EMAIL_USER', 'urbparkticketing@gmail.com'),  # Your email
    'sender_password': os.getenv('EMAIL_PASSWORD', 'venn lnpt wriu jqem'),  # Use app password for Gmail
}

def send_email(to_email, subject, body, html_body=None):
    """Send email notification to user"""
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_CONFIG['sender_email']
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Add plain text part
        text_part = MIMEText(body, 'plain')
        msg.attach(text_part)
        
        # Add HTML part if provided
        if html_body:
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
        
        # Send email
        server = smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port'])
        server.starttls()
        server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])
        server.send_message(msg)
        server.quit()
        
        print(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        return False

def get_user_email_from_firestore(vehicle_number):
    """Fetch user email from Firestore based on vehicle number"""
    try:
        # First, try to find in active bookings
        doc_ref = db.collection("parkingAreas").stream
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            slots = data.get("slots", [])
            
            for slot_data in slots:
                bookings = slot_data.get("bookings", [])
                if isinstance(bookings, list):
                    for booking in bookings:
                        if (isinstance(booking, dict) and 
                            booking.get("status") == "active" and
                            booking.get("vehicleNumber", "").upper() == vehicle_number.upper()):
                            email = booking.get("email")
                            if email:
                                print(f"Found email in bookings for {vehicle_number}: {email}")
                                return email
        
        # If not found in bookings, try the master vehicles collection
        try:
            vehicle_ref = db.collection("vehicles").document(vehicle_number.upper())
            vehicle_doc = vehicle_ref.get()
            
            if vehicle_doc.exists:
                vehicle_data = vehicle_doc.to_dict()
                email = vehicle_data.get("email")
                if email:
                    print(f"Found email in vehicles collection for {vehicle_number}: {email}")
                    return email
        except Exception as e:
            print(f"Error checking vehicles collection: {e}")
            
    except Exception as e:
        print(f"Error fetching user email for {vehicle_number}: {e}")
        
    return None
        
def find_correct_slot_for_vehicle(vehicle_number):
    """Find which slot this vehicle should be parked in"""
    try:
        doc_ref = db.collection("parkingAreas").document("delhilot")
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            slots = data.get("slots", [])
            
            for idx, slot_data in enumerate(slots, start=1):
                bookings = slot_data.get("bookings", [])
                if isinstance(bookings, list):
                    for booking in bookings:
                        if (isinstance(booking, dict) and 
                            booking.get("status") == "active" and
                            booking.get("vehicleNumber", "").upper() == vehicle_number.upper()):
                            return idx  # Return the correct slot number
        return None
        
    except Exception as e:
        print(f"Error finding correct slot for {vehicle_number}: {e}")
        return None

def create_email_templates(slot_number, detected_vehicle, expected_vehicle=None, status_type="correct", booked_slot=None):
    """Create email templates for different parking scenarios"""
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if status_type == "correct":
        subject = "✅ Parking Confirmation - Correct Spot"
        plain_body = f"""
Dear Customer,

Your vehicle {detected_vehicle} has been successfully parked in the correct spot (Slot {slot_number}).

Parking Details:
- Vehicle Number: {detected_vehicle}
- Slot Number: {slot_number}
- Time: {current_time}
- Status: Correctly Parked ✅

Thank you for using our smart parking system!

Best regards,
Urban Park Management Team
        """
        
        html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5;">
    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #28a745; text-align: center;">✅ Parking Confirmation</h2>
        <p>Dear Customer,</p>
        <p>Your vehicle <strong>{detected_vehicle}</strong> has been successfully parked in the correct spot.</p>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #155724; margin: 0;">Parking Details:</h3>
            <ul style="margin: 10px 0;">
                <li><strong>Vehicle Number:</strong> {detected_vehicle}</li>
                <li><strong>Slot Number:</strong> {slot_number}</li>
                <li><strong>Time:</strong> {current_time}</li>
                <li><strong>Status:</strong> <span style="color: #28a745;">Correctly Parked ✅</span></li>
            </ul>
        </div>
        
        <p>Thank you for using our smart parking system!</p>
        <p style="color: #666;">Best regards,<br>Urban Park Management Team</p>
    </div>
</body>
</html>
        """
        
    elif status_type == "wrong":
        # Determine the message based on whether we found their booked slot
        if booked_slot:
            wrong_parking_msg = f"You have booked Slot {booked_slot} but parked in Slot {slot_number}"
            action_msg = f"Please move your vehicle from Slot {slot_number} to your booked Slot {booked_slot} immediately."
        else:
            wrong_parking_msg = f"You are parked in Slot {slot_number} which is not your booked slot"
            action_msg = "Please check your booking and move to your correct assigned slot immediately."
        
        subject = "🚨 Wrong Parking Alert - Please Move Your Vehicle"
        plain_body = f"""
Dear Customer,

URGENT ALERT: {wrong_parking_msg}!

Parking Details:
- Your Vehicle Number: {detected_vehicle}
- Currently Parked In: Slot {slot_number}
- Your Booked Slot: {booked_slot if booked_slot else 'Please check your booking'}
- This slot (Slot {slot_number}) is reserved for: {expected_vehicle}
- Time: {current_time}
- Status: Wrong Parking ❌

IMMEDIATE ACTION REQUIRED:
{action_msg}

Failure to move your vehicle may result in:
- Parking penalties
- Towing charges  
- Inconvenience to other customers

Please relocate your vehicle immediately or contact parking management for assistance.

If you believe this is an error, please contact our support team immediately.

Best regards,
Urban Park Management Team
Phone: +1-XXX-XXX-XXXX
        """
        
        html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5;">
    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #dc3545; text-align: center;">🚨 Wrong Parking Alert</h2>
        <p>Dear Customer,</p>
        <p><strong style="color: #dc3545;">URGENT ALERT:</strong> {wrong_parking_msg}!</p>
        
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="color: #721c24; margin: 0;">Parking Details:</h3>
            <ul style="margin: 10px 0;">
                <li><strong>Your Vehicle Number:</strong> {detected_vehicle}</li>
                <li><strong>Currently Parked In:</strong> Slot {slot_number}</li>
                <li><strong>Your Booked Slot:</strong> {booked_slot if booked_slot else 'Please check your booking'}</li>
                <li><strong>Slot {slot_number} is reserved for:</strong> {expected_vehicle}</li>
                <li><strong>Time:</strong> {current_time}</li>
                <li><strong>Status:</strong> <span style="color: #dc3545;">Wrong Parking ❌</span></li>
            </ul>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #856404; margin: 0;">IMMEDIATE ACTION REQUIRED:</h3>
            <p style="margin: 10px 0; color: #856404;">
                {action_msg}
            </p>
            <p style="margin: 10px 0; color: #856404;">
                Failure to move your vehicle may result in:
            </p>
            <ul style="color: #856404; margin: 10px 0;">
                <li>Parking penalties</li>
                <li>Towing charges</li>
                <li>Inconvenience to other customers</li>
            </ul>
        </div>
        
        <p>Please relocate your vehicle immediately or contact parking management for assistance.</p>
        <p><em>If you believe this is an error, please contact our support team immediately.</em></p>
        
        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Need Help?</strong><br>
            📞 +1-XXX-XXX-XXXX</p>
        </div>
        
        <p style="color: #666;">Best regards,<br>Urban Park Management Team</p>
    </div>
</body>
</html>
        """
    
    return subject, plain_body, html_body

# ===== FIREBASE CONNECTION =====
# ---------------- Firebase Initialization ----------------
cred = credentials.Certificate(
    os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', r"D:/URB_PARK/urban-park-d8825-firebase-adminsdk-fbsvc-10217ee984.json")
)
firebase_admin.initialize_app(cred)
db = firestore.client()

# ===== LOAD ROI JSON =====
with open("rois.json", "r") as f:
    rois_data = json.load(f)

rois = [tuple(slot["coords"]) for slot in rois_data]

# ===== GET EXPECTED PLATES FROM FIRESTORE =====
def fetch_expected_plates():
    doc_ref = db.collection("parkingAreas").document("delhilot")
    doc = doc_ref.get()
    expected = {}

    if doc.exists:
        data = doc.to_dict()
        slots = data.get("slots", [])

        for idx, slot_data in enumerate(slots, start=1):
            bookings = slot_data.get("bookings", [])
            if isinstance(bookings, list):
                for booking in bookings:
                    if isinstance(booking, dict) and booking.get("status") == "active":
                        vehicle_number = booking.get("vehicleNumber")
                        if vehicle_number:
                            expected[idx] = vehicle_number.upper()
    return expected

# ===== EASYOCR SETUP =====
ocr_reader = easyocr.Reader(['en'], gpu=True)

def clean_plate_text(text):
    # Remove all non-alphanumeric characters and convert to uppercase
    cleaned = re.sub(r'[^A-Z0-9]', '', text.upper())
    return cleaned

def recognize_plate(cropped):
    try:
        ocr_results = ocr_reader.readtext(cropped)
        
        if not ocr_results:
            return ""
        
        # If multiple detections, combine them (sort by x-coordinate left to right)
        if len(ocr_results) > 1:
            # Sort by x-coordinate (left to right)
            sorted_results = sorted(ocr_results, key=lambda x: x[0][0][0])
            combined_text = ""
            
            print(f"OCR found {len(ocr_results)} text regions:")
            for i, detection in enumerate(sorted_results):
                text = detection[1]
                confidence = detection[2]
                print(f"  Region {i+1}: '{text}' (confidence: {confidence:.2f})")
                if confidence > 0.3:  # Include if confidence is reasonable
                    combined_text += text
            
            if combined_text:
                cleaned = clean_plate_text(combined_text)
                print(f"Combined OCR result: '{combined_text}' -> cleaned: '{cleaned}'")
                return cleaned
        
        # Single detection
        else:
            text = ocr_results[0][1]
            confidence = ocr_results[0][2]
            cleaned = clean_plate_text(text)
            print(f"Single OCR result: '{text}' -> cleaned: '{cleaned}' (confidence: {confidence:.2f})")
            return cleaned
            
        return ""
        
    except Exception as e:
        print(f"OCR Error: {e}")
        return ""

# ===== IMPROVED EMAIL TRACKING =====
email_sent_log = {}  # Track sent emails per vehicle per slot
last_parking_status = {}  # Track the last known status for each slot

def should_send_email(vehicle_number, slot_number, status_type):
    """
    Check if email should be sent for this specific vehicle and scenario.
    Returns True only if this is a new parking event or status change.
    """
    # Create unique keys for tracking
    email_key = f"{vehicle_number}{slot_number}{status_type}"
    status_key = f"{slot_number}"
    
    # Check if we already sent this type of email for this vehicle in this slot
    if email_key in email_sent_log:
        print(f"Email already sent for {vehicle_number} in slot {slot_number} ({status_type})")
        return False
    
    # For correct parking: only send if this is a new correct placement
    if status_type == "correct":
        # Check if this slot's status has changed to correct
        if status_key in last_parking_status:
            last_status = last_parking_status[status_key]
            if last_status.get("vehicle") == vehicle_number and last_status.get("status") == "correct":
                # Same vehicle, same correct status - don't send again
                return False
        
        # Mark this email as sent
        email_sent_log[email_key] = time.time()
        last_parking_status[status_key] = {"vehicle": vehicle_number, "status": "correct"}
        return True
    
    # For wrong parking: only send once per vehicle per slot
    elif status_type == "wrong":
        # Mark this email as sent
        email_sent_log[email_key] = time.time()
        last_parking_status[status_key] = {"vehicle": vehicle_number, "status": "wrong"}
        return True
    
    return False

def reset_slot_status(slot_number):
    """Reset tracking for a slot when it becomes empty"""
    status_key = f"{slot_number}"
    if status_key in last_parking_status:
        del last_parking_status[status_key]
    
    # Also clean up related email logs for this slot
    keys_to_remove = []
    for email_key in email_sent_log.keys():
        if f"{slot_number}" in email_key:
            keys_to_remove.append(email_key)
    
    for key in keys_to_remove:
        del email_sent_log[key]
    
    print(f"Reset tracking for slot {slot_number}")

def graceful_exit(message="Program terminated"):
    """Clean up resources and exit gracefully"""
    print(f"\n{message}")
    cap.release()
    cv2.destroyAllWindows()
    print("Camera released and windows closed.")
    sys.exit(0)

# ===== MAIN CAMERA LOOP =====
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Error: Camera not accessible")
    exit()

# Fetch expected plates
expected_plates = fetch_expected_plates()
print("Expected plates loaded:", expected_plates)
print("Monitoring parking continuously... Press 'q' to quit")

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        for idx, (x, y, w, h) in enumerate(rois, start=1):
            cropped_roi = frame[y:y+h, x:x+w]
            plate = recognize_plate(cropped_roi)
            expected = expected_plates.get(idx)

            if expected:  # Only care about booked slots
                if plate:
                    if plate == expected:
                        slot_status = "Correct Parking"
                        color = (0, 255, 0)
                        
                        # Send correct parking email (only once)
                        if should_send_email(plate, idx, "correct"):
                            user_email = get_user_email_from_firestore(plate)
                            if user_email:
                                subject, plain_body, html_body = create_email_templates(idx, plate, None, "correct")
                                email_sent = send_email(user_email, subject, plain_body, html_body)
                                
                                if email_sent:
                                    print(f"✅ SUCCESS: Vehicle {plate} parked correctly in slot {idx}")
                                    print(f"✅ Confirmation email sent to: {user_email}")
                                    print("🎉 Continuing to monitor parking...")
                            
                    else:
                        slot_status = f"Wrong Parking ({plate})"
                        color = (0, 0, 255)
                        
                        # Send wrong parking alert (only once per vehicle per slot)
                        if should_send_email(plate, idx, "wrong"):
                            print(f"Wrong parking detected: {plate} in slot {idx} (expected: {expected})")
                            
                            # Find which slot this vehicle actually booked
                            booked_slot = find_correct_slot_for_vehicle(plate)
                            print(f"Vehicle {plate} actually booked slot: {booked_slot}")
                            
                            # Try to get email for the person who parked in the wrong spot
                            user_email = get_user_email_from_firestore(plate)
                            print(f"Email found for {plate}: {user_email}")
                            
                            if user_email:
                                subject, plain_body, html_body = create_email_templates(
                                    idx, plate, expected, "wrong", booked_slot
                                )
                                send_email(user_email, subject, plain_body, html_body)
                                
                                if booked_slot:
                                    print(f"✅ Wrong parking alert sent to driver: {user_email} (vehicle: {plate}, booked slot: {booked_slot}, parked in: {idx})")
                                else:
                                    print(f"✅ Wrong parking alert sent to driver: {user_email} (vehicle: {plate}, parked in: {idx})")
                            else:
                                print(f"❌ No email found for wrong parker (vehicle: {plate})")
                                print(f"Vehicle {plate} is not registered in the system - cannot send email alert")
                                
                                # Log the incident but don't send emails to other people
                                print(f"🚨 SECURITY LOG: Unregistered vehicle {plate} in slot {idx} (reserved for {expected})")
                                
                else:
                    slot_status = "Booked but Empty"
                    color = (0, 165, 255)
                    # Reset tracking when slot becomes empty
                    reset_slot_status(idx)
            else:
                slot_status = ""
                color = (200, 200, 200)

            # Draw ROI and status
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            if slot_status:
                cv2.putText(frame, slot_status, (x+5, y-5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        cv2.imshow("Smart Parking System", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            graceful_exit("Program terminated by user (pressed 'q')")

except KeyboardInterrupt:
    graceful_exit("Program interrupted by user (Ctrl+C)")
except Exception as e:
    print(f"An error occurred: {e}")
    graceful_exit(f"Program terminated due to error: {e}")

# This should never be reached, but just in case
graceful_exit("Program ended unexpectedly")