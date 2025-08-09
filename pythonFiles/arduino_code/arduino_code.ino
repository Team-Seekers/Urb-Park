#include <Servo.h>

#define IR_ENTRANCE 2
#define IR_EXIT 3

#define SERVO_ENTRANCE 9
#define SERVO_EXIT 10

Servo entranceGate;
Servo exitGate;

bool entranceOpen = false;
bool exitOpen = false;

void setup() {
  Serial.begin(9600);

  pinMode(IR_ENTRANCE, INPUT);
  pinMode(IR_EXIT, INPUT);

  entranceGate.attach(SERVO_ENTRANCE);
  exitGate.attach(SERVO_EXIT);

  // Initial state: both gates closed
  entranceGate.write(110);  // closed position
  exitGate.write(110);      // closed position
}

void loop() {
  // Handle serial commands from Python
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "OPEN") {
      entranceGate.write(20);  // open entrance gate
      entranceOpen = true;
    }
    else if (command == "CLOSE") {
      entranceGate.write(110);  // close entrance gate
      entranceOpen = false;
    }
  }

  // Automatically close entrance gate after car passes
  if (entranceOpen && digitalRead(IR_ENTRANCE) == LOW) {
    delay(500); // debounce
    if (digitalRead(IR_ENTRANCE) == LOW) {
      Serial.println("IR_DETECTED");
      entranceGate.write(110);  // close
      entranceOpen = false;
    }
  }

  // Automatically open exit gate when car approaches
  if (digitalRead(IR_EXIT) == LOW && !exitOpen) {
    delay(500); // debounce
    if (digitalRead(IR_EXIT) == LOW) {
      exitGate.write(20);  // open exit gate
      exitOpen = true;
      Serial.println("EXIT_OPENED");
      delay(2000);          // wait for car to pass
      exitGate.write(110);    // close exit gate
      exitOpen = false;
      Serial.println("EXIT_CLOSED");
    }
  }
}
