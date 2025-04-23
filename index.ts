/**
 * Author: Kyle
 * Description: This code scans the local WiFi network (wlan0) to detect other connected devices.
 *
 * NOTICE:
 * This code is shared for educational and non-commercial use.
 * If you modified or used parts of this code, please give proper credit.
*/

import ping from "ping";
import os from "os";

type PingRes = {
  ip: string,
  took: number
}

function getWlanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const iface in interfaces) {
    const detailsArray = interfaces[iface];
    if (detailsArray) {
      for (const details of detailsArray) {
        if (details.family === 'IPv4' && iface === 'wlan0') {
          return details.address;
        }
      }
    }
  }
  throw new Error("Could not find WLAN IPv4 address.");
}

async function scanIP(wlanipv4: string): Promise<Array<PingRes>>{
  console.log(`Starting network scan for devices on the subnet ${wlanipv4}...`);
  let promises: Array<Promise<any>> = [];
  let res: Array<PingRes> = [];
  const subnet: string = wlanipv4.slice(void 0, wlanipv4.lastIndexOf(".") + 1);
  for (let i = 1; i <= 254; i++){
    const start: number = performance.now();
    const ip: string = subnet + i;
    promises.push(ping.promise.probe(ip).then(({ alive }) => {
      const end: number = performance.now();
      if (alive) res.push({ ip, took: +(end / start).toFixed(2) });
    }))
  }
  await Promise.all(promises);
  return res.filter(({ ip }) => { return ip !== wlanipv4 });
}

async function main(): Promise<void>{
  try{
    const start: number = performance.now();
    const ipv4 = getWlanIp();
    const devices = await scanIP(ipv4);
    const end: number = performance.now();
    if (devices.length > 0) {
      console.log(`${devices.length} devices found on the network. took ${(end / start).toFixed(2)} ms`);
      console.log("List of connected devices:");
      devices.forEach((device) => console.log(`- ${device.ip} took ${device.took} ms`));
    } else {
      console.log("No other devices found on the network.");
    }   
  } catch(e){
    console.log(`Error: ${e.message}`);
    process.exit(1);
  }
}

main()
