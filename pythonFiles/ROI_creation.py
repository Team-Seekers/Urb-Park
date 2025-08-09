import cv2
import json

drawing = False
ix, iy = -1, -1
rois = []
current_frame = None

def draw_roi(event, x, y, flags, param):
    global ix, iy, drawing, rois, current_frame
    if event == cv2.EVENT_LBUTTONDOWN:
        drawing = True
        ix, iy = x, y
    elif event == cv2.EVENT_MOUSEMOVE and drawing:
        temp = current_frame.copy()
        cv2.rectangle(temp, (ix, iy), (x, y), (0, 255, 0), 2)
        cv2.imshow("Draw ROIs - Press 's' to save", temp)
    elif event == cv2.EVENT_LBUTTONUP:
        drawing = False
        x1, y1 = min(ix, x), min(iy, y)
        w, h = abs(x - ix), abs(y - iy)
        rois.append({"slot": len(rois) + 1, "coords": (x1, y1, w, h)})
        print(f"ROI Added: Slot {len(rois)} -> ({x1}, {y1}, {w}, {h})")

cap = cv2.VideoCapture(0)  # Change to your camera stream if needed

# ✅ Create window first, then set mouse callback
cv2.namedWindow("Draw ROIs - Press 's' to save")
cv2.setMouseCallback("Draw ROIs - Press 's' to save", draw_roi)

print("Draw your parking slots. Press 's' to finish and save coordinates to rois.json.")

while True:
    ret, frame = cap.read()
    if not ret:
        break
    current_frame = frame.copy()

    # Draw already selected ROIs
    for roi in rois:
        x, y, w, h = roi["coords"]
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(frame, f"Slot {roi['slot']}", (x, y-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    cv2.imshow("Draw ROIs - Press 's' to save", frame)
    key = cv2.waitKey(1) & 0xFF

    if key == ord('s'):
        with open("D:/urb-park-frontend/Urb-Park/pythonFiles/rois.json", "w") as f:
            json.dump(rois, f, indent=4)
        print("\nSaved ROIs to rois.json")
        break
    elif key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
