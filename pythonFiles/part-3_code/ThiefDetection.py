import cv2
import easyocr
import time
import serial
import firebase_admin
from firebase_admin import credentials, firestore
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading
from flask import Flask, request, render_template_string
import webbrowser
import uuid

# ---------------- Firebase Init ----------------
cred = credentials.Certificate(
    r"D:/URB_PARK/urban-park-d8825-firebase-adminsdk-fbsvc-10217ee984.json"
)
firebase_admin.initialize_app(cred)
db = firestore.client()

# ---------------- Email Configuration ----------------
# Configure these with your email settings
EMAIL_HOST = "smtp.gmail.com"  # For Gmail
EMAIL_PORT = 587
EMAIL_USER = "urbparkticketing@gmail.com"  # Your email
EMAIL_PASSWORD = "venn lnpt wriu jqem"  # Your app password (not regular password)

# ---------------- Flask App for Email Response ----------------
app = Flask("_name_")
pending_responses = {}  # Store pending email responses

@app.route('/exit-response/<token>/<response>')
def exit_response(token, response):
    if token in pending_responses:
        vehicle_number = pending_responses[token]['vehicle_number']
        
        # Process the response
        if response in ['yes', 'no']:
            pending_responses[token]['response'] = response
            pending_responses[token]['responded'] = True
            
            if response == 'yes':
                return render_template_string('''
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Exit Approved</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #e8f5e8; }
                        .container { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; border: 3px solid #4CAF50; }
                        .success-icon { font-size: 60px; color: #4CAF50; margin-bottom: 20px; }
                        .vehicle { color: #2196F3; font-weight: bold; font-size: 20px; margin: 20px 0; background-color: #f0f8ff; padding: 15px; border-radius: 8px; }
                        .message { font-size: 18px; color: #2e7d32; margin: 20px 0; }
                        .instructions { background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="success-icon">✅</div>
                        <h1 style="color: #4CAF50;">Exit Approved!</h1>
                        <div class="vehicle">Vehicle: {{ vehicle_number }}</div>
                        <div class="message">
                            <strong>Gate is opening now!</strong><br>
                            Please proceed to the exit gate.
                        </div>
                        <div class="instructions">
                            <h3>Next Steps:</h3>
                            <p>1. Drive slowly towards the exit gate</p>
                            <p>2. Wait for the gate to fully open</p>
                            <p>3. Pass through safely</p>
                            <p>4. Gate will close automatically</p>
                        </div>
                        <p style="color: #666; font-size: 14px;">
                            Thank you for using Urban Parking System!<br>
                            Safe travels! 🚗
                        </p>
                    </div>
                </body>
                </html>
                ''', vehicle_number=vehicle_number)
            else:  # response == 'no'
                return render_template_string('''
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Exit Denied</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #fce8e8; }
                        .container { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; border: 3px solid #f44336; }
                        .deny-icon { font-size: 60px; color: #f44336; margin-bottom: 20px; }
                        .vehicle { color: #2196F3; font-weight: bold; font-size: 20px; margin: 20px 0; background-color: #f0f8ff; padding: 15px; border-radius: 8px; }
                        .message { font-size: 18px; color: #c62828; margin: 20px 0; }
                        .contact-info { background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="deny-icon">❌</div>
                        <h1 style="color: #f44336;">Exit Denied</h1>
                        <div class="vehicle">Vehicle: {{ vehicle_number }}</div>
                        <div class="message">
                            <strong>Gate will remain closed.</strong><br>
                            The exit request has been denied.
                        </div>
                        <div class="contact-info">
                            <h3>Need Help?</h3>
                            <p>If this was an error or you need assistance:</p>
                            <p><strong>Contact Support:</strong><br>
                            📧 urbparkticketing@gmail.com<br>
                            📞 Support Hotline: [Your Phone Number]</p>
                        </div>
                        <p style="color: #666; font-size: 14px;">
                            Security is our priority. Thank you for your understanding.
                        </p>
                    </div>
                </body>
                </html>
                ''', vehicle_number=vehicle_number)
        else:
            return "Invalid response. Please use the buttons in your email."
    else:
        return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invalid Link</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f0f0f0; }
                .container { background: white; padding: 40px; border-radius: 15px; max-width: 500px; margin: 0 auto; }
                .warning-icon { font-size: 60px; color: #ff9800; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="warning-icon">⚠</div>
                <h2>Link Expired or Invalid</h2>
                <p>This confirmation link has expired or is invalid.</p>
                <p>If you need to exit, please try again or contact support.</p>
                <p><strong>Support:</strong> urbparkticketing@gmail.com</p>
            </div>
        </body>
        </html>
        ''')

# Keep the old route for backward compatibility
@app.route('/exit-confirmation/<token>')
def exit_confirmation(token):
    if token in pending_responses:
        vehicle_number = pending_responses[token]['vehicle_number']
        return render_template_string('''
        <!DOCTYPE html>
        <html>
        <head>
            <title>Exit Parking Confirmation</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f0f0f0; }
                .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
                .vehicle { color: #2196F3; font-weight: bold; font-size: 18px; margin: 20px 0; }
                button { padding: 15px 30px; margin: 10px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
                .yes-btn { background-color: #4CAF50; color: white; }
                .no-btn { background-color: #f44336; color: white; }
                .yes-btn:hover { background-color: #45a049; }
                .no-btn:hover { background-color: #da190b; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🚗 Exit Parking Confirmation</h2>
                <p>Vehicle Number:</p>
                <div class="vehicle">{{ vehicle_number }}</div>
                <p>Are you exiting the parking?</p>
                <div id="buttons">
                    <button class="yes-btn" onclick="window.location.href='/exit-response/{{ token }}/yes'">✓ Yes, Open Gate</button>
                    <button class="no-btn" onclick="window.location.href='/exit-response/{{ token }}/no'">✗ No, Keep Closed</button>
                </div>
            </div>
        </body>
        </html>
        ''', vehicle_number=vehicle_number, token=token)
    else:
        return "Invalid or expired confirmation link."

@app.route('/submit-response/<token>', methods=['POST'])
def submit_response(token):
    if token in pending_responses:
        response = request.json.get('response')
        pending_responses[token]['response'] = response
        pending_responses[token]['responded'] = True
        return {'status': 'success'}
    return {'status': 'error'}

def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False)

# Start Flask server in background thread
flask_thread = threading.Thread(target=run_flask, daemon=True)
flask_thread.start()
time.sleep(2)  # Give Flask time to start

# ---------------- EasyOCR Init ----------------
reader = easyocr.Reader(['en'], gpu=True)

# ---------------- Arduino Setup ----------------
arduino = None
try:
    arduino = serial.Serial("COM4", 9600, timeout=1)
    time.sleep(2)
    print("Combined Arduino connected (Entry + Exit Gates)")
except Exception as e:
    print("Arduino not connected:", e)

# ---------------- Debug Function to Print Firestore Structure ----------------
def debug_firestore_structure():
    try:
        print("🔍 Debug: Checking Firestore structure...")
        parking_areas = db.collection("parkingAreas").stream()
        
        for area in parking_areas:
            area_id = area.id
            area_data = area.to_dict()
            print(f"📍 Parking Area: {area_id}")
            
            if "slots" in area_data:
                slots = area_data["slots"]
                print(f"   Total slots: {len(slots)}")
                
                for i, slot in enumerate(slots):
                    if isinstance(slot, dict):
                        slot_id = slot.get("slotId", f"slot_{i}")
                        print(f"   🅿 Slot {slot_id}:")
                        
                        if "bookings" in slot:
                            bookings = slot["bookings"]
                            print(f"      Bookings: {len(bookings)}")
                            
                            for j, booking in enumerate(bookings):
                                if isinstance(booking, dict):
                                    vehicle = booking.get("vehicleNumber", "N/A")
                                    email = booking.get("email", "N/A")
                                    status = booking.get("status", "N/A")
                                    print(f"         Booking {j+1}: {vehicle} | {email} | {status}")
                        else:
                            print("      No bookings found")
            else:
                print("   No slots found")
        
        print("🔍 Debug complete\n")
                
    except Exception as e:
        print(f"Debug error: {e}")

# ---------------- Function to Get User Email by Vehicle Number ----------------
def get_user_email_by_vehicle(vehicle_number):
    try:
        # Get all parking areas
        parking_areas = db.collection("parkingAreas").stream()
        
        for area in parking_areas:
            area_data = area.to_dict()
            
            # Check if this area has slots
            if "slots" in area_data:
                slots = area_data["slots"]
                
                # Iterate through slots
                for slot in slots:
                    if isinstance(slot, dict) and "bookings" in slot:
                        bookings = slot["bookings"]
                        
                        # Check each booking in the slot
                        for booking in bookings:
                            if (isinstance(booking, dict) and 
                                booking.get("status") == "active" and 
                                booking.get("vehicleNumber", "").upper() == vehicle_number.upper()):
                                return booking.get("email")  # Changed from "userEmail" to "email"
                                
    except Exception as e:
        print("Error fetching user email:", e)
    return None

# ---------------- Function to Send Exit Confirmation Email ----------------
def send_exit_confirmation_email(vehicle_number, user_email):
    try:
        # Generate unique token for this request
        token = str(uuid.uuid4())
        
        # Store pending response
        pending_responses[token] = {
            'vehicle_number': vehicle_number,
            'user_email': user_email,
            'responded': False,
            'response': None,
            'timestamp': time.time()
        }
        
        # Create confirmation URLs for Yes/No responses
        yes_url = f"http://localhost:5000/exit-response/{token}/yes"
        no_url = f"http://localhost:5000/exit-response/{token}/no"
        
        # Create email content with HTML for better formatting and buttons
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_USER
        msg['To'] = user_email
        msg['Subject'] = f"🚗 Exit Confirmation Required - Vehicle {vehicle_number}"
        
        # Create plain text version
        text_body = f"""
        Hello,
        
        Your vehicle (License Plate: {vehicle_number}) has been detected at the exit gate.
        
        Please confirm if you want to exit the parking:
        
        To ALLOW EXIT, click: {yes_url}
        To DENY EXIT, click: {no_url}
        
        This request will expire in 5 minutes for security purposes.
        
        If you didn't request to exit, please click the DENY link or ignore this email.
        
        Thank you,
        Urban Parking System
        """
        
        # Create HTML version with styled buttons
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .vehicle-info {{ background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }}
                .vehicle-number {{ font-size: 24px; font-weight: bold; color: #1976d2; }}
                .button-container {{ text-align: center; margin: 30px 0; }}
                .btn {{ display: inline-block; padding: 15px 30px; margin: 10px; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 8px; color: white; }}
                .btn-yes {{ background-color: #4CAF50; }}
                .btn-no {{ background-color: #f44336; }}
                .btn:hover {{ opacity: 0.8; }}
                .warning {{ background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚗 Exit Confirmation Required</h1>
            </div>
            
            <div class="content">
                <p>Hello,</p>
                
                <p>Your vehicle has been detected at the exit gate and is requesting to leave the parking area.</p>
                
                <div class="vehicle-info">
                    <p><strong>Vehicle License Plate:</strong></p>
                    <div class="vehicle-number">{vehicle_number}</div>
                </div>
                
                <p><strong>Please confirm your action:</strong></p>
                
                <div class="button-container">
                    <a href="{yes_url}" class="btn btn-yes">✅ YES - Open Gate</a>
                    <a href="{no_url}" class="btn btn-no">❌ NO - Keep Closed</a>
                </div>
                
                <div class="warning">
                    <strong>⚠ Security Notice:</strong><br>
                    • This request will expire in 5 minutes<br>
                    • If you didn't request to exit, click "NO" immediately<br>
                    • Only click "YES" if you are actually exiting the parking
                </div>
                
                <div class="footer">
                    <p>Thank you for using Urban Parking System</p>
                    <p>For support, contact: urbparkticketing@gmail.com</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Attach both text and HTML versions
        msg.attach(MIMEText(text_body, 'plain'))
        msg.attach(MIMEText(html_body, 'html'))
        
        # Send email
        server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(EMAIL_USER, user_email, text)
        server.quit()
        
        print(f"✓ Exit confirmation email with buttons sent to {user_email}")
        print(f"YES button URL: {yes_url}")
        print(f"NO button URL: {no_url}")
        
        return token
        
    except Exception as e:
        print(f"Error sending email: {e}")
        return None

# ---------------- Function to Wait for Email Response ----------------
def wait_for_email_response(token, timeout=300):  # 5 minutes timeout
    start_time = time.time()
    print("📧 Waiting for user response to exit confirmation email...")
    
    while time.time() - start_time < timeout:
        if token in pending_responses:
            if pending_responses[token]['responded']:
                response = pending_responses[token]['response']
                # Clean up
                del pending_responses[token]
                print(f"✓ User responded: {response}")
                return response == 'yes'
        time.sleep(1)  # Check every second
    
    # Timeout - clean up and return False
    if token in pending_responses:
        del pending_responses[token]
    print("⚠ Email response timeout - gate remains closed")
    return False

# ---------------- Function to Get All Active Plates from Firestore ----------------
def get_all_active_plates():
    plates = set()
    try:
        # Get all parking areas
        parking_areas = db.collection("parkingAreas").stream()
        
        for area in parking_areas:
            area_data = area.to_dict()
            
            # Check if this area has slots
            if "slots" in area_data:
                slots = area_data["slots"]
                
                # Iterate through slots
                for slot in slots:
                    if isinstance(slot, dict) and "bookings" in slot:
                        bookings = slot["bookings"]
                        
                        # Check each booking in the slot
                        for booking in bookings:
                            if isinstance(booking, dict) and booking.get("status") == "active":
                                vehicle_num = booking.get("vehicleNumber")
                                if vehicle_num:
                                    plates.add(vehicle_num.upper())
                                    
    except Exception as e:
        print("Error fetching Firestore data:", e)
    return plates

# ---------------- ROI Coordinates (set your exit gate camera ROI here) ----------------
ROI_COORDS = (100, 200, 300, 100)  # Example values — adjust to your exit gate camera

# ---------------- Camera ----------------
cap = cv2.VideoCapture(0)  # Change index if needed
cap.set(10, 50)

# ---------------- Main Loop ----------------
print("Enhanced ThiefDetection System Started - Monitoring Exit Gate with Email Verification")
print("Flask server running on http://localhost:5000")

# Debug: Print current Firestore structure (remove in production)
debug_firestore_structure()

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Extract Region of Interest
    x, y, w, h = ROI_COORDS
    roi = frame[y:y+h, x:x+w]
    
    # Detect text in ROI
    results = reader.readtext(roi)
    
    for res in results:
        bbox, txt, conf = res
        if conf > 0.5:
            detected_plate = "".join(c for c in txt if c.isalnum()).upper()
            
            if len(detected_plate) >= 7:
                print(f"Detected plate: {detected_plate}")
                
                # Check if plate is in active bookings
                active_plates = get_all_active_plates()
                
                if detected_plate in active_plates:
                    print("✓ Authorized vehicle detected")
                    
                    # Get user email
                    user_email = get_user_email_by_vehicle(detected_plate)
                    
                    if user_email:
                        print(f"📧 Sending exit confirmation email to: {user_email}")
                        
                        # Send confirmation email
                        token = send_exit_confirmation_email(detected_plate, user_email)
                        
                        if token:
                            # Wait for user response
                            user_confirmed = wait_for_email_response(token)
                            
                            if user_confirmed:
                                print("✅ User confirmed exit → Opening exit gate")
                                if arduino:
                                    # Send exit gate open command
                                    arduino.write(b"OPEN_EXIT\n")
                                    print("Waiting for vehicle to pass through exit IR sensor...")
                                    
                                    # Wait for exit IR sensor to detect vehicle
                                    ir_detected = False
                                    start_time = time.time()
                                    
                                    while not ir_detected and (time.time() - start_time) < 30:  # 30 second timeout
                                        if arduino.in_waiting > 0:
                                            raw = arduino.readline().decode("utf-8", errors="ignore").strip()
                                            print(f"Arduino response: {raw}")
                                            
                                            if raw == "IR_EXIT_DETECTED":
                                                print("✓ Vehicle passed through → Closing exit gate")
                                                arduino.write(b"CLOSE_EXIT\n")
                                                ir_detected = True
                                                time.sleep(2)  # Wait for gate to close
                                                break
                                    
                                    if not ir_detected:
                                        print("⚠ Timeout waiting for exit IR sensor → Force closing gate")
                                        arduino.write(b"CLOSE_EXIT\n")
                                        time.sleep(2)
                            else:
                                print("❌ User declined exit or no response → Gate remains closed")
                        else:
                            print("❌ Failed to send email → Gate remains closed")
                    else:
                        print("❌ No email found for vehicle → Gate remains closed")
                        
                else:
                    print("⚠ UNAUTHORIZED VEHICLE DETECTED!")
                    print(f"Plate {detected_plate} not found in active bookings")
                    # Gate remains closed - no action taken
                    
                # Add delay to prevent multiple detections of the same vehicle
                time.sleep(5)
    
    # Draw ROI rectangle on frame for visualization
    cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
    cv2.putText(frame, "Exit Gate ROI", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    
    cv2.imshow("Enhanced ThiefDetection - Exit Gate Monitor", frame)
    
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# ---------------- Cleanup ----------------
cap.release()
if arduino:
    arduino.close()
cv2.destroyAllWindows()
print("Enhanced ThiefDetection System Stopped")