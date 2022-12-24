export class BbBluetooth {
  /** @type {number} */
  static data = -1;

  /** @type {boolean} */
  static hasTriedToConnect = false;

  /** @type {boolean} */
  static isSupported = "bluetooth" in navigator;

  /** @type {boolean} */
  static isConnected = false;

  /** @type {number} */
  static userWeight = -1;

  static setupForMousePosData() {
    BbBluetooth.isConnected = true;
    document.addEventListener("mousemove", ev => {
      BbBluetooth.data = ev.clientY;
    });
    // send a mouse move event
    const ev = new MouseEvent("mousemove", {
      clientX: 0,
      clientY: this.userWeight / 2 || 350
    });
    document.dispatchEvent(ev);
  }

  static getUserWeight() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = "1000";
      input.placeholder = "Weight in kg";
      input.style.position = "absolute";
      input.style.top = "50%";
      input.style.left = "50%";
      input.style.transform = "translate(-50%, -50%)";
      input.style.width = "200px";
      input.style.fontSize = "2rem";
      input.style.padding = "1rem";
      input.style.border = "none";
      input.style.borderRadius = "0.5rem";
      input.style.outline = "none";
      input.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      input.style.color = "white";
      input.style.zIndex = "11";

      // function to shake input field if no value is entered
      const shake = () => {
        input.style.transform = "translate(-50%, -50%) rotate(-5deg)";
        setTimeout(() => {
          input.style.transform = "translate(-50%, -50%) rotate(5deg)";
          setTimeout(() => {
            input.style.transform = "translate(-50%, -50%) rotate(-5deg)";
            setTimeout(() => {
              input.style.transform = "translate(-50%, -50%) rotate(5deg)";
              setTimeout(() => {
                input.style.transform = "translate(-50%, -50%)";
              }, 100);
            }, 100);
          }, 100);
        }, 100);
      };

      // add backdrop
      const backdrop = document.createElement("div");
      backdrop.style.position = "fixed";
      backdrop.style.top = "0";
      backdrop.style.left = "0";
      backdrop.style.width = "100vw";
      backdrop.style.height = "100vh";
      backdrop.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      backdrop.style.zIndex = "10";
      backdrop.appendChild(input);

      function handleKeyDown(ev) {
        ev.stopPropagation();
        if (ev.key === "Enter") {
          const val = parseFloat(input.value);
          if (val && val > 0 && val < 1000) {
            BbBluetooth.userWeight = val;
            backdrop.remove();
            resolve();
          } else {
            shake();
          }
        }
      }

      input.addEventListener("keydown", handleKeyDown);
      backdrop.addEventListener("keydown", handleKeyDown)

      input.addEventListener("click", (ev) => { ev.stopPropagation(); })

      backdrop.addEventListener("click", (ev) => {
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        const val = parseFloat(input.value);
        if (val && val > 0 && val < 1000) {
          BbBluetooth.userWeight = val;
          backdrop.remove();
          resolve();
        } else {
          shake();
        }
      })



      document.body.appendChild(backdrop);
      input.focus();
    });
  }

  static async connect() {
    if (!BbBluetooth.isSupported) {
      throw new Error("Bluetooth not supported");
    }

    BbBluetooth.hasTriedToConnect = true;

    /** @type {Promise<void>} */
    return navigator.bluetooth.requestDevice({
      filters: [{
        name: "ENTRALPI"
      }
      ],
      optionalServices: [
        // "f000ffc0-0451-4000-b000-000000000000", // blocklisted
        // "0000180a-0000-1000-8000-00805f9b34fb",
        // "0000180f-0000-1000-8000-00805f9b34fb",
        // "00001801-0000-1000-8000-00805f9b34fb",
        "0000fff0-0000-1000-8000-00805f9b34fb",
        // "0000181d-0000-1000-8000-00805f9b34fb",
        // "00001800-0000-1000-8000-00805f9b34fb"
      ],
      // acceptAllDevices: true
    })
      .then((device) => {
        if (!device.gatt) {
          throw new Error("No gatt server");
        }
        return device.gatt.connect();
      })
      .then(server => {
        return server.getPrimaryService("0000fff0-0000-1000-8000-00805f9b34fb");
      })
      .then(service => {
        return service.getCharacteristic("0000fff4-0000-1000-8000-00805f9b34fb");
      })
      .then(characteristic => {
        if (characteristic.properties.notify) {
          this.isConnected = true;
          characteristic.addEventListener('characteristicvaluechanged', ev => {
            // cast to any to disable warning about value not being a property of event handler.
            /** @type {BluetoothRemoteGATTCharacteristic} */
            const target = ev.target;
            if (target?.value?.getInt16(0))
              BbBluetooth.data = target.value.getInt16(0) / 100;
            else
              BbBluetooth.data = 0;
          })
          characteristic.startNotifications();
        } else {
          throw new Error("Cannot be notified by characteristic?... Weird");
        }
      });
  }
}
