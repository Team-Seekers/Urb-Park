from ultralytics import YOLO

model=YOLO('yolov8n')

result=model.predict("WIN_20250605_11_24_32_Pro.jpg")

for box in result[0].boxes:
    print(box.cls)
    print(box.xyxy)