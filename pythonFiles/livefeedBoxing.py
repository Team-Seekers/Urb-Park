import cv2
from ultralytics import YOLO  # pip install ultralytics

# ----- Load YOLOv8 model -----
model = YOLO("yolov8n.pt")   
model.to('cuda')  # Use GPU if available

# ----- Globals -----
drawing = False
ix, iy = -1, -1
rois = []
current_frame = None

# ----- Mouse callback for ROI drawing -----
def draw_roi(event, x, y, flags, param):
    global ix, iy, drawing, rois, current_frame

    if event == cv2.EVENT_LBUTTONDOWN:
        drawing = True
        ix, iy = x, y

    elif event == cv2.EVENT_MOUSEMOVE:
        if drawing:
            temp = current_frame.copy()
            cv2.rectangle(temp, (ix, iy), (x, y), (0, 255, 0), 2)
            cv2.imshow("Draw ROIs - Press 's' to start", temp)

    elif event == cv2.EVENT_LBUTTONUP:
        drawing = False
        x1, y1 = min(ix, x), min(iy, y)
        x2, y2 = max(ix, x), max(iy, y)
        rois.append((x1, y1, x2 - x1, y2 - y1))
        print(f"ROI Added: {(x1, y1, x2 - x1, y2 - y1)}")

# ----- Setup -----
cap = cv2.VideoCapture(0)
cv2.namedWindow("Draw ROIs - Press 's' to start")
cv2.setMouseCallback("Draw ROIs - Press 's' to start", draw_roi)

print("Draw parking slots using mouse. Press 's' to start detection. Press 'q' to quit drawing mode.")

drawing_mode = True

# ----- Main Loop -----
while True:
    ret, frame = cap.read()
    if not ret:
        break
    current_frame = frame.copy()

    if drawing_mode:
        # Show all already drawn ROIs
        for (x, y, w, h) in rois:
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        cv2.imshow("Draw ROIs - Press 's' to start", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('s'):
            drawing_mode = False
            print("Detection started!")
        elif key == ord('q'):
            break


    else:
        # ---- YOLOv8 Detection ----
        results = model(frame)[0]  
        detections = results.boxes

        for (x, y, w, h) in rois:
            slot_rect = (x, y, x + w, y + h)
            occupied = False

            for box in detections:
                cls_id = int(box.cls[0])
                if model.names[cls_id] in ['car', 'motorcycle', 'bus', 'truck']:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    # overlap check
                    if not (x2 < slot_rect[0] or x1 > slot_rect[2] or y2 < slot_rect[1] or y1 > slot_rect[3]):
                        occupied = True
                        break

            color  = (0, 0, 255) if occupied else (0, 255, 0)
            status = "Occupied" if occupied else "Empty"
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            cv2.putText(frame, status, (x + 5, y + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        cv2.imshow("Smart Parking Feed", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()
